/* eslint-disable react-native/no-inline-styles */
import React, { useState, useRef } from 'react';
import {SafeAreaView, StyleSheet, View, TouchableOpacity, Animated,Platform, StatusBar } from 'react-native';
import { Text, Card } from 'react-native-ui-lib';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Calendar} from 'react-native-calendars';
import Svg, {Circle, Path } from 'react-native-svg';
import FooterNav from '../navigation/FooterNav';
import { calculateCaloricData, CaloricData } from '../comp/CalcCal';
import { callFitbitApi } from '../fitbitApi';

type RootStackParamList = {
  HomeScreen: undefined;
  Jurnal: { date: string };
  IstoricKg: undefined;
  LipsaLog: { date: string };
};
const Obiective = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const userId = auth.currentUser?.uid;
  const [varsta, setVarsta] = useState<number>(30);
  const [inaltime, setInaltime] = useState<number>(170);
  const [greutate, setGreutate] = useState<number>(60);
  const [sex, setSex] = useState<'Masculin' | 'Feminin'>('Masculin');
  const [activitate, setActivitate] = useState<string>('sedentar');
  const [obiectiv, setObiectiv] = useState<string>('');
  const [caloriiMancate, setCaloriiMancate] = useState<number>(0);
  const [caloriiArse, setCaloriiArse] = useState<number>(0);
  const [consumedProtein, setConsumedProtein] = useState<number>(0);
  const [consumedFats, setConsumedFats] = useState<number>(0);
  const [consumedCarbs, setConsumedCarbs] = useState<number>(0);
  const [caloricData, setCaloricData] = useState<CaloricData | null>(null);
  const [zileLogate, setZileLogate] = useState<{ [key: string]: { marked: boolean; dotColor: string } }>({});
  const [fallbackCaloricNeed] = useState<number>(2000);
  const scrollY = useRef(new Animated.Value(0)).current;
