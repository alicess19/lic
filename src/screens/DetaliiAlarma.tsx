import React, { useEffect, useState, useCallback } from 'react';
import {View,Text, StyleSheet, Alert, Platform} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { G, Path } from 'react-native-svg';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import ButonInapoi from '../comp/ButonInapoi';

type HourlyItem = {
  hour: number;
  bpm: number;
};
type Alarm = {
  date: string;
  time: string;
  value: number;
};

const makeTimestampKey = (date: string, time: string) =>
  `${date.replace(/\//g, '-')}_${time.replace(':', '-')}`;
async function loadUserAlarms(): Promise<Alarm[]> {
  const user = auth.currentUser;
  if (!user) {return [];}
  const ref = doc(db, 'health_metrics', `${user.uid}_alarms`);
  const snap = await getDoc(ref);
  if (!snap.exists()) {return [];}
  const data = snap.data();
  return Object.entries(data)
    .filter(([k]) => k !== 'createdAt')
    .map(([_, v]) => v as Alarm)
    .sort((a, b) => {
      const ta = makeTimestampKey(a.date, a.time);
      const tb = makeTimestampKey(b.date, b.time);
      return ta < tb ? -1 : 1;
    });
}

const HeartIcon = () => (
  <Svg
    width="300"
    height="300"
    viewBox="0 0 512 512"
    preserveAspectRatio="xMidYMid meet"
    style={styles.svgContainer}
  >
    <G id="_x37_19_x2C__heartbeat_x2C__love_x2C__heart_x2C__wedding">
      <G>
        <Path
          d="M308.304,157.579c26.28,0,47.564,21.284,47.564,47.502c0,39.215-32.424,64.5-70.456,98.844    c-8.038,7.252-16.323,14.916-24.599,23.203c-8.909-8.91-17.807-17.098-26.405-24.836c-37.234-33.521-68.599-58.619-68.599-97.211    c0-26.218,21.271-47.502,47.502-47.502c23.751,0,35.626,11.876,47.502,35.627C272.689,169.455,284.565,157.579,308.304,157.579z"
          fill="#BED0FC"
        />
        <Path
          d="M258.908,312.178c-37.234-33.521-68.599-58.619-68.599-97.211       c0-26.218,21.271-47.502,47.502-47.502c1.774,0,3.474,0.074,5.12,0.207c-7.703-6.729-16.979-10.093-29.62-10.093       c-26.23,0-47.502,21.284-47.502,47.502c0,38.592,31.364,63.689,68.599,97.211c8.599,7.738,17.496,15.926,26.405,24.836       c2.332-2.335,4.664-4.615,6.991-6.856C264.813,317.516,261.842,314.818,258.908,312.178z"
          fill="#1C4B82"
        />
      </G>
      <Path
        d="M360.227,354.421c-0.022,0-0.045,0-0.066,0c-2.319-0.031-4.313-1.651-4.815-3.915l-14.207-63.93    l-12.414,37.242c-0.681,2.042-2.591,3.419-4.743,3.419h-63.429c-2.762,0-5-2.238-5-5s2.238,5,5-5h59.825l16.982-50.948    c0.71-2.132,2.754-3.537,5.001-3.412c2.244,0.115,4.136,1.715,4.623,3.908l13.528,60.876l22.047-88.187    c0.557-2.226,2.557-3.787,4.851-3.787s4.294,1.562,4.851,3.787l17.176,68.701h23.279c2.762,0,5,2.238,5,5s-2.238,5-5,5h-27.184    c-2.294,0-4.294-1.562-4.851-3.787l-13.271-53.086l-22.333,89.331C364.52,352.861,362.518,354.421,360.227,354.421z"
        fill="#1C4B82"
      />
      <Path
        d="M160.836,354.421c-2.291,0-4.293-1.559-4.85-3.787l-22.333-89.331l-13.272,53.086    c-0.556,2.226-2.556,3.787-4.851,3.787H79.285c-2.761,0-5-2.238-5-5s2.239-5,5-5h32.342l17.176-68.701    c0.556-2.226,2.556-3.787,4.851-3.787c2.294,0,4.294,1.562,4.851,3.787l22.047,88.186l13.527-60.875    c0.487-2.193,2.379-3.793,4.624-3.908c2.237-0.128,4.29,1.28,5.001,3.412l16.982,50.948h59.824c2.762,0,5,2.238,5,5s-2.238,5-5,5    h-63.429c-2.152,0-4.063-1.377-4.743-3.419l-12.414-37.242l-14.206,63.93c-0.503,2.264-2.497,3.884-4.815,3.915    C160.881,354.421,160.858,354.421,160.836,354.421z"
        fill="#1C4B82"
      />
    </G>
  </Svg>
);
type RootStackParamList = {
  DetaliiAlarma: {
    bpm: number;
    date: string;
    time: string;
    hourlyData: HourlyItem[];
  };
};

