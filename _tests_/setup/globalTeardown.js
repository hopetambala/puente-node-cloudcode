module.exports = async function globalTeardown() {
  /* eslint-disable no-underscore-dangle */
  if (global.__HTTP_SERVER__) {
    global.__HTTP_SERVER__.closeAllConnections();
    await new Promise((resolve) => global.__HTTP_SERVER__.close(resolve));
  }
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
  /* eslint-enable no-underscore-dangle */
};
