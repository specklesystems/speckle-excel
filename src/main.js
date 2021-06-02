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

import VueMatomo from 'vue-matomo'

Vue.use(VueMatomo, {
  host: 'https://speckle.matomo.cloud',
  siteId: 2,
  userId: localStorage.getItem('suuid')
})

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
