/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Dimensions, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Image, Platform } from 'react-native';
import {VictoryChart, VictoryBar, VictoryTheme, VictoryAxis, VictoryLabel} from 'victory-native';
import FooterNav from '../navigation/FooterNav';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/core';
import Svg, { Rect, Path } from 'react-native-svg';
import { getFitbitDataWithCache, saveFitbitFetchResult } from '../comp/FitbEpuiz';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { Card } from 'react-native-paper';

type RootStackParamList = {
  DetaliiAlarma: undefined;
};
interface DayData {
  x: number;
  y: number | null;
}
interface CachedAlerteData {
  dailyAvgWeek: DayData[];
  hourlyAvgDay: DayData[];
  dayLabels: string[];
  bpmWeek: number | null;
  bpmAzi: number | null;
  maxBPM: number | null;
}

const Alerte: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [dailyAvgWeek, setDailyAvgWeek] = useState<DayData[]>([]);
  const [hourlyAvgDay, setHourlyAvgDay] = useState<DayData[]>([]);
  const [dayLabels, setDayLabels] = useState<string[]>([]);
  const [bpmWeek, setBpmWeek] = useState<number | null>(null);
  const [bpmAzi, setBpmAzi] = useState<number | null>(null);
  const [maxBPM, setmaxBPM] = useState<number | null>(null);
  const CACHE_MINUTES = 15;
  const colorArray = ['#7d7fc6', '#BED0FC', '#74C4C0', '#C4EBE7'];
  const fetchHeartRateData = useCallback(async () => {
    try {
      console.log('ver cache date hr');
      const cacheResult = await getFitbitDataWithCache('alerte_heart_data', CACHE_MINUTES);
      if (!cacheResult.shouldFetch && cacheResult.data) {
        console.log('se fol datele din cache pentru heart rate');
        const cachedData = cacheResult.data as CachedAlerteData;
        setDailyAvgWeek(cachedData.dailyAvgWeek || []);
        setHourlyAvgDay(cachedData.hourlyAvgDay || []);
        setDayLabels(cachedData.dayLabels || []);
        setBpmWeek(cachedData.bpmWeek);
        setBpmAzi(cachedData.bpmAzi);
        setmaxBPM(cachedData.maxBPM);
        return;
      }
      console.log('fara cahce, apel API Fitb');
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('fara token Fitbit');
        return;
      }
      console.log('preluare date saptamanale');
      const weeklyResp = await fetch(
        'https://api.fitbit.com/1/user/-/activities/heart/date/today/7d.json',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const weeklyJson = await weeklyResp.json();
      const arr7 = weeklyJson['activities-heart'] || [];
      arr7.sort((a: any, b: any) => moment(a.dateTime).diff(moment(b.dateTime)));
      const dayLabelsTemp: string[] = [];
      const dailyArray: DayData[] = arr7.map((item: any, idx: number) => {
        let rhr = item?.value?.restingHeartRate;
        if (typeof rhr !== 'number') {
          rhr = null;
        }
        const shortDay = moment(item.dateTime).locale('ro').format('dd');
        dayLabelsTemp.push(shortDay);
        return { x: idx + 1, y: rhr };
      });
      const validVals = dailyArray.filter((d) => d.y !== null).map((d) => d.y as number);
      let tempBpmWeek: number | null = null;
      if (validVals.length > 0) {
        const sum = validVals.reduce((acc, val) => acc + val, 0);
        tempBpmWeek = Math.round(sum / validVals.length);
      }
      console.log('date zilnice: ');
      const dailyResp = await fetch(
        'https://api.fitbit.com/1/user/-/activities/heart/date/today/1d/1min.json',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const dailyJson = await dailyResp.json();
      const dataset = dailyJson['activities-heart-intraday']?.dataset || [];
      const max = dataset.length > 0 ? Math.max(...dataset.map((e: any) => e.value)) : 0;
      setmaxBPM(max);
      const hoursMap: Record<number, number[]> = {};
      dataset.forEach((entry: any) => {
        const hrValue = entry.value as number;
        const hour = parseInt(entry.time.split(':')[0], 10);
        if (!hoursMap[hour]) {
          hoursMap[hour] = [];
        }
        hoursMap[hour].push(hrValue);
      });
      const hourArray: DayData[] = [];
      for (let h = 1; h <= 24; h++) {
        if (hoursMap[h] && hoursMap[h].length) {
          const sum = hoursMap[h].reduce((acc, val) => acc + val, 0);
          const avg = Math.round(sum / hoursMap[h].length);
          hourArray.push({ x: h, y: avg });
        } else {
          hourArray.push({ x: h, y: null });
        }
      }
      const currentHour = new Date().getHours();
      const validHourly = hourArray
        .filter((h) => h.x <= currentHour && h.y !== null)
        .map((h) => h.y as number);
      let tempBpmAzi: number | null = null;
      if (validHourly.length > 0) {
        const sum = validHourly.reduce((acc, val) => acc + val, 0);
        tempBpmAzi = Math.round(sum / validHourly.length);
      }
      setDailyAvgWeek(dailyArray);
      setHourlyAvgDay(hourArray);
      setDayLabels(dayLabelsTemp);
      setBpmWeek(tempBpmWeek);
      setBpmAzi(tempBpmAzi);
      const dataToCache: CachedAlerteData = {
        dailyAvgWeek: dailyArray,
        hourlyAvgDay: hourArray,
        dayLabels: dayLabelsTemp,
        bpmWeek: tempBpmWeek,
        bpmAzi: tempBpmAzi,
        maxBPM: max,
      };
      await saveFitbitFetchResult('alerte_heart_data', dataToCache);
      console.log('date hr salvate- noul cache');
    } catch (error) {
      console.error('err preluare date Fitbit:', error);
    }
  }, [CACHE_MINUTES]);

  useEffect(() => {
    fetchHeartRateData();
  }, [fetchHeartRateData]);

  const { height,  width: windowWidth } = Dimensions.get('window');
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', position: 'relative' },
    scrollContent: { padding: 16, paddingBottom: 50 },
    chartSubtitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: 5,
      textAlign: 'center',
      position: 'relative',
      marginTop: 10,
    },
    grafCard:{
      backgroundColor: '#fff',
      borderRadius: 15,
      elevation: 4,
      marginBottom: 15,
      padding: 3,
      width: '90%',
      alignSelf: 'center',
    },
    alarmsButton: {
      borderRadius: 15,
      borderWidth: 4,
      borderColor: '#BED0FC',
      paddingVertical: 12,
      paddingHorizontal: 10,
      width:'90%',
      alignSelf: 'center',
      marginBottom: 20,
      backgroundColor: '#fff',
    },
    alarmsButtonText: {
      textAlign: 'center',
      fontSize: 15,
      fontWeight: 'bold',
      color: '#1C4B82',
    },
    bataiCard: {
      borderRadius: 15,
      borderWidth: 4,
      borderColor: '#BED0FC',
      alignSelf: 'center',
      padding: 15,
      marginBottom: 10,
      width:'90%',
      backgroundColor: '#fff',
    },
    bataiRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bataiLeft: {
      flexDirection: 'column',
      flex: 1,
    },
    bataiLabelR: {
      fontSize: 14,
      color: '#1C4B82',
      marginBottom: 5,
      fontWeight: 'bold',
      alignSelf:'flex-start',
    },
    bataiLabelL: {
      fontSize: 14,
      color: '#1C4B82',
      marginBottom: 5,
      fontWeight: 'bold',
      alignSelf:'flex-end',
    },
    bataiValue: {
      fontSize: 19,
      fontWeight: 'bold',
      color: '#333',
      textDecorationLine: 'underline',
      alignSelf:'flex-start',
    },
    verticalDivider: {
      width: 3,
      backgroundColor: '#1C4B82',
      marginHorizontal: 20,
      height: 45,
      alignSelf: 'center',
    },
    bataiRight: {
      flexDirection: 'column',
      flex: 1,
    },
    bataiValue2: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      textAlign: 'center',
      alignSelf:'flex-end',
    },
    topLeftImage: {
      flex:1,
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: Platform.OS === 'android' ? 0.15 * height : 0.2 * height,
      resizeMode: 'stretch',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../icons/Jurnal.png')} style={styles.topLeftImage} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.bataiCard}>
          <View style={styles.bataiRow}>
            <View style={styles.bataiLeft}>
              <Text style={styles.bataiLabelR}>Media ultima săptămână</Text>
              <Text style={styles.bataiValue}>
                {bpmWeek !== null ? bpmWeek : '-'}
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.bataiRight}>
              <Text style={styles.bataiValue2}>
                {bpmAzi !== null ? bpmAzi : '-'}
              </Text>
              <Text style={styles.bataiLabelL}>Media azi</Text>
            </View>
          </View>
        </Card>

      <Card style={styles.grafCard}>
        <Text style={styles.chartSubtitle}>
          🫀 Bătăi medii (ultima săptămână)
        </Text>
        <VictoryChart
          theme={VictoryTheme.material}
          domainPadding={{ x: 20, y: 10 }}
          height={250}
          width={windowWidth * 0.9}
          style={{ parent: { marginBottom: 8, marginTop: -15 } }}
        >
          <VictoryAxis
            label="Zile"
            tickValues={[1, 2, 3, 4, 5, 6, 7]}
            tickFormat={(t) => dayLabels[t - 1] || ''}
            style={{
              axisLabel: { padding: 30, fontSize: 13, fill: '#000', fontWeight: '540' },
              tickLabels: { fontSize: 11, fill: '#000' },
            }}
          />
          <VictoryAxis
            dependentAxis
            label="bătăi / min"
            style={{
              axisLabel: { padding: 35, fontSize: 13, fill: '#000', fontWeight: '540' },
              tickLabels: { fontSize: 11, fill: '#000' },
            }}
          />
          <VictoryBar
            data={dailyAvgWeek}
            style={{
              data: {
                fill: (props) => {
                  const i =
                    typeof props.index === 'number' ? props.index : 0;
                  return colorArray[i % colorArray.length];
                },
              },
            }}
            barRatio={0.7}
          />
        </VictoryChart>
        </Card>

        <TouchableOpacity
          style={styles.alarmsButton}
          onPress={() => navigation.navigate('DetaliiAlarma')}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={styles.alarmsButtonText}>
              Alarmele dumneavoastră!
            </Text>
            <Svg
              width={24}
              height={24}
              viewBox="0 0 48 48"
              style={{ marginLeft: 4 }}
            >
              <Rect
                width="48"
                height="48"
                fill="white"
                fillOpacity="0.01"
              />
              <Path
                d="M14 25C14 19.4772 18.4772 15 24 15C29.5228 15 34 19.4772 34 25V41H14V25Z"
                fill="#1C4B82"
                stroke="#000000"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <Path
                d="M24 5V8"
                stroke="#000000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M35.8916 9.32817L33.9632 11.6263"
                stroke="#000000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M42.219 20.2875L39.2645 20.8085"
                stroke="#000000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M5.78104 20.2875L8.73546 20.8084"
                stroke="#000000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12.1084 9.32817L14.0368 11.6263"
                stroke="#000000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M6 41H43"
                stroke="#000000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </TouchableOpacity>

       <Card style={styles.grafCard}>
        <Text style={styles.chartSubtitle}>
          🫀 Bătăi medii (azi)
        </Text>
        <VictoryChart
          theme={VictoryTheme.material}
          domain={{ x: [1, 24], y: [0, maxBPM ?? 150] }}
          domainPadding={{ x: 8, y: 10 }}
          height={250}
          width={windowWidth * 0.9}
          style={{ parent: { marginBottom: 10, marginTop: -15 } }}
        >
          <VictoryAxis
            label="Ore"
            tickValues={[
              1, 2, 3, 4, 5, 6, 7, 8, 9,
              10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
              20, 21, 22, 23, 24,
            ]}
            tickLabelComponent={
              <VictoryLabel angle={-18} textAnchor="end" />
            }
            style={{
              axisLabel: { padding: 30, fontSize: 13, fill: '#000', fontWeight: '540' },
              tickLabels: { fontSize: 8, fill: '#000' },
            }}
          />
          <VictoryAxis
            dependentAxis
            label="bătăi / min"
            tickFormat={(val) => `${val}`}
            style={{
              axisLabel: { padding: 35, fontSize: 13, fill: '#000', fontWeight: '540' },
              tickLabels: { fontSize: 10, fill: '#000' },
            }}
          />
          <VictoryBar
            data={hourlyAvgDay}
            style={{
              data: {
                fill: (props) => {
                  const i =
                    typeof props.index === 'number' ? props.index : 0;
                  return colorArray[i % colorArray.length];
                },
              },
            }}
            barRatio={0.7}
          />
        </VictoryChart>
        </Card>
      </ScrollView>
      <FooterNav />
    </SafeAreaView>
  );

};

export default Alerte;