const DetaliiAlarma = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'DetaliiAlarma'>>();

  const {
    bpm = 0,
    date: alarmDate = 'N/A',
    time: alarmTime = '00:00',
  } = route.params || {};
  const [minNormal, setMinNormal] = useState<number>(60);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyItem[]>([]);
  const [maxNormal, setMaxNormal] = useState<number>(100);

  useEffect(() => {
    loadUserAlarms().then(setAlarms);
    async function fetchHeartRateZones() {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          console.warn('nu ex token-ul fitbit- asyncst');
          return;
        }
        const response = await fetch(
          'https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!response.ok) {
          const text = await response.text();
          console.error('err API:', response.status, response.statusText, text);
          return;
        }
        const json = await response.json();
        const zones =
          json['activities-heart']?.[0]?.value?.heartRateZones || [];
        if (zones.length) {
          setMinNormal(zones[0].min);
          setMaxNormal(zones[0].max);
        }
      } catch (err) {
        console.error('err zone ritm cardiac', err);
      }
    }
    fetchHeartRateZones();
  }, []);

  useEffect(() => {
    async function fetchIntraday() {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          console.warn('nu ex token fitbit- asyncstorage');
          return;
        }
        const response = await fetch(
          'https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json',
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) {
          console.error('err API:', await response.text());
          return;
        }
        const json = await response.json();
        const points: { time: string; value: number }[] =
          json['activities-heart-intraday']?.dataset || [];
        const byHour: Record<number, { sum: number; count: number }> = {};
        points.forEach(({ time, value }) => {
          const hour = parseInt(time.split(':')[0], 10);
          if (!byHour[hour]) {byHour[hour] = { sum: 0, count: 0 };}
          byHour[hour].sum += value;
          byHour[hour].count += 1;
        });
        const arr: HourlyItem[] = Object.entries(byHour).map(
          ([h, { sum, count }]) => ({
            hour: parseInt(h, 10),
            bpm: Math.round(sum / count),
          })
        );
        setHourlyData(arr);
      } catch (err) {
        console.error('err intraday', err);
      }
    }
    fetchIntraday();
  }, []);

  const avgLastHour = React.useMemo(() => {
    if (hourlyData.length === 0) {return 0;}
    const sum = hourlyData.reduce((acc, item) => acc + item.bpm, 0);
    return Math.round(sum / hourlyData.length);
  }, [hourlyData]);
  const showAnomalyAlert = useCallback(() => {
    Alert.alert(
      'Atenție!',
      `Am depistat o posibilă neregularitate: ${bpm} BPM!`,
      [
        {
          text: 'Închide',
          style: 'cancel',
        },
        {
          text: 'Vezi alerte',
          onPress: () => {
            navigation.navigate('Alerte' as never);
          },
        },
      ],
      { cancelable: false }
    );
  }, [bpm, navigation]);
  async function writeAlarmForUser(alarm: Alarm) {
    const user = auth.currentUser;
    if (!user) {return;}
    const ref = doc(db, 'health_metrics', `${user.uid}_alarms`);
    const key = makeTimestampKey(alarm.date, alarm.time);
    await setDoc(
      ref,
      { [key]: alarm, createdAt: serverTimestamp() },
      { merge: true }
    );
  }
  useEffect(() => {
    if (bpm > 0) {
      showAnomalyAlert();
    }
  }, [bpm, showAnomalyAlert]);

  useEffect(() => {
    if (bpm <= 0) {return;}
    if (bpm < minNormal || bpm > maxNormal) {
      const newAlarm: Alarm = {
        date: alarmDate,
        time: alarmTime,
        value: bpm,
      };
      writeAlarmForUser(newAlarm);
      setAlarms(prev => [...prev, newAlarm]);
      showAnomalyAlert();
    }
  }, [bpm, minNormal, maxNormal, showAnomalyAlert, alarmDate, alarmTime]);

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <ButonInapoi />
        <Text style={styles.headerTitle}>Detalii alarmă</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      <HeartIcon />
      <View style={styles.card}>
      <Text style={styles.cardText}>
        Minim: <Text style={styles.cardValue}>{minNormal}</Text> BPM
      </Text>
      <Svg width={24} height={24} viewBox="0 0 24 24" style={styles.cardIcon}>
        <Path
          d="M23 11v1c-1.108 0-1.36 1.386-1.385 1.544-.284 1.893-1.046 5.66-2.759 7.456H19v1h-1v-.336a2.567 2.567 0 0 1-1.25.336 3.239 3.239 0 0 1-.75-.094V22h-1v-.526c-2.095-1.41-2.804-5.452-3.493-9.388C10.727 7.619 9.918 3 7.25 3c-1.7 0-3.14 2.498-3.755 6.519A2.677 2.677 0 0 1 1 12v-1c1.195 0 1.479-1.473 1.507-1.64C3.223 4.685 4.952 2 7.25 2c3.508 0 4.39 5.04 5.243 9.914.78 4.467 1.589 9.086 4.257 9.086 1.687 0 3.172-2.915 3.876-7.608A2.545 2.545 0 0 1 23 11zm-1 11h1v-1h-1zm-2 0h1v-1h-1zm-7 0h1v-1h-1zm-2 0h1v-1h-1zm-2 0h1v-1H9zm-2 0h1v-1H7zm-2 0h1v-1H5zm-2 0h1v-1H3zm-2 0h1v-1H1z"
          fill="#c67d7f"
        />
        <Path fill="none" d="M0 0h24v24H0z"/>
      </Svg>
    </View>
    <View style={styles.card}>
      <Text style={styles.cardText}>
        Maxim: <Text style={styles.cardValue}>{maxNormal}</Text> BPM
      </Text>
      <Svg width={24} height={24} viewBox="0 0 24 24" style={styles.cardIcon}>
        <Path
          d="M23 11v1c-1.108 0-1.36 1.386-1.385 1.544-.381 2.54-1.62 8.456-4.865 8.456-3.508 0-4.39-5.04-5.243-9.914C10.727 7.619 9.918 3 7.25 3c-1.7 0-3.14 2.498-3.755 6.519A2.677 2.677 0 0 1 1 12v-1c1.195 0 1.479-1.473 1.507-1.64C2.967 6.352 3.85 4.175 5.03 3H5V2h1v.29A2.838 2.838 0 0 1 7.25 2a3.239 3.239 0 0 1 .75.094V2h1v.526c2.095 1.41 2.804 5.452 3.493 9.388.78 4.467 1.589 9.086 4.257 9.086 1.687 0 3.172-2.915 3.876-7.608A2.545 2.545 0 0 1 23 11zM2 2H1v1h1zm2 0H3v1h1zm7 0h-1v1h1zm2 0h-1v1h1zm2 0h-1v1h1zm2 0h-1v1h1zm2 0h-1v1h1zm2 0h-1v1h1zm1 0v1h1V2z"
          fill="#c67d7f"
        />
        <Path fill="none" d="M0 0h24v24H0z" />
      </Svg>
    </View>
    <View style={styles.card}>
      <Text style={styles.cardText}>
        Valoarea medie din ultima oră: <Text style={styles.cardValue}>{avgLastHour}</Text> BPM
      </Text>
      <Svg width={24} height={24} viewBox="0 0 24 24" style={styles.cardIcon}>
        <Path
          d="M4 12c0-1.1.9-2 2-2s2 .9 2 2h8c0-1.1.9-2 2-2s2 .9 2 2v7H4v-7zM2 9h20v2H2V9zm0-4h20v2H2V5z"
          fill="#c67d7f"
        />
      </Svg>
    </View>
