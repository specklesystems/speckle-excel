export default {
  state: {
    user: null,
    serverInfo: null
  },
  mutations: {
    SET_USER(state, value) {
      state.user = value
    },
    SET_SERVER(state, value) {
      state.serverInfo = value
    }
  },
  getters: {
    isAuthenticated: (state) => state.user != null
  },
  actions: {}
}
