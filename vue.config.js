var devCerts = require('office-addin-dev-certs')
var options = devCerts.getHttpsServerOptions()
// const CleanWebpackPlugin = require('clean-webpack-plugin')
// const CopyWebpackPlugin = require('copy-webpack-plugin')
const CustomFunctionsMetadataPlugin = require('custom-functions-metadata-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  configureWebpack: {
    entry: {
      functions: './src/functions/functions.js',
      polyfill: '@babel/polyfill'
    },
    plugins: [
      // new CleanWebpackPlugin({
      //   cleanOnceBeforeBuildPatterns: dev ? [] : ['**/*']
      // }),
      new CustomFunctionsMetadataPlugin({
        output: 'functions.json',
        input: './src/functions/functions.js'
      }),
      new HtmlWebpackPlugin({
        filename: 'functions.html',
        template: './src/functions/functions.html',
        chunks: ['polyfill', 'functions']
      })
      // new HtmlWebpackPlugin({
      //   filename: 'taskpane.html',
      //   template: './src/taskpane/taskpane.html',
      //   chunks: ['polyfill', 'taskpane']
      // }),
      // new CopyWebpackPlugin([
      //   {
      //     to: 'taskpane.css',
      //     from: './src/taskpane/taskpane.css'
      //   }
      // ]),
      // new HtmlWebpackPlugin({
      //   filename: 'commands.html',
      //   template: './src/commands/commands.html',
      //   chunks: ['polyfill', 'commands']
      // })
    ]
  },
  devServer: {
    port: 3000,
    host: 'localhost',
    https: options,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  transpileDependencies: ['vuetify', '@speckle/objectloader', 'flatted', 'vuex-persist']
}
