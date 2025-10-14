import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const functions = getFunctions(undefined, 'europe-west1');

export function exchangeTokenPKCE(
  code: string,
  codeVerifier: string
) {
  return httpsCallable<
    { code: string; codeVerifier: string },
    {
      success: boolean;
      fitbitUid: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }
  >(functions, 'exchangeFitbitToken')({
    code,
    codeVerifier,
  });
}
export async function getValidFitbitToken(): Promise<string> {
  const accessToken = await AsyncStorage.getItem('access_token');
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  const expiryStr = await AsyncStorage.getItem('token_expiry');

  if (!accessToken || !refreshToken || !expiryStr) {
    throw new Error('nu exista niciun token fitbit. autentificare obligatorie');
  }
  const expiry = parseInt(expiryStr, 10);
  const now = Date.now();
  if (now < expiry - 60000) {
    return accessToken;
  }
  console.log('token exp, se incearca refresh');
  try {
    const result = await httpsCallable<
      { refreshToken: string },
      { accessToken: string; refreshToken: string; expiresIn: number }
    >(functions, 'refreshFitbitToken')({
      refreshToken,
    });
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn } = result.data;
    await AsyncStorage.setItem('access_token', newAccessToken);
    await AsyncStorage.setItem('refresh_token', newRefreshToken);
    await AsyncStorage.setItem('token_expiry', (Date.now() + expiresIn * 1000).toString());

    console.log('token refresh ok');
    return newAccessToken;
  } catch (error) {
    console.error('err- refresh token:', error);
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'token_expiry', 'fitbit_uid']);
    throw new Error('nu se poate refresh. trebuie reautent');
  }
}

export async function callFitbitApiDirect(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> {
  const token = await getValidFitbitToken();

  const response = await fetch(`https://api.fitbit.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API- err: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}
export async function callFitbitApi(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
) {
  const r = await httpsCallable<
    { firebaseUid: string; path: string; method: string; body?: any },
    any
  >(functions, 'callFitbitApi')({
    firebaseUid: auth.currentUser!.uid,
    path,
    method,
    body,
  });
  return r.data;
}

export function getCustomToken(fitbitUid: string) {
  return httpsCallable<{ fitbitUid: string }, { customToken: string }>(
    functions,
    'getCustomToken'
  )({ fitbitUid });
}
