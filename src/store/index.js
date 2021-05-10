import Vue from 'vue'
import Vuex from 'vuex'
import ObjectLoader from '@speckle/objectloader'

Vue.use(Vuex)

const APP_NAME = process.env.VUE_APP_SPECKLE_NAME
const SERVER_URL = process.env.VUE_APP_SERVER_URL
const TOKEN = `${APP_NAME}.AuthToken`
const REFRESH_TOKEN = `${APP_NAME}.RefreshToken`
const CHALLENGE = `${APP_NAME}.Challenge`

export default new Vuex.Store({
  state: {
    user: null,
    serverInfo: null
  },
  getters: {
    isAuthenticated: (state) => state.user != null
  },
  mutations: {
    SET_USER(state, value) {
      state.user = value
    },
    SET_SERVER(state, info) {
      state.serverInfo = info
    }
  },
  actions: {
    async login({ dispatch, state }, query) {
      //we have been redirected after the auth flow
      if (query.access_code) {
        await dispatch('exchangeAccessCode', query.access_code)
        dispatch('getUser')
        return
      }
      //try using existing token
      if (localStorage.getItem(TOKEN) != null) {
        await dispatch('getUser')
        if (state.user != null) return
      }
      console.log('challenge')
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
    logout(context) {
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
    async getUser(context) {
      try {
        let query = `query {
      user {
        name
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