<View style={styles.card}>
  <Text style={styles.cardText}>
    Alarme azi:&nbsp;
    {bpm > 0
      ? <Text style={styles.cardValue}>{bpm} BPM!!</Text>
      : <Text style={styles.cardMissing}>nu s-au înregistrat.</Text>
    }
  </Text>
  <Svg width={24} height={24} viewBox="0 0 298.25 298.25" style={styles.cardIcon}>
    <Path
      d="M232.125,149c0-46.116-37.384-83.5-83.5-83.5s-83.5,37.384-83.5,83.5v83.25h167V149z M148.208,118.25
        c-16.956,0-30.75,13.794-30.75,30.75c0,4.143-3.357,7.5-7.5,7.5s-7.5-3.357-7.5-7.5c0-25.227,20.523-45.75,45.75-45.75
        c4.143,0,7.5,3.357,7.5,7.5S152.351,118.25,148.208,118.25z"
      fill="#c67d7f"
    />
    <Path
      d="M249.156,247.25H49.842c-13.496,0-24.717,15.596-24.717,29.097v21.903h248v-21.903
        C273.125,262.846,262.65,247.25,249.156,247.25z"
      fill="#c67d7f"
    />
    <Path
      d="M148.625,50c4.143,0,7.5-3.357,7.5-7.5v-35c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5v35
        C141.125,46.643,144.482,50,148.625,50z"
      fill="#c67d7f"
    />
  </Svg>
