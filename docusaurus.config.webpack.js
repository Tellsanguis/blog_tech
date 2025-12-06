module.exports = function (context, options) {
  return {
    name: 'custom-webpack-config',
    configureWebpack(config, isServer) {
      if (!isServer) {
        return {
          resolve: {
            fallback: {
              http: false,
              https: false,
              url: false,
              buffer: false,
              timers: false,
              stream: false,
            },
          },
        };
      }
      return {};
    },
  };
};
