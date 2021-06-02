export default {
  state: {
    streams: []
  },
  mutations: {
    ADD_STREAM(state, value) {
      state.streams.unshift(value)
    },
    REMOVE_STREAM(state, value) {
      const index = state.streams.findIndex((x) => x.id === value)
      if (index > -1) {
        state.streams.splice(index, 1)
      }
    },
    UPDATE_STREAM(state, value) {
      const index = state.streams.findIndex((x) => x.id === value.id)
      if (index > -1) {
        state.streams.splice(index, 1, value)
      }
    }
  },
  getters: {},
  actions: {
    addStream({ commit }, stream) {
      commit('ADD_STREAM', stream)
    },
    updateStream({ commit }, stream) {
      commit('UPDATE_STREAM', stream)
    },
    removeStream({ commit }, streamId) {
      commit('REMOVE_STREAM', streamId)
    }
  }
}
