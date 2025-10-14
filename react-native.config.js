module.exports = {
  dependencies: {
    'react-native-ui-lib': {
      platforms: { android: null },
    },
    '@notifee/react-native': {
      platforms: { android: null },
    },
  },

  reactNative: {
    dangerouslyDisableAutolinking: [
      'react-native-ui-lib',
      '@notifee/react-native',
    ],
  },
};
