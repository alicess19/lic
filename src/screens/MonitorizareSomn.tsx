/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState, useMemo, useCallback} from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity} from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, limit, getDocs, doc, getDoc, setDoc, orderBy} from 'firebase/firestore';
import RecomSleep from '../comp/RecomSleep';
import { db, auth } from '../firebaseConfig';
import moment from 'moment';
import 'moment/locale/ro';
import { VictoryChart, VictoryBar, VictoryTheme, VictoryAxis} from 'victory-native';
import FooterNav from '../navigation/FooterNav';
import { callFitbitApi } from '../fitbitApi';
moment.locale('ro');

type SleepPointType = {
  x: number;
  y: number;
  date: string;
};
const isoToHHmm = (iso: string): string => moment(iso).format('HH:mm');
const MonitorizareSomn: React.FC = () => {
  const userId = auth.currentUser?.uid;
  const todayDate = new Date().toISOString().split('T')[0];
  const todayDocId = `${userId}_${todayDate}`;
  const [sleepData, setSleepData] = useState<SleepPointType[]>([]);
  const [sleepGoal, setSleepGoal] = useState<number>(7);
  const [lastNightSleep, setLastNightSleep] = useState<number>(0);
  const [lightMinutes, setLightMinutes] = useState<number>(0);
  const [deepMinutes, setDeepMinutes] = useState<number>(0);
  const [remMinutes, setRemMinutes] = useState<number>(0);
  const minutesToHours = (m: number): number => m / 60;
  const formatMinutes = (m: number): string => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${hh}h ${mm}m`;
  };
  const fetchAndStoreRangeSleep = useCallback(
    async (startDate: string, endDate: string) => {
      if (!userId) {
        return;
      }
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('nu e token fb');
        return;
      }
      try {
        const path = `/1.2/user/-/sleep/date/${startDate}/${endDate}.json`;
        const response = await fetch(
          `https://api.fitbit.com${path}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const sleepApiData = await response.json();
        if (sleepApiData.sleep && sleepApiData.sleep.length > 0) {
          for (const entry of sleepApiData.sleep) {
            const docId = `${userId}_${entry.dateOfSleep}`;
            const docRef = doc(db, 'sleep_logs', docId);
            const eff = typeof entry.efficiency === 'number' ? entry.efficiency : 0;
            const dayOfWeek = moment(entry.dateOfSleep, 'YYYY-MM-DD').format('dddd');
            const startHHmm  = entry.startTime ? isoToHHmm(entry.startTime) : null;
            await setDoc(
              docRef,
              {
                uid: userId,
                date: entry.dateOfSleep,
                start_time: startHHmm,
                sleep_duration: Math.round(minutesToHours(entry.minutesAsleep)),
                sleep_efficiency: eff,
                sleep_light: entry.levels?.summary?.light?.minutes || 0,
                sleep_deep: entry.levels?.summary?.deep?.minutes || 0,
                sleep_rem: entry.levels?.summary?.rem?.minutes || 0,
                day_of_week: dayOfWeek,
              },
              { merge: true },
            );
          }
        } else {
          console.log('nu ex inregistrari de somn prin Fitbit');
        }
      } catch (err) {
        console.error('err fct fetchAndStoreRangeSleep:', err);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      return;
    }
    const syncToday = async () => {
      try {
        const qToday = query(
          collection(db, 'sleep_logs'),
          where('uid', '==', userId),
          where('date', '==', todayDate),
          limit(1),
        );
        const snapToday = await getDocs(qToday);
        const dayOfWeek = moment(todayDate, 'YYYY-MM-DD').format('dddd');
        if (snapToday.empty) {
          const token = await AsyncStorage.getItem('access_token');
          if (!token) {
            console.log('nu exista token Fitbit');
            return;
          }
          //const urlToday = `https://api.fitbit.com/1.2/user/-/sleep/date/${todayDate}.json`;
          const pathToday = `/1.2/user/-/sleep/date/${todayDate}.json`;
          const j = await callFitbitApi(pathToday, 'GET');
          if (j.sleep && j.sleep.length > 0) {
            const mainSleep = j.sleep.find((s: any) => s.isMainSleep) || j.sleep[0];
            const eff = typeof mainSleep.efficiency === 'number' ? mainSleep.efficiency : 0;
            const dur = Math.round(minutesToHours(mainSleep.minutesAsleep));
            const startHHmm  = mainSleep.startTime ? isoToHHmm(mainSleep.startTime) : null;
            await setDoc(
              doc(db, 'sleep_logs', todayDocId),
              {
                uid: userId,
                date: todayDate,
                start_time: startHHmm,
                day_of_week: dayOfWeek,
                sleep_duration: dur,
                sleep_efficiency: eff,
                sleep_light: mainSleep.levels?.summary?.light?.minutes || 0,
                sleep_deep: mainSleep.levels?.summary?.deep?.minutes || 0,
                sleep_rem: mainSleep.levels?.summary?.rem?.minutes || 0,
              },
              { merge: true },
            );
          }
        } else {
          console.log('doc de azi e deja');
        }
      } catch (err) {
        console.error('err- syncToday:', err);
      }
    };
    const fetchLast7Days = async () => {
      try {
        const endObj = new Date();
        const startObj = new Date();
        startObj.setDate(startObj.getDate() - 6);
        const startStr = startObj.toISOString().split('T')[0];
        const endStr = endObj.toISOString().split('T')[0];
        await fetchAndStoreRangeSleep(startStr, endStr);
        const logsRef = collection(db, 'sleep_logs');
        const q7 = query(logsRef, where('uid', '==', userId), orderBy('date', 'desc'), limit(7));
        const snap = await getDocs(q7);
        const mapDocs: Record<string, any> = {};
        snap.forEach((ds) => {
          const dd = ds.data();
          mapDocs[dd.date] = dd;
        });
        const arr: SleepPointType[] = [];
        for (let i = 0; i < 7; i += 1) {
          const offset = 6 - i;
          const dayObj = new Date();
          dayObj.setDate(dayObj.getDate() - offset);
          const dayStr = dayObj.toISOString().split('T')[0];
          const docData = mapDocs[dayStr];
          let hours = 0;
          if (docData && typeof docData.sleep_duration === 'number') {
            hours = docData.sleep_duration;
          }
          arr.push({
            x: i + 1,
            y: hours,
            date: dayStr,
          });
        }
        setSleepData(arr);
        const lastItem = arr[6];
        if (lastItem && mapDocs[lastItem.date]) {
          const dd = mapDocs[lastItem.date];
          setLastNightSleep(dd.sleep_duration || 0);
          setLightMinutes(dd.sleep_light || 0);
          setDeepMinutes(dd.sleep_deep || 0);
          setRemMinutes(dd.sleep_rem || 0);
        }
        const userRef = doc(db, 'user', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.sleep_goal) {
            setSleepGoal(userData.sleep_goal);
          }
        }
      } catch (err) {
        console.error('err- fetchLast7Days:', err);
      }
    };
    syncToday().then(() => {
      fetchLast7Days();
    });
  }, [userId, todayDate, todayDocId, fetchAndStoreRangeSleep]);
  const setNewSleepGoal = () => {
    if (!userId) {
      return;
    }
    Alert.prompt(
      'Setează obiectivul 🛌',
      'Introdu numărul de ore dorite:',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Salvează',
          onPress: async (value) => {
            if (value && !isNaN(parseInt(value, 10))) {
              const newGoal = parseInt(value, 10);
              try {
                const userRef = doc(db, 'user', userId);
                await setDoc(userRef, { sleep_goal: newGoal }, { merge: true });
                setSleepGoal(newGoal);
              } catch (error) {
                console.error('err- setGoal:', error);
              }
            }
          },
        },
      ],
      'plain-text',
      sleepGoal ? sleepGoal.toString() : '7',
    );
  };
  const progress = sleepGoal ? Math.min((lastNightSleep / sleepGoal) * 100, 100) : 0;
  const getSleepMessage = (): string => {
    if (progress < 40) {
      return 'Oh nu, mult prea puțin😪..';
    } else if (progress < 70) {
      return 'Sigur se poate mai bine🥱..';
    } else if (progress < 100) {
      return 'Aproape perfect!!👏🏻';
    }
    return 'Bravo, obiectiv atins!🥇';
  };

  const averageSleep = useMemo(() => {
    if (!sleepData.length) {return 0;}
    return sleepData.reduce((sum, p) => sum + p.y, 0) / sleepData.length;
  }, [sleepData]);
  const getFeedbackMessage = () => {
    if (averageSleep <= 5) {
      return 'Mare grijă să dormiți mai mult, periculos de puțin!😨';
    } else if (averageSleep < 7) {
      return 'Încercați să dormiți mai mult săptămâna asta..😳';
    }
    return 'Țineți-o tot așa!✨';
  };

  const totalMinutes = lightMinutes + deepMinutes + remMinutes;
  const fractionLight = totalMinutes > 0 ? lightMinutes / totalMinutes : 0;
  const fractionDeep = totalMinutes > 0 ? deepMinutes / totalMinutes : 0;
  const fractionRem = totalMinutes > 0 ? remMinutes / totalMinutes : 0;
  const displayLastNight = Math.round(lastNightSleep);
  const displayGoal = Math.round(sleepGoal);
  const formatDayTick = (tickValue: number): string => {
    const item = sleepData.find((obj) => obj.x === tickValue);
    if (!item) {
      return '';
    }
    return moment(item.date).format('dd');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSpacing} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.text}>Ultima înregistrare:</Text>

          <Svg height="150" width="150" style={{ marginVertical: 10 }}>
            <Circle
              cx="75"
              cy="75"
              r="70"
              stroke="#A9A9A9"
              strokeWidth={10}
              fill="none"
            />
            <Circle
              cx="75"
              cy="75"
              r="70"
              stroke="#D7EDFA"
              strokeWidth={10}
              fill="none"
              strokeDasharray="440"
              strokeDashoffset={440 - (progress / 100) * 440}
            />

            <Svg width="100%" height="100%">
              <G transform="translate(75,70) scale(0.07) translate(-512,-512)">
                <Path
                  d="M366.31713 744.766507h524.451937 l-21.246617-303.632256c-0.003197 0-401.128207-0.147058-503.20532 303.632256z"
                  fill="#1C4B82"
                />
                <Path
                  d="M943.262215 744.766507v159.84515h-863.16381v-159.84515h800.088914z"
                  fill="#D7EDFA"
                />
                <Path
                  d="M240.774749 499.8198c56.968811 0 103.16406 46.163279 103.16406 103.13209s-46.195248 103.16406-103.16406 103.16406-103.132091-46.195248-103.13209-103.16406 46.163279-103.132091 103.13209-103.13209z"
                  fill="#FFB578"
                />
                <Path
                  d="M80.098405 986.676157a22.378321 22.378321 0 0 1-22.378321-22.378321v-529.183353a22.378321 22.378321 0 1 1 44.756642 0v529.183353a22.378321 22.378321 0 0 1-22.378321 22.378321zM943.259018 986.676157a22.378321 22.378321 0 0 1-22.378321-22.378321v-305.400143a22.378321 22.378321 0 1 1 44.756642 0v305.400143c0 12.362424-10.015897 22.378321-22.378321 22.378321z"
                  fill="#666"
                />
                <Path
                  d="M943.259018 767.148025h-863.16381a22.378321 22.378321 0 1 1 0-44.756642h863.16381a22.378321 22.378321 0 1 1 0 44.756642z"
                  fill="#666"
                />
                <Path
                  d="M240.774749 728.494271c-69.206556 0-125.510412-56.316643-125.510411-125.542381 0-69.203359 56.303856-125.510412 125.510411-125.510412 69.222541 0 125.542381 56.303856 125.542381 125.510412 0 69.225738-56.31984 125.542381-125.542381 125.542381z m0-206.29615c-44.526465 0-80.75377 36.224108-80.753769 80.753769 0 44.545646 36.227305 80.785739 80.753769 80.785739 44.545646 0 80.785739-36.240092 80.785739-80.785739 0-44.529662-36.240092-80.75377-80.785739-80.753769zM371.879742 766.7612a22.378321 22.378321 0 0 1-22.378322-22.378321c0-82.607974 58.106909-166.216578 159.419962-229.390578 102.352046-63.819775 234.201917-98.966526 371.265937-98.966526a22.378321 22.378321 0 1 1 0 44.756642c-128.803222 0-252.242041 32.739484-347.586476 92.185895-87.918029 54.817296-138.34278 124.589704-138.34278 191.41137a22.378321 22.378321 0 0 1-22.378321 22.381518z"
                  fill="#666"
                />
                <Path
                  d="M880.187319 767.148025a22.378321 22.378321 0 0 1-22.378321-22.378321v-306.362411a22.378321 22.378321 0 1 1 44.756642 0v306.362411a22.378321 22.378321 0 0 1-22.378321 22.378321zM477.665262 429.487934h-167.837408a22.378321 22.378321 0 0 1-12.317667-41.061023l105.552146-69.58379H309.827854a22.378321 22.378321 0 1 1 0-44.756642h167.837408a22.378321 22.378321 0 0 1 12.317667 41.061022l-105.552146 69.583791h93.234479a22.378321 22.378321 0 1 1 0 44.756642zM636.612082 205.704724h-103.004215a22.378321 22.378321 0 0 1-12.31447-41.061023l40.71256-26.841197h-28.39809a22.378321 22.378321 0 1 1 0-44.756642h103.004215a22.378321 22.378321 0 0 1 12.31447 41.061022l-40.712559 26.841198h28.398089a22.378321 22.378321 0 1 1 0 44.756642zM868.38755 136.491774h-87.0197a22.378321 22.378321 0 0 1-12.31447-41.061023l24.715257-16.28822h-12.400787a22.378321 22.378321 0 1 1 0-44.756642h87.0197a22.378321 22.378321 0 0 1 12.31447 41.061022l-24.715257 16.288221h12.400787a22.378321 22.378321 0 1 1 0 44.756642zM943.259018 926.993175h-863.16381a22.378321 22.378321 0 1 1 0-44.756642h863.16381a22.378321 22.378321 0 1 1 0 44.756642z"
                  fill="#666"
                />
              </G>
            </Svg>
          </Svg>

          <Text style={styles.sleepText}>
            {displayLastNight}h / {displayGoal}h
          </Text>
          <Text style={styles.sleepMessage}>{getSleepMessage()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.recomContainer}>
            <RecomSleep/>
          </View>
          </View>
        </View>
        <View style={styles.rowCardsContainer}>
              <TouchableOpacity style={styles.smallCard} onPress={setNewSleepGoal}>
                <Text style={styles.smallCardText}>Obiectiv 🛌</Text>
              </TouchableOpacity>
              <View style={styles.largeCard}>
                <Text style={styles.smallCardText}>{getFeedbackMessage()}</Text>
              </View>
            </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Svg
              width={25}
              height={25}
              viewBox="0 0 16 16"
              fill="#1C4B82"
              style={{ marginRight: 3, marginBottom: -10 }}
            >
              <Path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1.5 14H15v-1H2V0H1v13.5l.5.5zM3 11.5v-8l.5-.5h2l.5.5v8l-.5.5h-2l-.5-.5zm2-.5V4H4v7h1zm6-9.5v10l.5.5h2l.5-.5v-10l-.5-.5h-2l-.5.5zm2 .5v9h-1V2h1zm-6 9.5v-6l.5-.5h2l.5.5v6l-.5.5h-2l-.5-.5zm2-.5V6H8v5h1z"
              />
            </Svg>
          </View>
          <Text style={styles.text}>Grafic somn- ultima săptămână</Text>

          <View style={styles.graphContainer}>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={{ x: 20, y: 10 }}
              height={250}
              width={340}
            >
              <VictoryAxis
                label="Zile"
                tickValues={[1, 2, 3, 4, 5, 6, 7]}
                tickFormat={formatDayTick}
                style={{
                  axisLabel: { padding: 30, fontSize: 13, fill: '#000', fontWeight: 'bold' },
                  tickLabels: { fontSize: 12, fill: '#000' },
                }}
              />
              <VictoryAxis
                dependentAxis
                label="Ore dormite"
                style={{
                  axisLabel: { padding: 25, fontSize: 13, fill: '#000', fontWeight: 'bold' },
                  tickLabels: { fontSize: 11, fill: '#000' },
                }}
                tickFormat={(val) => `${Math.round(val)}`}
              />

              <VictoryBar
                data={sleepData}
                x="x"
                y="y"
                barRatio={0.7}
                style={{
                  data: {
                    fill: (props) => {
                      const i = typeof props.index === 'number' ? props.index : 0;
                      const colorArray = ['#7d7fc6', '#BED0FC', '#74C4C0', '#C4EBE7'];
                      return colorArray[i % colorArray.length];
                    },
                  },
                }}
              />
            </VictoryChart>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.text}>Stadiile Somnului</Text>
          <View style={styles.stagesRow}>
            <View style={[styles.stageBox, { backgroundColor: '#7D7FC6' }]}>
              <Text style={styles.stageTitle}>Ușor</Text>
              <Text style={styles.stageHours}>{formatMinutes(lightMinutes)}</Text>
            </View>
            <View style={[styles.stageBox, { backgroundColor: '#74C4C0' }]}>
              <Text style={styles.stageTitle}>Profund</Text>
              <Text style={styles.stageHours}>{formatMinutes(deepMinutes)}</Text>
            </View>
            <View style={[styles.stageBox, { backgroundColor: '#C4EBE7' }]}>
              <Text style={styles.stageTitle}>REM</Text>
              <Text style={styles.stageHours}>{formatMinutes(remMinutes)}</Text>
            </View>
          </View>
          <View style={styles.barContainer}>
            <View style={{ flex: fractionLight, backgroundColor: '#7D7FC6' }} />
            <View style={{ flex: fractionDeep, backgroundColor: '#74C4C0' }} />
            <View style={{ flex: fractionRem, backgroundColor: '#C4EBE7' }} />
          </View>
        </View>
      </ScrollView>

      <FooterNav />
    </View>
  );
};

