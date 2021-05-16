/* eslint-disable camelcase */
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import ObjectLoader from '@speckle/objectloader'

Vue.use(Vuex)

const APP_NAME = process.env.VUE_APP_SPECKLE_NAME
const SERVER_URL = process.env.VUE_APP_SERVER_URL
const TOKEN = `${APP_NAME}.AuthToken`
const REFRESH_TOKEN = `${APP_NAME}.RefreshToken`
const CHALLENGE = `${APP_NAME}.Challenge`

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  key: `${APP_NAME}.vuex`
})

export default new Vuex.Store({
  state: {
    user: null,
    serverInfo: null,
    streams: []
  },
  plugins: [vuexLocal.plugin],
  getters: {
    isAuthenticated: (state) => state.user != null,
    serverUrl: () => SERVER_URL
  },
  mutations: {
    SET_USER(state, value) {
      state.user = value
    },
    SET_SERVER(state, value) {
      state.serverInfo = value
    },
    ADD_STREAM(state, value) {
      state.streams.unshift(value)
    },
    REMOVE_STREAM(state, value) {
      const index = state.streams.indexOf(value)
      if (index > -1) {
        state.streams.splice(index, 1)
      }
    }
  },
  actions: {
    addStream({ commit }, streamId) {
      commit('ADD_STREAM', streamId)
    },
    removeStream({ commit }, streamId) {
      commit('REMOVE_STREAM', streamId)
    },
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
    async postObject() {
      // let response = await fetch(`${SERVER_URL}/graphql`, {
      //   method: 'POST',
      //   headers: {
      //     Authorization: 'Bearer ' + token,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     query: query
      //   })
      // })
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
  modules: {}
})
