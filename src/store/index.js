import Vue from 'vue'
import Vuex from 'vuex'

import { exchangeAccessCode, getUserData, goToSpeckleAuthPage, speckleLogOut } from '@/auth'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user: null,
    serverInfo: null
  },
  getters: {
    isAuthenticated: (state) => state.user != null
  },
  mutations: {
    setUser(state, user) {
      state.user = user
    },
    setServerInfo(state, info) {
      state.serverInfo = info
    }
  },
  actions: {
    logout(context) {
      // Wipe the state
      context.commit('setUser', null)
      context.commit('setServerInfo', null)
      // Wipe the tokens
      speckleLogOut()
    },
    exchangeAccessCode(context, accessCode) {
      return exchangeAccessCode(accessCode)
    },
    getUser(context) {
      return getUserData()
        .then((json) => {
          var data = json.data
          context.commit('setUser', data.user)
          context.commit('setServerInfo', data.serverInfo)
        })
        .catch((err) => {
          console.error(err)
        })
    },
    redirectToAuth() {
      goToSpeckleAuthPage()
    }
  },
  modules: {}
})
