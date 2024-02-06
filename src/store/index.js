/* eslint-disable camelcase */
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import ObjectLoader from '@speckle/objectloader'
import streamsModule from './streams'
import userModule from './user'
import router from '../router'
import { BaseObjectSerializer } from '../plugins/BaseObjectSerializer'
import { ServerTransport } from '../plugins/ServerTransport'

const xml2js = require('xml2js')

Vue.use(Vuex)

const APP_NAME = process.env.VUE_APP_SPECKLE_NAME
const TOKEN = `${APP_NAME}.AuthToken`
const REFRESH_TOKEN = `${APP_NAME}.RefreshToken`
const CHALLENGE = `${APP_NAME}.Challenge`
const XML_NS = 'https://speckle.systems'

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  key: `${APP_NAME}.vuex`,
  modules: ['user']
})

const vuexExcel = new VuexPersistence({
  restoreState: async () => {
    let state = null
    await window.Office.onReady()
    if (!window.Excel) {
      console.log('No excel detected, skipping store')
      return null
    }
    try {
      await window.Excel.run(async (context) => {
        let parts = context.workbook.customXmlParts.getByNamespace(XML_NS)
        let partsCount = parts.getCount()
        await context.sync()
        if (partsCount.value !== 1) return null

        let xml = parts.getOnlyItem()
        let xmlBlob = xml.getXml()
        await context.sync()
        var parser = new xml2js.Parser({ explicitArray: false })
        parser.parseString(xmlBlob.value, (err, result) => {
          state = JSON.parse(result.SpeckleData.state)
        })
      })
    } catch (e) {
      console.log(e)
    }

    if (state) return state
    return null
  },
  saveState: async (key, state) => {
    await window.Excel.run(async (context) => {
      let xmlParts = context.workbook.customXmlParts
      let parts = context.workbook.customXmlParts.getByNamespace(XML_NS)
      parts.load('items')
      await context.sync()

      for (let part of parts.items) {
        try {
          part.delete()
          await context.sync()
        } catch {
          //ignore
        }
      }

      let builder = new xml2js.Builder()

      let obj = {
        SpeckleData: {
          $: {
            xmlns: XML_NS
          },
          //parsing to string as could not convert JSON to XML directly, arrays kept breaking
          state: JSON.stringify(state)
        }
      }

      let xml = builder.buildObject(obj)
      xmlParts.add(xml)

      await context.sync()
    })
  },
  modules: ['streams'],
  filter: (
    mutation //somehow, the saveState was also triggered by dispatching to the snackbar, so I have to manually select the mutations
  ) =>
    mutation.type == 'ADD_STREAM' ||
    mutation.type == 'REMOVE_STREAM' ||
    mutation.type == 'UPDATE_STREAM' ||
    mutation.type == 'SET_RECEIVER_SELECTION',
  asyncStorage: true
})

