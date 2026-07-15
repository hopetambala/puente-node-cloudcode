// Added for jest connection to mongodb following :
// https://github.com/shelfio/jest-mongodb

module.exports = {
  mongodbMemoryServerOptions: {
    instance: {
      dbName: 'jest',
    },
    binary: {
      // 6.0.x has OpenSSL 3 builds — 4.x needed libcrypto 1.1, which
      // GitHub's ubuntu-latest runners no longer ship
      version: '6.0.14',
      skipMD5: true,
    },
    autoStart: false,
  },
};
