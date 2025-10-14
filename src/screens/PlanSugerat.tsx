/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,Dimensions, Alert, ScrollView, Platform, ImageBackground} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query,where, getDocs, doc, setDoc, updateDoc, increment, getDoc} from 'firebase/firestore';
import {WebView} from 'react-native-webview';
import Svg, {G, Path, Circle} from 'react-native-svg';
import { auth, db} from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { callFitbitApi } from '../fitbitApi';


type UserLevel = 'Incepator' | 'Intermediar' | 'Avansat';
interface Exercise {
  name: string;
  category: string;
  difficulty: UserLevel;
  equipment: string;
  muscle_group?: string[];
  video_url: string;
}
const { height } = Dimensions.get('window');
const { width } = Dimensions.get('window');
const CompSVG = () => (
<Svg viewBox="0 0 459.479 459.479" width={height * 0.2} height={height * 0.2}>
<G>
	<Circle cx="289.434" cy="39.317" r="39.308" fill="#FFB578"/>
	<Path id="XMLID_318_" d="M351.571,211.561L298,189.5l-12.398-62.481l22.567,46.593l11.505-46.84
		c3.098-12.614-4.616-25.352-17.23-28.451l-51.88-12.744c-12.614-3.099-25.352,4.616-28.451,17.23l-36.495,148.575L99.505,430.821
		c-4.779,9.958-0.581,21.905,9.378,26.685c9.97,4.783,21.909,0.572,26.685-9.378l79.642-165.951
		c1.442,0.435-5.121-0.999,93.542,19.934v137.363c0,11.046,8.954,20,20,20s20-8.954,20-20V285.909
		c0-9.446-6.609-17.604-15.849-19.564l-45.157-9.581l3.987-16.229l-20.913-8.612c-13.782-5.676-20.284-19.398-19.997-27.654
		l2.379-68.438l13.69,68.996c1.089,5.485,4.849,10.086,10.051,12.227l61.874,25.48c7.833,3.225,16.987,0.085,21.094-7.512
		C364.726,226.108,360.63,215.292,351.571,211.561z" fill="#1C4B82"/>
</G>
</Svg>);