</View>
<View style={styles.infoContainer}>
  <Text style={styles.infoTitle}>Alarmele mele</Text>
  {alarms.length === 0 ? (
    <View style={styles.infoRowVertical}>
      <Text style={styles.infoValue}>
        Nu s-a înregistrat vreodată vreo alarmă!
      </Text>
    </View>
  ) : (
    alarms.map((alarm, idx) => (
      <View key={idx} style={styles.infoRow}>
        <Text style={styles.infoLabel}>
          {alarm.date} – {alarm.time}
        </Text>
        <Text style={styles.infoValue}>
          {alarm.value} BPM
        </Text>
      </View>
    ))
  )}
</View>
</View>
  );
};
export default DetaliiAlarma;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    marginTop: Platform.select({ ios: 60, android: 15 }),
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#1C4B82',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C4B82',
    marginLeft: 89,
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    padding: 16,
  },
  chartContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  explanatory: {
    fontSize: 15,
    color: '#333',
    marginTop: 20,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    marginRight: 4,
  },
  highlight: {
    color: '#c67d7f',
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 158,
  },
  card: {
    padding: 15,
    marginBottom: 20,
    width: '95%',
    alignSelf: 'center',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  svgContainer: {
    alignSelf: 'center',
    marginTop: -60,
    marginBottom: -40,
  },
  infoContainer: {
    padding: 20,
    width: '95%',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
    backgroundColor: '#fff',
    margin: 20,
    alignSelf: 'center',
    marginTop: -5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#6d2241',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,75,130,0.3)',
  },
  infoRowVertical: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,75,130,0.3)',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6d2241',
  },
  infoValue: {
    fontSize: 16,
    color: '#6d2241',
  },
  cardText: {
    fontSize: 18,
    color: '#333',
  },
  cardMissing: {
    fontStyle: 'italic',
    color: '#999',
  },
  cardValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  cardIcon: {
    width: 24,
    height: 24,
  },
  heartImage: {
    width: 420,
    height: 210,
    resizeMode: 'contain',
  },
});
