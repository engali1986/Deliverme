module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...(config.android || {}),
      permissions: [
        "INTERNET",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.API_KEY || ""
        }
      }
    }
  };
};