useFocusEffect(
  React.useCallback(() => {
    if (!userId) {
      return;
    }
    const fetchData = async () => {
      try {
        const chRef = doc(db, 'Chestionar', userId);
        const chSnap = await getDoc(chRef);
        let baseWeight = 65;
        if (chSnap.exists()) {
          const d = chSnap.data();
          setVarsta(   Number(d['10']) || 30 );
          setInaltime( Number(d['3'])  || 170 );
          setSex(
            (d['1'] || 'Masculin')
              .toString()
              .toLowerCase()
              .includes('fem')
              ? 'Feminin'
              : 'Masculin'
          );
          setActivitate( d['5'] || 'sedentar' );
          setObiectiv(   d['6'] || 'Menținere' );
          baseWeight = Number(d['4']) || 65;
        }
        const mRef = doc(db, 'health_metrics', userId);
        const mSnap = await getDoc(mRef);
        let displayWeight = baseWeight;

        if (mSnap.exists()) {
          const { weight_history = [] } = mSnap.data() as {
            weight_history?: { date: any; weight: number }[];
          };
          if (weight_history.length > 0) {
            displayWeight = weight_history[weight_history.length - 1].weight;
          }
        }
        setGreutate(displayWeight);
      } catch (err) {
        console.error('err- preluarea datelor:', err);
      }
    };
    fetchData();
  }, [userId])
);

  useFocusEffect(React.useCallback(() => {
    if (!userId) {return;}
    const todayStr = new Date().toISOString().split('T')[0];
    const docId = `${userId}_${todayStr}`;
    const updateActivityLog = async () => {
      try {
        const dailyCals = await getFitbitDailyCaloriesFormula();
        await setDoc(
          doc(db, 'activity_logs', docId),
          {
            uid: userId,
            date: todayStr,
            calories_burned: dailyCals,
          },
          { merge: true }
        );
      } catch (err) {
        console.error('err- actualizarea caloriilor Fitbit:', err);
      }
    };
    const fetchActivity = async () => {
      try {
        const activitySnap = await getDoc(doc(db, 'activity_logs', docId));
        if (activitySnap.exists()) {
          const activityData = activitySnap.data();
          setCaloriiMancate(activityData?.total_calories || 0);
          setCaloriiArse(activityData?.calories_burned || 0);
        }
      } catch (error) {
        console.error('err- preluarea datelor din activity_logs:', error);
      }
    };
    const fetchNutritionLog = async () => {
      try {
        const nutritionRef = doc(db, 'nutrition_logs', docId);
        const nutritionSnap = await getDoc(nutritionRef);
        if (!nutritionSnap.exists()) {
          await setDoc(nutritionRef, {
            uid: userId,
            date: todayStr,
            total_calories: 0,
            total_carbs: 0,
            total_fats: 0,
            total_protein: 0,
            water_intake_ml: 0,
          });
          setConsumedProtein(0);
          setConsumedFats(0);
          setConsumedCarbs(0);
        } else {
          const nutritionData = nutritionSnap.data();
          setConsumedProtein(nutritionData?.total_protein || 0);
          setConsumedFats(nutritionData?.total_fats || 0);
          setConsumedCarbs(nutritionData?.total_carbs || 0);
          if (nutritionData?.total_calories) {
            setCaloriiMancate(nutritionData.total_calories);
          }
        }
      } catch (error) {
        console.error('err- preluarea datelor nutrition_logs:', error);
      }
    };

    (async () => {
      await updateActivityLog();
      await fetchActivity();
      await fetchNutritionLog();
    })();
  }, [userId]));
  useFocusEffect(React.useCallback(() => {
    if (varsta && inaltime && greutate && sex && activitate && obiectiv) {
      const input = {
        weight: greutate,
        height: inaltime,
        age: varsta,
        sex,
        activityLevel: activitate,
        totalCaloriesEaten: caloriiMancate,
        totalCaloriesBurned: caloriiArse,
        goal: obiectiv,
        consumedProtein,
        consumedFats,
        consumedCarbs,
      };
      const result = calculateCaloricData(input);
      setCaloricData(result);
    }
  }, [
    varsta, inaltime, greutate, sex, activitate, obiectiv,
    caloriiMancate, caloriiArse, consumedProtein, consumedFats, consumedCarbs,
  ]));
  const currentCaloricNeed = caloricData?.adjustedCaloricNeed ?? fallbackCaloricNeed;
  const caloriesLeft = caloricData?.caloriesLeft ?? fallbackCaloricNeed;
  const totalBudget = currentCaloricNeed + caloriiArse;
  const consumFraction = totalBudget > 0 ? caloriiMancate / totalBudget : 0;
  useFocusEffect(React.useCallback(() => {
    setZileLogate({});
  }, []));

  const handleDayPress = async (day: { dateString: string }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const pressedDate = new Date(day.dateString); pressedDate.setHours(0, 0, 0, 0);

    if (pressedDate.getTime() > today.getTime()) {
    }
    if (pressedDate.getTime() === today.getTime()) {
      navigation.navigate('Jurnal', { date: day.dateString });
      return;
    }
    try {
      const docId = `${userId}_${day.dateString}`;
      const nutritionRef = doc(db, 'nutrition_logs', docId);
      const nutritionSnap = await getDoc(nutritionRef);

      if (nutritionSnap.exists()) {
        navigation.navigate('Jurnal', { date: day.dateString });
      } else {
        navigation.navigate('LipsaLog', { date: day.dateString });
      }
    } catch (error) {
      console.error('err- verificarea logului:', error);
    }
  };
  const imageTranslate = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -100],
    extrapolate: 'clamp',
  });
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const renderMacroBar = (label: string, consumedValue: number, totalValue: number, barColor: string) => {
    const percent = totalValue > 0 ? (consumedValue / totalValue) * 100 : 0;
    return (
      <View style={styles.macroItem}>
        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={styles.macroValue}>{consumedValue}g / {totalValue}g</Text>
        </View>
        <View style={styles.macroBar}>
          <View style={[styles.macroBarFill, { width: `${percent}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.Image
        source={require('../icons/procreate_element.png')}
        style={[
          styles.topLeftImage,
          {
            transform: [{ translateY: imageTranslate }],
            opacity: imageOpacity,
          },
        ]}
      />

      <View style={styles.wrapper}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollInner}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false, listener: () => {} }
          )}
          scrollEventThrottle={16}
        >
          <Card style={styles.goalCard}>
            <View style={styles.goalRow}>
              <View style={styles.goalLeft}>
                <Text style={styles.goalLabel}>Obiectiv setat</Text>
                <Text style={styles.goalValue}>{obiectiv.toLowerCase()}</Text>
              </View>
              <View style={styles.verticalDivider} />
              <TouchableOpacity style={styles.goalRight} onPress={() => navigation.navigate('IstoricKg')}>
                <Text style={styles.weightValue}>{greutate} kg</Text>
                <Text style={styles.weightDate}>Ultima înregistrare</Text>
              </TouchableOpacity>
            </View>
          </Card>
          <Card style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.cardTitle}>Calendar alimentar</Text>
              <Svg
                fill="#000000"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                style={{ marginLeft: 4, marginTop: -13 }}
              >
                <Path
                  d="M10,9h4m-4,4h4"
                  fill="none"
                  stroke="#666"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
                <Path
                  d="M7,5H18V21H7a1,1,0,0,1-1-1V6A1,1,0,0,1,7,5ZM18,5,9.2,3A1,1,0,0,0,8,4.12V5Z"
                  fill="none"
                  stroke="#1C4B82"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </Svg>
            </View>
            <Calendar
              current={new Date().toISOString().split('T')[0]}
              markedDates={zileLogate}
              theme={{
                todayTextColor: '#0059a9',
                arrowColor: '#0059a9',
              }}
              onDayPress={handleDayPress}
            />
          </Card>
          <Card style={styles.caloriesCard}>
            <Text style={styles.cardTitle}>
              Necesar caloric zilnic: {Math.round(currentCaloricNeed)} kcal
            </Text>
            <View style={styles.caloriesRow}>
              <View style={styles.caloriesBlock}>
                <Text style={styles.smallLabel}>mâncate</Text>
                <Text style={styles.kcalValue}>{caloriiMancate} kcal</Text>
              </View>
              <View style={styles.circleContainer}>
                <Svg height={120} width={120}>
                  <Circle
                    cx="60"
                    cy="60"
                    r={50}
                    stroke="#ECECEC"
                    strokeWidth={10}
                    fill="none"
                  />
                  <Circle
                    cx="60"
                    cy="60"
                    r={50}
                    stroke="#5B96DC"
                    strokeWidth={10}
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${(1 - consumFraction) * 2 * Math.PI * 50}`}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <Text style={styles.circleText}>
                  {Math.max(0, Math.round(caloriesLeft))} kcal
                </Text>
              </View>

              <View style={styles.caloriesBlock}>
                <Text style={styles.smallLabel}>arse</Text>
                <Text style={styles.kcalValue}>{caloriiArse} kcal</Text>
              </View>
            </View>
            <View style={styles.macrosContainer}>
              {renderMacroBar('proteine', consumedProtein, caloricData?.dailyProtein || 0, '#BED0FC')}
              {renderMacroBar('grăsimi', consumedFats, caloricData?.dailyFats || 0, '#C4EBE7')}
              {renderMacroBar('carbohidrați', consumedCarbs, caloricData?.dailyCarbs || 0, '#74C4C0')}
            </View>
          </Card>
        </Animated.ScrollView>
        <View style={styles.footerFix}>
          <FooterNav />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Obiective;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  topLeftImage: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: Platform.select({ ios: 400, android: 420 }),
    height: 300,
    resizeMode: 'contain',
  },
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 20, android: -10 }),
    paddingBottom: 120,
  },
  footerFix: {
    position: 'absolute',
    bottom: Platform.select({
      ios: -34,
      android: 0,
    }),
    left: 0,
    right: 0,
  },

  goalCard: {
    padding: 15,
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
    width:'93%',
    alignSelf:'center',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLeft: {
    flexDirection: 'column',
    maxWidth: '48%',
    marginLeft: -8,
  },
  goalLabel: {
    fontSize: 16,
    color: '#1C4B82',
    marginBottom: 3,
    marginLeft: 5,
    fontWeight: '700',
  },
  goalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textDecorationLine: 'underline',
    marginLeft: 5,
    flexShrink: 1,
    textAlign: 'left',
  },
  verticalDivider: {
    width: 2,
    backgroundColor: '#1C4B82',
    marginHorizontal: 20,
    height: 40,
    marginLeft: 40,
  },
  goalRight: {
    alignItems: 'flex-end',
  },
  weightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weightDate: {
    fontSize: 14,
    color: '#1C4B82',
    fontWeight: 'bold',
  },

  card: {
    padding: 15,
    marginBottom: 20,
    width:'95%',
    alignSelf:'center',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C4B82',
    marginBottom: 10,
    textAlign: 'center',
  },
  caloriesCard: {
    padding: 15,
    width:'95%',
    alignSelf:'center',
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#BED0FC',
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caloriesBlock: {
    alignItems: 'center',
    width: 80,
  },
  smallLabel: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 3,
    textAlign: 'center',
  },
  kcalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B96DC',
    textAlign: 'center',
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C4B82',
  },
  macrosContainer: {
    marginTop: 20,
  },
  macroItem: {
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  macroLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  macroBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: 8,
    borderRadius: 4,
  },
});

