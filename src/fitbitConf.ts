import type { AuthConfiguration } from 'react-native-app-auth';
import { FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, FITBIT_REDIRECT_URL } from '@env';

export const fitbitConf: AuthConfiguration = {
  issuer: 'https://api.fitbit.com',
  clientId: FITBIT_CLIENT_ID,
  clientSecret: FITBIT_CLIENT_SECRET,
  redirectUrl: FITBIT_REDIRECT_URL,
  scopes: ['activity', 'heartrate', 'sleep', 'weight', 'profile'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://www.fitbit.com/oauth2/authorize',
    tokenEndpoint: 'https://api.fitbit.com/oauth2/token',
  },
  usePKCE: true,
  skipCodeExchange: true,
};