export default new Vuex.Store({
  state: {
    snackbar: {},
    isFE2: false
  },
  plugins: [vuexLocal.plugin, vuexExcel.plugin],
  getters: {
    serverUrl: () => localStorage.getItem('serverUrl')
  },
  mutations: {
    SET_SNACKBAR(state, value) {
      state.snackbar = value
    },
    UPDATE_IS_FE2(state, value) {
      localStorage.setItem('frontend2', value)
      state.isFE2 = value
    }
  },
  actions: {
    updateIsFE2({ commit }, value) {
      commit('UPDATE_IS_FE2', value)
    },
    async redirect(_, data) {
      //go to login and refresh token
      window.location = `${data.serverUrl}/authn/verify/${process.env.VUE_APP_SPECKLE_ID}/${data.challenge}`
    },
    async login({ dispatch }, serverUrl) {
      // Generate random challenge
      var challenge =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      // Save challenge in localStorage
      localStorage.setItem(CHALLENGE, challenge)
      localStorage.setItem('serverUrl', serverUrl)

      // Send user to auth page
      await window.Office.context.ui.displayDialogAsync(
        `${window.location.origin}/redirect?challenge=${challenge}&serverUrl=${encodeURIComponent(
          serverUrl
        )}`,
        {
          height: 80,
          width: 30,
          promptBeforeOpen: false
        },
        (asyncResult) => {
          let dialog = asyncResult.value
          dialog.addEventHandler(window.Office.EventType.DialogMessageReceived, async (args) => {
            dialog.close()
            await dispatch('exchangeAccessCode', args.message)
            await dispatch('hasValidToken')
            await dispatch('getServerInfo')
            router.push('/')
          })
        }
      )
    },

    async hasValidToken({ state, dispatch }) {
      if (localStorage.getItem(TOKEN) === null) return false
      await dispatch('getUser')
      if (state.user === null) return false
      return true
    },
    logout(context) {
      console.log('LOG OUT')
      // Wipe the state
      context.commit('SET_USER', null)
      context.commit('SET_SERVER', null)
      // Wipe the tokens
      localStorage.removeItem(TOKEN)
      localStorage.removeItem('serverUrl')
      localStorage.removeItem(REFRESH_TOKEN)
      localStorage.removeItem('uuid')
      localStorage.removeItem('frontend2')

      window.location = window.location.origin
    },
    async exchangeAccessCode(_, accessCode) {
      try {
        let serverUrl = localStorage.getItem('serverUrl')
        let response = await fetch(`${serverUrl}/auth/token/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            accessCode: accessCode,
            appId: process.env.VUE_APP_SPECKLE_ID,
            appSecret: process.env.VUE_APP_SPECKLE_SECRET,
            challenge: localStorage.getItem(CHALLENGE)
          })
        })
        let data = await response.json()

        if (data.token) {
          localStorage.removeItem(CHALLENGE)
          localStorage.setItem(TOKEN, data.token)
          localStorage.setItem(REFRESH_TOKEN, data.refreshToken)

          return data
        }
      } catch (error) {
        console.log(error)
      }
    },
    async createCommit(context, { streamId, branchName, message, object }) {
      let serverUrl = localStorage.getItem('serverUrl')
      let token = localStorage.getItem(TOKEN)

      const serverTransport = new ServerTransport(serverUrl, token, streamId)
      const serializer = new BaseObjectSerializer([serverTransport])
      const serialized = await serializer.SerializeBase(object)

      await serverTransport.CreateCommit(branchName, serialized.id, message)
    },
    async receiveCommit(context, { sourceApplication, streamId, commitId, message }) {
      let query = `mutation objectReceive ($myInput:CommitReceivedInput!) {commitReceive(input:$myInput)}`

      let serverUrl = localStorage.getItem('serverUrl')
      let token = localStorage.getItem(TOKEN)

      await fetch(`${serverUrl}/graphql`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          variables: {
            myInput: {
              streamId: streamId,
              commitId: commitId,
              message: message ? message : 'Data received in Excel',
              sourceApplication: sourceApplication
            }
          }
        })
      })
    },
    async getServerInfo({ dispatch }) {
      let serverUrl = localStorage.getItem('serverUrl')

      // Now, to check for a specific header
      const isFrontend2Server = (headers) => {
        const HEADER = 'x-speckle-frontend-2'
        const headerValue = headers.get(HEADER)

        if (headerValue === null) {
          return false
        }

        const value = headerValue.toLowerCase() === 'true'
        if (headerValue !== 'true' && headerValue !== 'false') {
          throw new Error(
            `Headers contained ${HEADER} header, but value ${headerValue} could not be parsed to a bool`
          )
        }

        return value
      }

      // Use the function to check the header
      try {
        let response = await fetch(serverUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        let isFE2Server = isFrontend2Server(response.headers)
        await dispatch('updateIsFE2', isFE2Server)
        console.log('Is Frontend2 Server:', isFE2Server)
      } catch (error) {
        console.warn(error.message)
        // TODO: fallback is FE1, this should be changed later
        await dispatch('updateIsFE2', false)
      }
    },
    async getUser(context) {
      try {
        let query = `query {
      user {
        id  
        name
        email
        avatar
      },
      serverInfo {
        name
        company
      }
    }`
        console.log('getting user')
        let token = localStorage.getItem(TOKEN)
        let serverUrl = localStorage.getItem('serverUrl')

        let response = await fetch(`${serverUrl}/graphql`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: query
          })
        })
        let data = (await response.json()).data
        if (data.user) {
          localStorage.setItem('uuid', data.user.id)
          context.commit('SET_USER', data.user)
          context.commit('SET_SERVER', data.serverInfo)
        } else {
          context.dispatch('logout')
          throw new Error('Failed to set user')
        }
      } catch (error) {
        console.log(error)
        context.dispatch('logout')
      }
    },
    async getObject(context, { streamId, objectId, options }) {
      return new ObjectLoader({
        serverUrl: localStorage.getItem('serverUrl'),
        token: localStorage.getItem(TOKEN),
        streamId: streamId,
        objectId: objectId,
        options: options
      })
    },
    showSnackbar({ commit }, value) {
      commit('SET_SNACKBAR', value)
    }
  },
  modules: {
    streams: streamsModule,
    user: userModule
  }
})
