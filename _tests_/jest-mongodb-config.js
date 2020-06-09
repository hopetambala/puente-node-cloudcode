// Added for jest connection to mongodb following :
// https://github.com/shelfio/jest-mongodb

module.exports = {
    mongodbMemoryServerOptions: {
        instance: {
            dbName: 'jest'
        },
        binary: {
            version: '4.0.3',
            skipMD5: true
        },
        autoStart: false
    }
};