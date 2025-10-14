/* eslint-disable no-void */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button } from 'react-native-ui-lib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, StyleSheet, Linking } from 'react-native';
import { signInWithCustomToken, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { exchangeTokenPKCE, getCustomToken } from '../fitbitApi';
import { fitbitConf } from '../fitbitConf';
import { sha256 } from 'js-sha256';
import 'react-native-get-random-values';
import { fromByteArray } from 'base64-js';
import qs from 'qs';

function generateRandomString(length = 43): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

function computeCodeChallenge(verifier: string): string {
  const hashHex = sha256(verifier);
  const bytes = new Uint8Array(
    hashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  return fromByteArray(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/, '');
}

export default function Auth() {
  const [error, setError] = useState<string | null>(null);

  const handleFitbitLogin = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'token_expiry', 'fitbit_uid']);
      const codeVerifier = generateRandomString();
      await AsyncStorage.setItem('oauth_code_verifier', codeVerifier);
      const codeChallenge = await computeCodeChallenge(codeVerifier);
      const state = generateRandomString(16);
      await AsyncStorage.setItem('oauth_state', state);
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: fitbitConf.clientId,
        redirect_uri: fitbitConf.redirectUrl,
        scope: fitbitConf.scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'consent',
      });
      const authUrl = `${fitbitConf.serviceConfiguration!.authorizationEndpoint}?${params.toString()}`;
      console.log('url autorizare format:', authUrl);
      const can = await Linking.canOpenURL(authUrl);
      if (!can) {
        throw new Error('nu se poate deschide browser pentru Fitbit');
      }
      await Linking.openURL(authUrl);
    } catch (e: any) {
      console.error('err init oAuth:', e);
      setError(e.message);
    }
  };

  const handleDeepLink = useCallback(async (url: string) => {
    try {
      if (!url.startsWith(fitbitConf.redirectUrl)) {
        return;
      }
      const [, queryString] = url.split('?');
      const params = qs.parse(queryString);
      const code = params.code as string | undefined;
      const returnedState = params.state as string | undefined;
      const err = params.error as string | undefined;
      if (err) {
        throw new Error(`oAuth err: ${err}`);
      }
      if (!code) {
        throw new Error('cod autorizare lipsa');
      }
      const savedState = await AsyncStorage.getItem('oauth_state');
      console.log('returnedState:', returnedState);
      console.log('savedState   :', savedState);
      let cleanState = returnedState!.split('#')[0];
      if (cleanState !== savedState) {
        throw new Error('State invalid (posibil CSRF)');
      }
      const codeVerifier = await AsyncStorage.getItem('oauth_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier lipsă');
      }
      console.log('schimare token!!!!');
      const result = await exchangeTokenPKCE(code, codeVerifier);
      await AsyncStorage.setItem('access_token', result.data.accessToken);
      await AsyncStorage.setItem('refresh_token', result.data.refreshToken);
      await AsyncStorage.setItem('token_expiry', (Date.now() + result.data.expiresIn * 1000).toString());
      await AsyncStorage.setItem('fitbit_uid', result.data.fitbitUid);
      console.log('token-uri salvate in asyncstorage');
      const { data } = await getCustomToken(result.data.fitbitUid);
      const userCred = await signInWithCustomToken(auth, data.customToken);
      await updateProfile(userCred.user, { displayName: result.data.fitbitUid });
      const uid = userCred.user.uid;
      const uRef = doc(db, 'user', uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        await updateDoc(uRef, {
          fitbitUid: result.data.fitbitUid,
          lastLogin: new Date().toISOString(),
        });
      } else {
        await setDoc(uRef, {
          uid: result.data.fitbitUid,
          fitbitUid: result.data.fitbitUid,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      }
      const chestionarRef = doc(db, 'Chestionar', uid);
      const chestionarSnap = await getDoc(chestionarRef);
      console.log(
        chestionarSnap.exists() ? 'chestionar completat' : 'chestionar necompletat'
      );
      await AsyncStorage.removeItem('oauth_code_verifier');
      await AsyncStorage.removeItem('oauth_state');
    } catch (e: any) {
      console.error('err- procesare deep link:', e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        void handleDeepLink(url);
      }
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleDeepLink(url);
    });
    return () => sub.remove();
  }, [handleDeepLink]);

  return (
    <View style={styles.container}>
      <Image source={require('../icons/procreate_element.png')} style={styles.topLeftImage} />
      <Text style={styles.title}>Bine ați venit ⌚️!</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        label="Autentificare cu Fitbit"
        onPress={handleFitbitLogin}
        backgroundColor="#1C4B82"
      />
      <Image source={require('../icons/procreate_element_invers.png')} style={styles.bottomRightImage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#1C4B82',
    fontSize: 24,
    marginBottom: 20,
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  topLeftImage: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: 400,
    height: 300,
    resizeMode: 'contain',
  },
  bottomRightImage: {
    position: 'absolute',
    bottom: -60,
    right: 0,
    width: 400,
    height: 250,
    resizeMode: 'contain',
  },
});
