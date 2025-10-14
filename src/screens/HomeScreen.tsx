/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image, ImageBackground, Modal, TouchableWithoutFeedback, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Svg, { Circle, G, Path } from 'react-native-svg';
import FooterNav from '../navigation/FooterNav';
import { getFitbitDataWithCache, saveFitbitFetchResult } from '../comp/FitbEpuiz';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryTheme } from 'victory-native';
import { callFitbitApiDirect } from '../fitbitApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  steps_goal?: number;
  stil_viata?: string;
}

type RootStackParamList = {
  HomeScreen: undefined;
  Exercitii: undefined;
  ReteteSugerate: undefined;
  Profil: undefined;
  Obiective: undefined;
  MonitorizareSomn: undefined;
  Alerte: undefined;
  Auth: undefined;
};

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const userId = auth.currentUser?.uid;
  const [steps, setSteps] = useState<number>(0);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [targetSteps, setTargetSteps] = useState<number>(10000);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [stepsHistory, setStepsHistory] = useState<
    { date: string; steps: number; energyLevel: 'mare' | 'mediu' | 'scazut' | null }[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const titlePaddingTop = Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0);

  useEffect(() => {
    if (!userId) {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      return;
    }
    const fetchUserData = async () => {
      try {
        if (!userId) { return; }
        const metricsRef = doc(db, 'health_metrics', userId);
        const metricsSnap = await getDoc(metricsRef);
        if (metricsSnap.exists()) {
          const data = metricsSnap.data() as UserData;
          setTargetSteps(data.steps_goal ?? 10000);
        } else {
          console.log('!!documentul user/' + userId + ' nu exista');
        }
      } catch (error) {
        console.error('eroare de preluare a obiectivului pasi', error);
      }
    };
    fetchUserData();
  }, [navigation, userId]);

  useEffect(() => {
    const fetchFitbitData = async () => {
      try {
        const stepsCache = await getFitbitDataWithCache('steps_today', 2);
        const heartRateCache = await getFitbitDataWithCache('heart_rate_today', 2);
        if (!stepsCache.shouldFetch && !heartRateCache.shouldFetch) {
          console.log('toate datele fitbit din cache, fara fetch');
          if (stepsCache.data?.steps !== undefined) {
            setSteps(stepsCache.data.steps);
          }
          if (heartRateCache.data?.heartRate !== undefined) {
            setHeartRate(heartRateCache.data.heartRate);
          }
          return;
        }
        console.log('ver token-ul fitbit- local');

        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          console.warn('nu ex token fitbit- asyncstorage, tb autentificare');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
          return;
        }
        if (stepsCache.shouldFetch) {
          console.log('preluare noua pasi');
          try {
            const stepsData = await callFitbitApiDirect('/1/user/-/activities/steps/date/today/1d.json', 'GET');
            console.log('raspuns Fitbit- pasi azi:', JSON.stringify(stepsData, null, 2));

            let latestSteps = 0;
            if (stepsData &&
                stepsData['activities-steps'] &&
                Array.isArray(stepsData['activities-steps']) &&
                stepsData['activities-steps'].length > 0) {
              latestSteps = parseInt(stepsData['activities-steps'][0]?.value || '0', 10);
              console.log(`ultima valoare a pasilor- ${latestSteps}`);
            } else {
              console.warn('nu sunt date despre pasi în API Fitbit!!!');
            }

            setSteps(latestSteps);
            await saveFitbitFetchResult('steps_today', { steps: latestSteps });
          } catch (stepsError: any) {
            console.error('err- preluare pasi:', stepsError);
            if (stepsError.message.includes('Reautentificare necesară') ||
                stepsError.message.includes('refresh failed')) {
              console.warn('token fitbit invalid, redirect autentificare');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
              return;
            }
          }
        } else if (stepsCache.data?.steps !== undefined) {
          console.log('pasi din cache:', stepsCache.data.steps);
          setSteps(stepsCache.data.steps);
        }
        if (heartRateCache.shouldFetch) {
          console.log('reimprosp date hr- ');
          try {
            const today = new Date().toISOString().split('T')[0];
            const heartRateData = await callFitbitApiDirect(
              `/1/user/-/activities/heart/date/${today}/${today}/1min/time/00:00/23:59.json`,
              'GET'
            );
            console.log('raspuns hr Fitbit:', JSON.stringify(heartRateData, null, 2));

            let latestHeartRate = null;
            if (heartRateData &&
                heartRateData['activities-heart-intraday'] &&
                heartRateData['activities-heart-intraday'].dataset) {
              const dataset = heartRateData['activities-heart-intraday'].dataset;
              if (Array.isArray(dataset) && dataset.length > 0) {
                const lastEntry = dataset[dataset.length - 1];
                latestHeartRate = lastEntry.value || null;
                console.log(`ultima valoare BPM inreg: ${latestHeartRate}`);
              } else {
                console.warn('nu exista date intraday de hr!');
              }
            } else {
              console.warn('api nu a ret date despre hr intraday');
            }

            setHeartRate(latestHeartRate);
            await saveFitbitFetchResult('heart_rate_today', { heartRate: latestHeartRate });
          } catch (heartRateError) {
            console.error('err- date noi heart rate:', heartRateError);
          }
        } else if (heartRateCache.data?.heartRate !== undefined) {
          console.log('heart rate- cache:', heartRateCache.data.heartRate);
          setHeartRate(heartRateCache.data.heartRate);
        }
      } catch (error) {
        console.error('eroare gen- preluarea datelor fitbit:', error);
      }
    };

    fetchFitbitData();
    const intervalId = setInterval(fetchFitbitData, 120_000);
    return () => clearInterval(intervalId);
  }, [navigation, userId]);

  const progress = Math.min((steps / targetSteps) * 100, 100);

  const fetchStepsHistory = async () => {
    if (!userId) { return; }
    setLoadingHistory(true);
    try {
      console.log('Fetch istoric pași...');
      const json = await callFitbitApiDirect('/1/user/-/activities/steps/date/today/7d.json', 'GET');
      const arr: { dateTime: string; value: string }[] =
        json['activities-steps'] || [];

      const hist = await Promise.all(
        arr.map(async (item) => {
          const date = item.dateTime;
          const daySteps = parseInt(item.value, 10) || 0;
          const docSnap = await getDoc(
            doc(db, 'health_metrics', userId, 'daily', date)
          );
          const lvl =
            docSnap.exists() && docSnap.data().energyLevel
              ? (docSnap.data().energyLevel as 'mare' | 'mediu' | 'scazut')
              : null;
          return { date, steps: daySteps, energyLevel: lvl };
        })
      );
      setStepsHistory(hist);
    } catch (e) {
      console.error('fetchStepsHistory err la fct', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const chartData = stepsHistory.map((d, i) => ({
    x: i + 1,
    y: d.steps,
    energyLevel: d.energyLevel,
    date: d.date,
  }));

  const { width: windowWidth } = Dimensions.get('window');
  const chartWidth = windowWidth * 0.9;
  const legendData = [
    { name: 'Nu există date declarate- nivel energie', symbol: { fill: '#74C4C0' } },
    { name: 'Energie scăzută', symbol: { fill: '#e3b47d' } },
    { name: 'Energie medie', symbol: { fill: '#1C4B82' } },
    { name: 'Energie ridicată', symbol: { fill: '#FF9300' } },
  ];

  const averageSteps =
    stepsHistory.length > 0
      ? Math.round(stepsHistory.reduce((sum, d) => sum + d.steps, 0) / stepsHistory.length)
      : 0;
  const procGoal = targetSteps > 0
    ? Math.round((averageSteps / targetSteps) * 100)
    : 0;
  let emoji = '😳';
  if (procGoal >= 80) {
    emoji = '😄';
  } else if (procGoal >= 40) {
    emoji = '😌';
  }

  return (
    <ImageBackground
      source={require('../icons/fundalHome.jpg')}
      style={{ flex: 1 }}
      resizeMode="cover">
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { paddingTop: titlePaddingTop }]}>
          Monitorizarea stării de sănătate 🩺
        </Text>
        <View style={styles.heartRateContainer}>
          <Text style={styles.heartRateTitle}>
            <Svg width={19} height={17} viewBox="0 -6 143 143" fill="none">
              <Path
                d="M67.3959 125.449L68.1194 125.669C70.78 126.474 73.2927 127.233 74.949 130.561C74.9909 130.645 75.0497 130.719 75.122 130.779C75.1942 130.838 75.2782 130.882 75.3679 130.907C75.4247 130.922 75.4828 130.929 75.5415 130.929C75.6699 130.929 75.7952 130.892 75.903 130.821C77.1242 130.018 78.2744 129.291 79.3665 128.6C81.6546 127.152 83.631 125.903 85.5209 124.447C92.2994 119.338 98.4848 113.475 103.96 106.965C111.156 98.2636 118.597 89.2656 125.602 79.8467C129.986 73.9503 133.723 67.3678 136.882 61.663C140.042 55.8907 141.923 49.4951 142.396 42.9172C143.253 32.1074 140.707 22.3639 134.828 13.9577C128.286 4.60191 119.585 0.0455045 108.986 0.396793C97.0287 0.80022 86.5129 5.41512 77.7296 14.1139C77.3036 14.5557 76.9092 15.0275 76.5497 15.5256C75.8668 16.425 75.2188 17.2788 74.2435 17.617C63.9983 7.5411 56.165 3.59962 44.4467 2.58942C32.4206 1.55185 22.6847 5.45696 15.5078 14.1903C11.9462 18.5071 8.82442 23.1754 6.19001 28.1245C0.574558 38.7407 -0.595573 50.0327 2.71755 61.6891C5.67229 72.0929 10.5991 81.8182 17.2247 90.3254C30.4714 107.388 47.3519 119.207 67.3959 125.449Z"
                stroke="black"
                strokeWidth={18}
              />
            </Svg>
            ritm cardiac
          </Text>

          <Text style={styles.heartRateValue}>{heartRate ?? 'N/A'} bpm</Text>
        </View>

        <Text style={styles.sectionTitleAligned}>Meniuri principale</Text>

        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.card} onPress={async () => {
            await fetchStepsHistory();
            setShowStepsModal(true);
          }}>
            <View style={styles.progressWrapper}>
              <Svg height="120" width="120" viewBox="0 0 120 120">
                <Circle cx="60" cy="60" r="50" stroke="#D7EDFA" strokeWidth="10" fill="none" />
                <Circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#40568F"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray="314"
                  strokeDashoffset={314 - (progress / 100) * 314}
                />

                <G transform="translate(30, 30) scale(0.2)">
                  <Path
                    d="M284.956 111.871 208.046 4.198a10.02 10.02 0 0 0-11.875-3.48l-92.32 36.928a10.02 10.02 0 0 0-6.299 9.304v68.09a14.5 14.5 0 0 1-1.521 6.442l-30.187 60.375a12.36 12.36 0 0 1-7.196 6.241l-32.027 10.676A31.24 31.24 0 0 0 5.233 228.45v37.733C5.234 283.176 19.058 297 36.051 297h44.212a37 37 0 0 0 21.893-7.12l174.508-126.914c16.254-11.82 19.973-34.741 8.292-51.095M32.96 217.785l32.027-10.676c8.232-2.745 14.903-8.531 18.783-16.291l3.113-6.227 8.532 8.532a10 10 0 0 0 7.085 2.935 10 10 0 0 0 7.085-2.935c3.913-3.913 3.913-10.257 0-14.171L96.33 165.696l7.292-14.584 16.902 16.902a10 10 0 0 0 7.085 2.935 10 10 0 0 0 7.085-2.935c3.913-3.913 3.913-10.258 0-14.171l-21.626-21.626.888-1.775a34.6 34.6 0 0 0 3.636-15.403v-.468l9.481 9.481a10 10 0 0 0 7.085 2.935 10 10 0 0 0 7.085-2.935c3.913-3.913 3.913-10.258 0-14.171l-23.652-23.653V53.734l78.718-31.488 61.428 85.999L66.301 244.477H25.274v-16.028c0-4.846 3.089-9.132 7.686-10.664m231.917-71.026L90.369 273.674a17.07 17.07 0 0 1-10.106 3.286H36.051c-5.943 0-10.777-4.835-10.777-10.777v-4.671h43.748a8.53 8.53 0 0 0 4.939-1.577L267.64 122.107l1.009 1.412c5.313 7.438 3.621 17.863-3.772 23.24"
                    fill="#1C4B82"
                  />
                </G>
              </Svg>
            </View>

            <Text style={styles.cardTitle}>
              {steps} / {targetSteps} pași
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('MonitorizareSomn')}>
            <Image source={require('../icons/add_sleep.jpeg')} style={styles.cardImage} />
            <Text style={styles.cardTitle}>💤somn</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Alerte')}>
            <Image source={require('../icons/add_alarm.jpg')} style={styles.cardImage} />
            <Text style={styles.cardTitle}>🚨ritm cardiac</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Obiective')}>
            <Image source={require('../icons/add_exercise.png')} style={styles.cardImage} />
            <Text style={styles.cardTitle}>🎯obiective</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showStepsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStepsModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowStepsModal(false)}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback>
                <View style={styles.stepsModalContainer}>
                  <Text style={styles.modalHeader}>Pași (ultima săptămână)</Text>
                  <View style={styles.chenSub}>
                    <Text style={styles.subtitle}>
                      Media pașilor: {averageSteps.toLocaleString()} pași pe zi, adică{' '}
                      {procGoal}% din obiectivul dumneavoastră! {emoji}
                    </Text>
                  </View>

                  {loadingHistory ? (
                    <ActivityIndicator size="large" />
                  ) : (
                    <>
                      <VictoryChart
                        theme={VictoryTheme.material}
                        width={chartWidth}
                        height={300}
                        domainPadding={{ x: [20, 20], y: 10 }}
                        padding={{ top: 30, bottom: 50, left: 70, right: 20 }}
                      >
                        <VictoryAxis
                          dependentAxis
                          offsetX={70}
                          tickFormat={(t) => `${t}`}
                          style={{
                            axis: { stroke: '#ccc' },
                            grid: { stroke: 'transparent' },
                            tickLabels: { fontSize: 11, padding: 5 },
                            axisLabel: { padding: 50, fontSize: 13, fontWeight: 'bold' },
                          }}
                          label="Pași"
                        />

                        <VictoryAxis
                          tickValues={chartData.map((d) => d.x)}
                          tickFormat={chartData.map((d) => d.date.substr(5))}
                          style={{
                            axis: { stroke: '#ccc' },
                            grid: { stroke: 'transparent' },
                            tickLabels: { fontSize: 11, padding: 5 },
                            axisLabel: { padding: 35, fontSize: 13, fontWeight: 'bold' },
                          }}
                          label="Ziua"
                        />

                        <VictoryBar
                          data={chartData}
                          x="x"
                          y="y"
                          barRatio={0.7}
                          labels={({ datum }) => `${datum.y} pași`}
                          labelComponent={<VictoryTooltip />}
                          style={{
                            data: {
                              fill: ({ datum }) => {
                                switch (datum.energyLevel) {
                                  case 'mare': return '#FF9300';
                                  case 'mediu': return '#1C4B82';
                                  case 'scazut': return '#e3b47d';
                                  default: return '#74C4C0';
                                }
                              },
                            },
                          }}
                        />
                      </VictoryChart>
                      <View
                        style={{
                          width: chartWidth,
                          alignSelf: 'center',
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          paddingVertical: 8,
                        }}
                      >
                        {legendData.map((item) => (
                          <View
                            key={item.name}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginHorizontal: 8,
                              marginVertical: 4,
                            }}
                          >
                            <Svg width={12} height={12}>
                              <Circle cx={6} cy={6} r={6} fill={item.symbol.fill} />
                            </Svg>
                            <Text style={{ marginLeft: 6, fontSize: 12 }}>
                              {item.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <FooterNav />
      </View>
    </ImageBackground>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: 7,
    fontFamily: 'sans-serif',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C4B82',
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingLeft: 15,
  },
  progressWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoeIcon: {
    position: 'absolute',
    width: 50,
    height: 50,
    top: 35,
  },
  sectionTitleAligned: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1C4B82',
    paddingLeft: 15,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  heartRateContainer: {
    width: '80%',
    padding: 25,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#1C4B82',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 60,
  },
  heartRateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    color: '#1C4B82',
  },
  heartRateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    alignItems: 'center',
    marginTop: 5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  card: {
    aspectRatio: 1,
    borderWidth: 2.1,
    borderColor: '#1C4B82',
    width: '46%',
    backgroundColor: 'white',
    padding: 20,
    alignSelf: 'center',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C4B82',
    marginTop: 8,
    textAlign: 'center',
  },
  cardImage: {
    width: 148,
    height: 120,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  stepsModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C4B82',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  chenSub: {
    backgroundColor: '#1C4B82',
    paddingVertical: 5,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
});