const SVGhigh = () => (
  <Svg
    viewBox="0 0 512 512"
    width={40}
    height={40}
  >
    <Path
      fill="#FF9300"
      d="M256,93.806c89.579,0,162.194,72.616,162.194,162.194S345.579,418.194,256,418.194
         c-89.576,0-162.194-72.616-162.194-162.194S166.424,93.806,256,93.806L256,93.806z"
    />
    <Path
      fill="#FF7B00"
      d="M418.194,256c0,89.577-72.616,162.194-162.194,162.194c-69.256,0-128.363-43.412-151.622-104.505
         c23.256,12.881,50.005,20.224,78.472,20.224c89.578,0,162.194-72.616,162.194-162.194c0-20.321-3.748-39.763-10.573-57.689
         C384.393,141.683,418.194,194.889,418.194,256z"
    />
    <Path
      fill="#F49919"
      d="M38.957,266.017H10.017C4.484,266.017,0,261.533,0,256c0-5.533,4.484-10.017,10.017-10.017h28.939
         c5.533,0,10.017,4.484,10.017,10.017C48.974,261.533,44.489,266.017,38.957,266.017z M73.016,138.785L47.98,124.331
         c-4.792-2.766-10.918-1.124-13.684,3.666c-2.766,4.792-1.124,10.918,3.666,13.685l25.036,14.454c1.577,0.91,3.3,1.343,5,1.343
         c3.462,0,6.83-1.796,8.685-5.01C79.448,147.679,77.807,141.552,73.016,138.785z M474.037,370.317l-25.036-14.454
         c-4.792-2.766-10.918-1.124-13.684,3.666c-2.766,4.792-1.124,10.918,3.666,13.684l25.036,14.454c1.577,0.91,3.3,1.343,5,1.343
         c3.462,0,6.83-1.796,8.685-5.01C480.47,379.211,478.829,373.083,474.037,370.317z M138.789,73.017
         c1.855,3.213,5.222,5.009,8.684,5.009c1.7,0,3.423-0.433,5.001-1.345c4.791-2.767,6.431-8.893,3.665-13.684L141.68,37.963
         c-2.767-4.791-8.894-6.431-13.684-3.664c-4.791,2.767-6.431,8.893-3.665,13.684L138.789,73.017z M373.212,438.984
         c-2.766-4.791-8.892-6.431-13.684-3.665c-4.791,2.766-6.432,8.893-3.665,13.684l14.455,25.035c1.855,3.213,5.222,5.01,8.684,5.01
         c1.7,0,3.423-0.433,5-1.345c4.791-2.766,6.432-8.893,3.665-13.684L373.212,438.984z M62.998,355.863l-25.036,14.454
         c-4.792,2.766-6.432,8.893-3.666,13.684c1.855,3.213,5.222,5.01,8.685,5.01c1.7,0,3.423-0.433,5-1.343l25.035-14.453
         c4.792-2.766,6.432-8.893,3.666-13.684C73.917,354.739,67.789,353.099,62.998,355.863z M444.002,157.48c1.7,0,3.423-0.433,5-1.343
         l25.036-14.454c4.792-2.766,6.432-8.893,3.666-13.685c-2.766-4.791-8.893-6.431-13.684-3.666l-25.036,14.454
         c-4.792,2.766-6.432,8.893-3.666,13.684C437.172,155.684,440.54,157.48,444.002,157.48z"
    />
    <Path
      fill="#1C4B82"
      d="M307.288,280.925c-9.834,14.767-42.25,63.451-46.516,69.95c-1.923,2.93-5.121,4.521-8.383,4.521
         c-1.887,0-3.793-0.532-5.488-1.645c-4.625-3.036-5.912-9.247-2.876-13.872c3.262-4.968,22.721-34.209,36.222-54.49h-46.462
         c-13.735-0.106-24.523-0.189-29.157-8.86c-4.588-8.583,1.494-17.844,7.934-27.649c4.217-6.427,29.668-44.668,45.049-67.771
         l-31.228,6.162c-5.424,1.074-10.695-2.46-11.767-7.888c-1.071-5.427,2.461-10.696,7.888-11.767l54.842-10.822
         c5.425-1.071,10.695,2.461,11.767,7.888l10.822,54.841c1.071,5.428-2.46,10.696-7.888,11.767c-0.654,0.129-1.308,0.191-1.951,0.191
         c-4.687,0-8.875-3.307-9.817-8.08l-6.118-31.002c-15.38,23.101-40.674,61.107-44.852,67.474c-1.336,2.034-2.463,3.802-3.38,5.304
         c3.063,0.138,6.353,0.164,7.934,0.177l65.087-0.001c3.693,0,7.088,2.032,8.831,5.288C309.524,273.9,309.334,277.851,307.288,280.925
         z"
    />
  </Svg>
);

const SVGmed = () => (
  <Svg viewBox="0 0 20 20" width={40} height={40}>
    <G>
      <Path
        fill="#1C4B82"
        d="M0,5 L0,15 L19,15 L19,12.5 L20,11.5 L20,8.5 L19,7.5 L19,5 L0,5 Z
           M1,6 L18,6 L18,8 L19,9 L19,11 L18,12 L18,14 L1,14 L1,6 Z
           M2,7 L2,13 L3,13 L3,7 Z
           M4,7 L4,13 L5,13 L5,7 Z
           M6,7 L6,13 L7,13 L7,7 Z
           M8,7 L8,13 L9,13 L9,7 Z"
      />
    </G>
  </Svg>
);

const SVGslab = ()=> (
<Svg viewBox="0 0 60.964 60.964" width={40} height={40}>
    <Path
      fill="#1C4B82"
      d="M28.639,4.168C17.696,6.194,10.05,16.3,10.709,27.413
         c0.012,0.205,0.037,0.398,0.064,0.593
         c-0.401,1.993,0.356,4.349,2.734,5.31
         c3.796,1.537,8.127,3.883,9.561,7.989
         c1.534,4.397-1.79,9.084-4.471,12.228
         c-3.54,4.15,2.451,10.201,6.02,6.021
         c4.831-5.667,8.262-12.039,6.884-19.653
         c-0.039-0.209-0.099-0.408-0.146-0.612
         c0.328-0.466,0.567-1.021,0.64-1.692
         c0.883-8.227,3.199-16.207,4-24.446
         c0.651-1.4,0.852-3.021,0.461-4.465
         C35.502,5.121,32.06,3.535,28.639,4.168z"
    />
    <Circle fill="#e3b47d" cx={43.627} cy={6.667} r={6.667} />
  </Svg>
);


