import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { createProvider } from './vue-apollo'
import vuetify from './plugins/vuetify'

Vue.config.productionTip = false

import VueTimeago from 'vue-timeago'
Vue.use(VueTimeago, { locale: 'en' })

import VTooltip from 'v-tooltip'
Vue.use(VTooltip, { defaultDelay: 300 })

window.Office.onReady(() => {
  new Vue({
    router,
    apolloProvider: createProvider(),
    vuetify,
    store,
    render: (h) => h(App)
  }).$mount('#app')
})

//   new Vue({
//     router,
//     apolloProvider: createProvider(),
//     vuetify,
//     store,
//     render: (h) => h(App)
//   }).$mount('#app')
// }
