import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { apolloProvider } from './vue-apollo'
import vuetify from './plugins/vuetify'
import '@mdi/font/css/materialdesignicons.css'

Vue.config.productionTip = false

import VueTimeago from 'vue-timeago'
Vue.use(VueTimeago, { locale: 'en' })

import VTooltip from 'v-tooltip'
Vue.use(VTooltip, { defaultDelay: 300 })

import VueMixpanel from 'vue-mixpanel'
Vue.use(VueMixpanel, {
  token: 'acd87c5a50b56df91a795e999812a3a4',
  config: {
    // eslint-disable-next-line camelcase
    api_host: 'https://analytics.speckle.systems'
  }
})

window.Office.onReady(() => {
  new Vue({
    router,
    apolloProvider: apolloProvider,
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
