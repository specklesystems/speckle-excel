export default {
  state: {
    streams: []
  },
  mutations: {
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
  getters: {},
  actions: {
    addStream({ commit }, streamId) {
      commit('ADD_STREAM', streamId)
    },
    removeStream({ commit }, streamId) {
      commit('REMOVE_STREAM', streamId)
    }
  }
}