const PlanSugerat: React.FC = () => {
  const navigation = useNavigation<any>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingPause, setPendingPause] = useState(false);
  const [enLevel, setEnLevel] = useState<'mare' | 'mediu' | 'scazut'| null>(null);
  const [raspAzi, setRaspAzi] = useState(false);
  const [selectedEnergy, setSelectedEnergy] = useState<'mare' | 'mediu' | 'scazut' | null>(null);
  const userId = auth.currentUser?.uid;
  const getYoutubeVideoId = (url: string): string => {
    const rgx = /(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/embed\/)([^"&?\\/\s]+)/;
    const match = url.match(rgx);
    return match ? match[1] : '';
  };
  const currentExercise = exercises.length > 0 ? exercises[currentIndex] : null;
  const videoId = currentExercise ? getYoutubeVideoId(currentExercise.video_url) : '';
  const html = `
    <html>
      <body style="margin:0;padding:0;">
        <iframe 
          width="100%" 
          height="100%" 
          src="https://www.youtube.com/embed/${videoId}?controls=1&autoplay=0" 
          frameborder="0" 
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;

  const [nivel, setNivel] = useState<UserLevel>('Incepator');
  const [loading, setLoading] = useState(true);
  const videoWidth = width * 0.98;
  const videoHeight = (videoWidth * 0.7);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastUpdate = await AsyncStorage.getItem('ultima_zi_exercitii');
      const stored = await AsyncStorage.getItem('exercitii_azi');
      if (lastUpdate === today && stored) {
        const cached = JSON.parse(stored);
        if (Array.isArray(cached) && cached.length > 0) {
          setExercises(cached);
          setLoading(false);
          return;
        }}
        {
        await AsyncStorage.setItem('ultima_zi_exercitii', today);
        const exSnap = await getDocs(collection(db, 'exercises'));
        const all = exSnap.docs.map(d => d.data() as Exercise);
        const totalEx = await sumUserExercisesLast7Days(userId!);
        const totalCals = await getFitbitWeeklyCalories();
        const userLevel = computeLevel(totalEx, totalCals);
        setNivel(userLevel);
        let cate = 0;
        if (enLevel === 'mare') {
          cate = userLevel === 'Incepator' ? 10 : userLevel === 'Intermediar' ? 17 : 25;
        }
        else if (enLevel === 'mediu') {
          cate = userLevel === 'Incepator' ? 7 : userLevel === 'Avansat' ? 20 : 15;
        }
        else if (enLevel === 'scazut') {
          cate = userLevel === 'Incepator' ? 5 : userLevel === 'Intermediar' ? 10 : 15;
        }
        let filtered = all.filter(
          ex => ex.difficulty.toLowerCase() === userLevel.toLowerCase()
        );
        if (filtered.length < cate) {
          filtered = all;
        }
        function pickRandom<T>(arr: T[], n: number): T[] {
          if (n <= 0) {return [];}
          if (arr.length <= n) {return [...arr];}
          return [...arr]
            .sort(() => 0.5 - Math.random())
            .slice(0, n);
        }
        const finalList = pickRandom(filtered, cate);
        await AsyncStorage.setItem('exercitii_azi', JSON.stringify(finalList));
        setExercises(finalList);
      }
    } catch (err) {
      console.error('err- preluarea ex din db exercices:', err);
      Alert.alert('Eroare!', 'Nu s-au putut prelua exercițiile sugerate!');
    } finally {
      setLoading(false);
    }
  }, [userId, enLevel]);

  useEffect(() => {
    const checkEn = async () => {
      if (!userId) {return;}
      const today = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'health_metrics', userId, 'daily', today);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (['mare', 'mediu', 'scazut'].includes(data.energyLevel)) {
          setEnLevel(data.energyLevel as 'mare' | 'mediu' | 'scazut');
          setRaspAzi(true);
        } else {
          setEnLevel(null);
          setRaspAzi(false);
        }
      }
    };
    checkEn();
  }, [userId]);

  useEffect(() => {
    if (!userId || enLevel === null) {
      setLoading(false);
      return;}
    fetchPlan();
  }, [enLevel, fetchPlan, userId]);
  const handleLogExercise = async (_exercise: Exercise) => {
    if (!userId) {
      Alert.alert('Eroare', 'Trebuie să fii logat pentru a loga exercițiul');
      return;
    }
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const docId = `${userId}_${todayStr}`;
      await setDoc(
        doc(db, 'activity_logs', docId),
        { uid: userId, date: todayStr, daily_exercitii: increment(1) },
        { merge: true }
      );
      await updateDoc(doc(db, 'activity_logs', docId), {
        total_exercices: increment(1),
      });
    } catch (error) {
      console.error('err- logare ex:', error);
    }
  };
  const Energie = async (level: 'mare'|'mediu'|'scazut') => {
    console.log('[Energie] level=', level, ' userId=', userId);
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('niv scris in', `health_metrics/${userId}/daily/${today}`);
      await setDoc(
        doc(db, 'health_metrics', userId!, 'daily', today),
        { energyLevel: level, date: today },
        { merge: true }
      );
      console.log('s-a scris ok in uid/daily');
    } catch (e) {
      console.error('nu a mers-', e);
    }
    setLoading(true);
    setEnLevel(level);
    setRaspAzi(true);
  };
  const handlePrev = () => {
    if (currentIndex === 0) {
      navigation.navigate('HomeScreen');
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  };
  const handleNext = async () => {
    const current = exercises[currentIndex];
    await handleLogExercise(current);
    if (currentIndex === exercises.length - 1) {
      navigation.push('HomeScreen');
    } else {
      setCurrentIndex(prev => prev + 1);
      setPendingPause(true);
    }
  };
  useEffect(() => {
    if (!pendingPause) {return;}
    setPendingPause(false);
    navigation.push('Pauza');
  }, [pendingPause, navigation]);
  let nivelAfisat = '';
  if (nivel === 'Incepator') {
    nivelAfisat = 'începător';
  }
  if (nivel === 'Intermediar') {
    nivelAfisat = 'intermediar';
  }
  if (nivel === 'Avansat') {
    nivelAfisat = 'avansat';
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    containerRelative: {
      flex: 1,
       marginTop: Platform.OS === 'ios' ? -10 : 0,
      position: 'relative',
    },
    scrollContent: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    header: {
      marginTop: Platform.select({ ios: -15, android: -10 }),
      width: '100%',
      borderBottomColor: '#1C4B82',
      borderBottomWidth: 1,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1C4B82',
    },
    loadingText: {
      fontSize: 14,
      color: '#666',
      marginTop: 30,
    },
    videoWrapper: {
      alignItems: 'center',
      marginTop: 9,
    },
    exName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1C4B82',
      textAlign: 'center',
      width: width * 0.98,
      marginBottom: 20,
      marginTop: 25,
    },
    navButtons: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 10,
      elevation: 10,
    },
    navButtons2: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 10,
      elevation: 10,
    },
    navBtn: {
      backgroundColor: '#BED0FC',
      borderRadius: 15,
      borderWidth: 4,
      borderColor: '#1C4B82',
      paddingVertical: 17,
      paddingHorizontal: 38,
    },
    navBtnTxt: {
      color: '#1C4B82',
      fontWeight: 'bold',
      fontSize: 16,
    },
    questionContainer: {
      marginTop: Platform.select({ ios: 40, android: 45 }),
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    questionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 24,
      color: '#1C4B82',
    },
    answerCard: {
      width: '90%',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderWidth: 2,
      borderRadius: 15,
      elevation: 4,
      backgroundColor: '#fff',
      marginBottom: 16,
    },
    submitTxt: {
      color: '#1C4B82',
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: 16,
    },
    answerText: {
      flex: 1,
      textAlign: 'center',
      fontWeight: 'bold',
      color: '#1C4B82',
    },
    submitContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 16,
    },
    navBtnDisabled: {
      opacity: 0.5,
    },
  });


  return (
    <ImageBackground
      source={require('../icons/gymm.jpg')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.containerRelative}>
        {!raspAzi ? (
          <><View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>Cum vă simțiți astăzi?😌</Text>

            <TouchableOpacity
            style={[
              styles.answerCard,
              { borderColor: selectedEnergy === 'mare' ? '#FF9300' : '#ccc' },
            ]}
            onPress={() => setSelectedEnergy('mare')}
          >
            <SVGhigh />
            <Text style={styles.answerText}>Plin de energie!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.answerCard,
              { borderColor: selectedEnergy === 'mediu' ? '#305f96' : '#ccc' },
            ]}
            onPress={() => setSelectedEnergy('mediu')}
          >
            <SVGmed />
            <Text style={styles.answerText}>Așa și-așa…</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.answerCard,
              { borderColor: selectedEnergy === 'scazut' ? '#e3b47d' : '#ccc' },
            ]}
            onPress={() => setSelectedEnergy('scazut')}
          >
            <SVGslab />
            <Text style={styles.answerText}>Nu prea am energie azi…</Text>
          </TouchableOpacity>
          </View><View style={styles.submitContainer}>
              <TouchableOpacity onPress={handlePrev} style={styles.navBtn}>
                <Text style={styles.navBtnTxt}>← Înapoi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, !selectedEnergy && styles.navBtnDisabled]}
                disabled={!selectedEnergy}
                onPress={() => {
                  Energie(selectedEnergy!);
                  setSelectedEnergy(null);
                } }
              >
                <Text style={styles.submitTxt}>Trimite</Text>
              </TouchableOpacity>
            </View></>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  Sugestii exerciții – nivel actual: {nivelAfisat}
                </Text>
              </View>

              {loading ? (
                <Text style={styles.loadingText}>Se încarcă…</Text>
              ) : !currentExercise ? (
                <Text style={styles.loadingText}>Nu s-a găsit niciun exercițiu.</Text>
              ) : (
                <View style={styles.videoWrapper}>
                  <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    javaScriptEnabled
                    style={{
                      width: videoWidth,
                      height: videoHeight,
                      borderRadius: 8,
                    }}
                  />
                  <Text style={styles.exName}>{currentExercise.name}</Text>
                  <CompSVG />
                </View>
              )}
            </ScrollView>

            {currentExercise && !loading && (
              <View style={styles.navButtons}>
                <TouchableOpacity onPress={handlePrev} style={styles.navBtn}>
                  <Text style={styles.navBtnTxt}>← Înapoi</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
                  <Text style={styles.navBtnTxt}>Înainte →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
async function sumUserExercisesLast7Days(uid: string): Promise<number> {
  const ms7 = 7 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - ms7).toISOString().split('T')[0];
  const q = query(
    collection(db, 'activity_logs'),
    where('uid', '==', uid),
    where('date', '>=', cutoff)
  );
  const snap = await getDocs(q);
  let total = 0;
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (typeof data.total_exercices === 'number') {
      total += data.total_exercices;
    }
  });
  return total;
}
};
async function getFitbitWeeklyCalories(): Promise<number> {
  const token = '';
  if (!token) {
    return 0;
  }
  try {
    const data = await callFitbitApi('/1/user/-/activities/calories/date/today/7d.json');
    let sum = 0;
    if (data['activities-calories']) {
      for (const day of data['activities-calories']) {
        sum += parseInt(day.value || '0', 10);
      }
    }
    return sum;
  } catch {
    return 0;
  }
}
function computeLevel(exCount: number, cals: number): UserLevel {
  let lvl: UserLevel = 'Incepator';
  if (exCount > 70 && cals > 2000) {
    lvl = 'Intermediar';
    if (exCount > 140 && cals > 5000) {
      lvl = 'Avansat';
    }
  }
  if (lvl === 'Avansat' && (exCount < 100 || cals < 3000)) {
    lvl = 'Intermediar';
  }
  if (lvl === 'Intermediar' && exCount < 50 && cals < 1500) {
    lvl = 'Incepator';
  }
  return lvl;
}

export default PlanSugerat;