export default MonitorizareSomn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FE',
  },
  topSpacing: {
    height: 68,
    backgroundColor: '#F0F9FE',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  recomContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    width: '95%',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
    marginBottom: 20,
    elevation: 3,
    alignItems: 'center',
    alignSelf: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 3,
    textAlign: 'center',
  },
  sleepText: {
    fontSize: 16,
    color: '#333',
    marginTop: 3,
  },
  sleepMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 5,
  },
  sleepQuality: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 2,
  },
  graphContainer: {
    marginTop: -20,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
  },
  stagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 15,
  },
  rowCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '95%',
    alignSelf: 'center',
    marginVertical: 20,
  },
  smallCard: {
    backgroundColor: '#FFF',
    width: '25%',
    padding: 12,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 0,
  },
  smallCardText: {
    fontSize: 12,
    fontWeight: '600',
    textAlignVertical: 'center',
    textAlign: 'center',
    color: '#333',
  },
  largeCard: {
    backgroundColor: '#FFF',
    width: '74.5%',
    padding: 15,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
    justifyContent: 'center',
    marginTop: -20,
    marginBottom: 0,
  },
  stageBox: {
    width: '28%',
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  stageHours: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 25,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BED0FC',
    overflow: 'hidden',
  },
  resetButton: {
    backgroundColor: 'F0F9FE',
    padding: 12,
    borderRadius: 15,
    width: '95%',
    borderWidth: 4,
    borderColor: '#BED0FC',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 15,
    marginTop: -3,
  },
  resetButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
