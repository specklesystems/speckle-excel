var devCerts = require('office-addin-dev-certs')
var options = devCerts.getHttpsServerOptions()

module.exports = {
  devServer: {
    port: 3000,
    https: options,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },

  transpileDependencies: ['vuetify']
}