async function getFitbitDailyCaloriesFormula(): Promise<number> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('user neaut');
    return 0;
  }
  const userDocRef = doc(db, 'user', currentUser.uid);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) {
    console.log('nu ex doc user/<uid>');
    return 0;
  }
  const userData = userDocSnap.data();
  const token = userData?.tokenFitbit;
  if (!token) {
    console.log('nu ex tokenFitbit- user/<uid>');
    return 0;
  }
  let weight: number | null = null;
  try {
    const metricsRef = doc(db, 'health_metrics', currentUser.uid);
    const metricsSnap = await getDoc(metricsRef);
    if (metricsSnap.exists()) {
      const { weight_history = [] } = metricsSnap.data() as {
        weight_history?: { date: any; weight: number }[];
      };
      if (weight_history.length > 0) {
        weight = Number(weight_history[weight_history.length - 1].weight);
      }
    }
  } catch (err) {
    console.error('err- preluarea weight_history:', err);
  }
  let age: number;
  let gender: number;
  if (weight === null) {
    const chestionarRef = doc(db, 'Chestionar', currentUser.uid);
    const chestionarSnap = await getDoc(chestionarRef);
    if (!chestionarSnap.exists()) {
      console.error('chestionar nu ex, nu se poate calcula');
      return 0;
    }
    const cData = chestionarSnap.data();
    weight = Number(cData['4']);
    age    = Number(cData['10']);
    const sRaw = cData['1'] || 'Masculin';
    gender    = sRaw.toLowerCase().includes('masc') ? 1 : 0;
  } else {
    const chestionarRef = doc(db, 'Chestionar', currentUser.uid);
    const chestionarSnap = await getDoc(chestionarRef);
    if (!chestionarSnap.exists()) {
      console.error('chestionar nu ex, nu se poate afla varsta/sex');
      return 0;
    }
    const cData = chestionarSnap.data();
    age    = Number(cData['10']);
    const sRaw = cData['1'] || 'Masculin';
    gender    = sRaw.toLowerCase().includes('masc') ? 1 : 0;
  }
  const hrMax   = 220 - age;
  const hrStart = 0.65 * hrMax;
  console.log(`verif praguri HR: HRmax=${hrMax}, HRstart=${hrStart}`);
  try {
    const hrJson = await callFitbitApi('/1/user/-/activities/heart/date/today/1d/1min.json');
    const dataset = hrJson['activities-heart-intraday']?.dataset;
    if (!dataset || dataset.length === 0) {
      console.log('nu ex date hr intraday/ a epuiz comp');
      return 0;
    }
    let totalKcal = 0;
    for (const entry of dataset) {
      const hr = entry.value as number;
      if (hr >= hrStart!) {
        const kJ = gender * (
          -55.0969 + 0.6309 * hr + 0.1988 * weight! + 0.2017 * age!
        ) + (1 - gender) * (
          -20.4022 + 0.4472 * hr - 0.1263 * weight! + 0.074 * age!
        );
        totalKcal += kJ * 0.239;
      }
    }
    const finalCals = Math.round(totalKcal);
    console.log('cal calc dupa HRstart:', finalCals);
    return finalCals;
  } catch (err) {
    console.error('err dataset HR:', err);
    return 0;
  }
}
