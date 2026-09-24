const path = require('path');

module.exports = {
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
};