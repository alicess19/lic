import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Auth from '../screens/Auth';
import Chestionar from '../screens/Chestionar';
import HomeScreen from '../screens/HomeScreen';
import Exercitii from '../screens/Exercitii';
import Obiective from '../screens/Obiective';
import MonitorizareSomn from '../screens/MonitorizareSomn';
import Alerte from '../screens/Alerte';
import Jurnal from '../screens/Jurnal';
import Profil from '../screens/Profil';
import ReteteSugerate from '../screens/ReteteSugerate';
import PlanSugerat from '../screens/PlanSugerat';
import DetaliiAlarma from '../screens/DetaliiAlarma';
import IstoricKg from '../screens/IstoricKg';
import LipsaLog from '../screens/LipsaLog';
import AddMancare from '../screens/AddMancare';
import Pauza from '../screens/Pauza';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();
const Stack = createNativeStackNavigator();

const AppNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasCompletedChestionar, setHasCompletedChestionar] = useState<boolean>(false);
  const [hasFitbitToken, setHasFitbitToken] = useState<boolean>(false);

useEffect(() => {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('RESET') && args[0]?.includes?.('Auth')) {
      return;
    }
    originalError(...args);
  };

  return () => {
    console.error = originalError;
  };
}, []);

  useEffect(() => {
    let unsubscribeChestionar = () => {};

    const checkFitbitToken = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        setHasFitbitToken(!!token);
        console.log('Token Fitbit există:', !!token);
      } catch (error) {
        console.error('Eroare verificare token Fitbit:', error);
        setHasFitbitToken(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('autentificare det:', firebaseUser?.uid);
      setUser(firebaseUser);

      if (!firebaseUser) {
        setHasCompletedChestionar(false);
        setHasFitbitToken(false);
        setIsLoading(false);
        return;
      }
      await checkFitbitToken();

      const chestionarRef = doc(db, 'Chestionar', firebaseUser.uid);
      unsubscribeChestionar = onSnapshot(
        chestionarRef,
        (docSnap) => {
          console.log('chest, completat:', docSnap.exists());
          setHasCompletedChestionar(docSnap.exists());
          setIsLoading(false);
        },
        (error) => {
          console.error('err onsnap chestionar:', error);
          setHasCompletedChestionar(false);
          setIsLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeChestionar();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1C4B82" />
        <Text style={styles.loadingText}>Se verifică autentificarea...</Text>
      </View>
    );
  }
  const needsAuth = !user || !hasFitbitToken;

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        {needsAuth ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={Auth} />
          </Stack.Navigator>
        ) : !hasCompletedChestionar ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Chestionar" component={Chestionar} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="Profil" component={Profil} />
            <Stack.Screen name="Exercitii" component={Exercitii} />
            <Stack.Screen name="Obiective" component={Obiective} />
            <Stack.Screen name="IstoricKg" component={IstoricKg} />
            <Stack.Screen name="LipsaLog" component={LipsaLog} />
            <Stack.Screen name="MonitorizareSomn" component={MonitorizareSomn} />
            <Stack.Screen name="Alerte" component={Alerte} />
            <Stack.Screen name="DetaliiAlarma" component={DetaliiAlarma} />
            <Stack.Screen name="Jurnal" component={Jurnal} />
            <Stack.Screen name="AddMancare" component={AddMancare} />
            <Stack.Screen name="ReteteSugerate" component={ReteteSugerate} />
            <Stack.Screen name="PlanSugerat" component={PlanSugerat} />
            <Stack.Screen name="Pauza" component={Pauza} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
});

export default AppNavigation;
