/* eslint-disable camelcase */
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import ObjectLoader from '@speckle/objectloader'
import streamsModule from './streams'
import userModule from './user'

Vue.use(Vuex)

const APP_NAME = process.env.VUE_APP_SPECKLE_NAME
const SERVER_URL = process.env.VUE_APP_SERVER_URL
const TOKEN = `${APP_NAME}.AuthToken`
const REFRESH_TOKEN = `${APP_NAME}.RefreshToken`
const CHALLENGE = `${APP_NAME}.Challenge`

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  key: `${APP_NAME}.vuex`,
  modules: ['user']
})

export default new Vuex.Store({
  state: {},
  plugins: [vuexLocal.plugin],
  getters: {
    serverUrl: () => SERVER_URL
  },
  mutations: {},
  actions: {
    async login() {
      //go to login and refresh token
      // Generate random challenge
      var challenge =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      // Save challenge in localStorage
      localStorage.setItem(CHALLENGE, challenge)
      // Send user to auth page

      window.location = `${SERVER_URL}/authn/verify/${process.env.VUE_APP_SPECKLE_ID}/${challenge}`
      //console.log(`${SERVER_URL}/authn/verify/${process.env.VUE_APP_SPECKLE_ID}/${challenge}`)
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
      localStorage.removeItem(REFRESH_TOKEN)
    },
    async exchangeAccessCode(_, accessCode) {
      try {
        let response = await fetch(`${SERVER_URL}/auth/token/`, {
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
      let query = `mutation objectCreate ($object: ObjectCreateInput!) {objectCreate(objectInput: $object)}`
      let token = localStorage.getItem(TOKEN)

      let response = await fetch(`${SERVER_URL}/graphql`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          variables: {
            object: {
              streamId: streamId,
              objects: [{ data: object }]
            }
          }
        })
      })
      let data = await response.json()
      console.log(data)
      let objectId = data.data.objectCreate[0]

      query = `mutation commitCreate($myCommit: CommitCreateInput!){ commitCreate(commit: $myCommit)}`

      response = await fetch(`${SERVER_URL}/graphql`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          variables: {
            myCommit: {
              streamId: streamId,
              branchName: branchName,
              objectId: objectId,
              message: message ? message : 'Data from Excel'
            }
          }
        })
      })
    },
    async getUser(context) {
      try {
        let query = `query {
      user {
        name
        avatar
      },
      serverInfo {
        name
        company
      }
    }`
        let token = localStorage.getItem(TOKEN)

        let response = await fetch(`${SERVER_URL}/graphql`, {
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
        context.commit('SET_USER', data.user)
        context.commit('SET_SERVER', data.serverInfo)
      } catch (error) {
        console.log(error)
        context.dispatch('logout')
      }
    },
    async getObject(context, { streamId, objectId }) {
      return new ObjectLoader({
        serverUrl: process.env.VUE_APP_SERVER_URL,
        token: localStorage.getItem(TOKEN),
        streamId: streamId,
        objectId: objectId
      })
    }
  },
  modules: {
    streams: streamsModule,
    user: userModule
  }
})
