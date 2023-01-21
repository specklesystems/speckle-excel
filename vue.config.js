var devCerts = require('office-addin-dev-certs')
var options = devCerts.getHttpsServerOptions()

module.exports = {
  devServer: {
    port: 3000,
    host: 'localhost',
    https: options,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  transpileDependencies: ['vuetify', '@speckle/objectloader', 'flatted', 'vuex-persist'],
  configureWebpack: (config) => {
    config.devtool = 'source-map'
  }
}
