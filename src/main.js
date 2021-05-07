import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { createProvider } from './vue-apollo'
import store from './store'
import router from './router'

Vue.config.productionTip = false

window.Office.initialize = () => {
  new Vue({
    vuetify,
    store,
    router,
    apolloProvider: createProvider(),
    render: (h) => h(App)
  }).$mount('#app')
}

//  new Vue({
//     vuetify,
//     store,
//     router,
//     apolloProvider: createProvider(),
//     render: (h) => h(App)
//   }).$mount('#app')
