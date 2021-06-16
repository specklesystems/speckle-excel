import Vue from 'vue'
import VueApollo from 'vue-apollo'
import { createApolloClient } from 'vue-cli-plugin-apollo/graphql-client'

// Install the vue plugin
Vue.use(VueApollo)

// Name of the localStorage item
export const APP_NAME = process.env.VUE_APP_SPECKLE_NAME
export const AUTH_TOKEN = `${APP_NAME}.AuthToken`

export function createClient() {
  let serverUrl = localStorage.getItem('serverUrl')
  const { apolloClient, wsClient } = createApolloClient({
    httpEndpoint: serverUrl + '/graphql',
    wsEndpoint: (serverUrl + '/graphql').replace('http', 'ws'),
    tokenName: AUTH_TOKEN,
    persisting: false,
    websocketsOnly: false,
    ssr: false
  })
  apolloClient.wsClient = wsClient

  return apolloClient
}

export const apolloProvider = new VueApollo({
  //defaultClient: createClient(),
  defaultOptions: {
    $query: {
      // fetchPolicy: 'cache-and-network',
    }
  },
  errorHandler(error) {
    // eslint-disable-next-line no-console
    console.log(
      '%cError',
      'background: red; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;',
      error.message
    )
  }
})

// Call this in the Vue app file
// export function createProvider(options = {}) {
//   // Create vue apollo provider
//   const apolloProvider = new VueApollo({
//     defaultClient: createClient(options),
//     defaultOptions: {
//       $query: {
//         // fetchPolicy: 'cache-and-network',
//       }
//     },
//     errorHandler(error) {
//       // eslint-disable-next-line no-console
//       console.log(
//         '%cError',
//         'background: red; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;',
//         error.message
//       )
//     }
//   })

//   return apolloProvider
// }
