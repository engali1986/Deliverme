module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...(config.android || {}),
      permissions: [
        "INTERNET",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.API_KEY || ""
        }
      }
    }
  };
};