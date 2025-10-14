/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState, useCallback } from 'react';
import {View, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity,Platform, Dimensions } from 'react-native';
import { Card, Text } from 'react-native-ui-lib';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import ButonInapoi from '../comp/ButonInapoi';
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg';
import { VictoryChart, VictoryLine,VictoryScatter, VictoryTheme, VictoryAxis} from 'victory-native';

interface WeightEntry {
  date: Timestamp;
  weight: number | null;
}
const IstoricKg = () => {
  const userId = auth.currentUser?.uid;
  const [initialWeight, setInitialWeight] = useState<number>(0);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [graphData, setGraphData] = useState<{ x: number; y: number | null }[]>([]);
  const [newWeight, setNewWeight] = useState<string>('');
  const {width: windowWidth } = Dimensions.get('window');
  useEffect(() => {
    if (!userId) {return;}
    const fetchInitial = async () => {
      try {
        const chRef = doc(db, 'Chestionar', userId);
        const chSnap = await getDoc(chRef);
        if (chSnap.exists()) {
          const d = chSnap.data();
          const g = Number(d['4']) || 0;
          setInitialWeight(g);
        }
      } catch (err) {
        console.error('err- preluarea greut init:', err);
      }
    };
    fetchInitial();
  }, [userId]);
  useEffect(() => {
    if (!userId) {return;}
    const fetchWeights = async () => {
      try {
        const ref = doc(db, 'health_metrics', userId);
        const snap = await getDoc(ref);
        let w: WeightEntry[] = snap.exists() && Array.isArray(snap.data().weight_history)
        ? (snap.data().weight_history as WeightEntry[])
        : [];
        if (w.length > 0) {
          const firstTs = w[0].date.toDate().getTime();
          const weeksSince =
            Math.floor((Date.now() - firstTs) / (7 * 24 * 60 * 60 * 1000)) + 1;
            if (weeksSince > 14) {
              const last = w[w.length - 1];
              await setDoc(ref, { weight_history: [last] }, { merge: true });
              w = [last];
            }
        }
        setWeights(w);
      } catch (err) {
        console.error('err- preluare istoric greutate:', err);
      }
    };
    fetchWeights();
  }, [userId]);
const addWeightEntry = useCallback(
  async (weightValue: number) => {
    if (!userId) {return;}
    try {
      const ref = doc(db, 'health_metrics', userId);
      const snap = await getDoc(ref);
      const data = snap.data();
      let current: WeightEntry[] = Array.isArray(data?.weight_history) ? data.weight_history : [];
      if (current.length > 0) {
        const lastTs = current[current.length - 1].date.toDate().getTime();
        const diffWeeks = Math.floor(
          (Date.now() - lastTs) / (7 * 24 * 60 * 60 * 1000)
        );
        for (let i = 1; i < diffWeeks; i++) {
          const d = new Date(lastTs + i * 7 * 24 * 60 * 60 * 1000);
          current.push({ date: Timestamp.fromDate(d), weight: null });
        }
        const lastDate = current[current.length - 1].date.toDate();
        const lastWeek = Math.floor(
          lastDate.getTime() / (7 * 24 * 60 * 60 * 1000)
        );
        const thisWeek = Math.floor(
          Date.now() / (7 * 24 * 60 * 60 * 1000)
        );
        if (lastWeek === thisWeek) {
          current[current.length - 1] = {
            date: Timestamp.fromDate(new Date()),
            weight: weightValue,
          };
        } else {
          current.push({
            date: Timestamp.fromDate(new Date()),
            weight: weightValue,
          });
        }
      } else {
        current.push({
          date: Timestamp.fromDate(new Date()),
          weight: weightValue,
        });
      }
      if (current.length > 14) {
        current = current.slice(-14);
      }
      await setDoc(ref, { weight_history: current }, { merge: true });
      setWeights(current);
    } catch (err) {
      console.error('err- add greutate:', err);
    }
  },
  [userId]
);
  const handleAddWeight = () => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Eroare', 'Te rog introdu o valoare validă.');
      return;
    }
    addWeightEntry(val);
    setNewWeight('');
  };
  useEffect(() => {
    const data = Array.from({ length: 14 }, (_, i) => ({
      x: i + 1,
      y: i === 0 ? initialWeight : weights[i - 1]?.weight ?? null,
    }));
    setGraphData(data);
  }, [initialWeight, weights]);
  const domainX: [number, number] = [1, 14];
  const numericYs = graphData
    .map((d) => d.y)
    .filter((y) => y != null) as number[];
  const minW = numericYs.length > 0 ? Math.min(...numericYs) : 0;
  const maxW = numericYs.length > 0 ? Math.max(...numericYs) : 1;
  const domainY: [number, number] =
    minW === maxW ? [minW - 1, minW + 1] : [minW - 1, maxW + 1];

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.butonWr}>
                <ButonInapoi />
                </View>
        <Text style={styles.headerTitle}>Istoric greutate</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
  <Svg
    width={200}
    height={200}
    viewBox="0 0 512 512"
    preserveAspectRatio="xMidYMid meet"
  >
    <G>
      <G>
        <Path
          fill="#1C4B82"
          d="M512,77.426l-0.309,283.586c0,12.749-10.277,23.181-22.718,23.181H23.027
            c-2.241,0-4.327-0.309-6.414-1.005c-7.264-2.164-12.982-7.959-15.3-15.301c-0.618-2.163-1.005-4.48-1.005-6.876L0,77.426
            C0,34.849,34.077,0,75.649,0h360.703c15.377,0,29.749,4.79,41.726,12.981c7.959,5.409,14.836,12.287,20.322,20.322
            C506.977,45.821,512,61.121,512,77.426z"
        />
        <Path
          fill="#d7edfa"
          d="M441.882,23.527c-0.34-0.116-0.681-0.194-0.946-0.271h-4.615h-65.903
            c-4.931,0-8.929,4.087-8.929,9.128v78.01c0,52.406-21.042,47.803-46.761,47.803h-47.365h-8.955h-4.816h-8.956h-47.366
            c-25.718,0-46.76-0.232-46.76-47.803v-78.01c0-5.041-3.997-9.128-8.928-9.128H75.678h-4.615c-0.265,0.077-0.606,0.155-0.946,0.271
            c-26.596,2.862-47.404,25.951-47.404,53.875v38.676l0.338,206.259v29.548c0,5.041,3.997,9.127,8.929,9.127h28.903h168.621h15.16
            h22.673h15.16h168.621h28.904c4.93,0,8.928-4.087,8.928-9.127v-29.548l0.337-206.259V77.402
            C489.286,49.479,468.478,26.389,441.882,23.527z"
        />
        <G>
          <G>
            <Path
              fill="#BED0FC"
              d="M346.405,61.932v56.39c0,12.26-10.016,22.239-22.239,22.239H187.833
                c-12.26,0-22.239-9.979-22.239-22.239v-56.39c0-21.272,17.404-38.676,38.676-38.676h103.458
                C329,23.256,346.405,40.66,346.405,61.932z"
            />
            <G>
              <G>
                <Polygon fill="#1C4B82" points="336.152,55.356 341.639,56.287 335.971,85.68 330.846,84.817" />
                <Polygon fill="#1C4B82" points="321.353,52.858 326.842,53.782 322.153,83.348 317.029,82.479" />
                <Polygon opacity="0" fill="#1C4B82" points="306.458,51.033 311.983,51.697 308.279,81.401 303.119,80.781" />
              </G>
              <G>
                <Polygon fill="#1C4B82" points="301.654,43.127 307.27,43.798 302.277,88.285 297.21,87.673" />
                <Polygon fill="#1C4B82" points="285.971,49.211 291.522,49.61 289.172,79.452 283.988,79.081" />
                <Polygon fill="#1C4B82" points="270.987,48.454 276.551,48.589 275.191,78.493 269.995,78.372" />
                <Polygon opacity="0" fill="#1C4B82" points="255.985,48.099 261.548,48.228 261.181,78.161 255.985,78.034" />
              </G>
              <G>
                <Polygon fill="#1C4B82" points="235.418,48.589 240.982,48.454 241.974,78.372 236.778,78.493" />
                <Polygon fill="#1C4B82" points="220.447,49.61 225.999,49.211 227.981,79.081 222.797,79.452" />
                <Polygon opacity="0" fill="#1C4B82" points="205.511,51.033 211.038,50.373 214.01,80.16 208.849,80.781" />
              </G>
              <G>
                <Polygon fill="#1C4B82" points="199.084,44.471 204.699,43.798 209.692,88.285 204.624,88.894" />
                <Polygon fill="#1C4B82" points="185.127,53.782 190.616,52.858 194.94,82.479 189.815,83.348" />
                <Polygon fill="#1C4B82" points="170.329,56.287 175.817,55.356 181.123,84.817 175.997,85.68" />
                <Polygon opacity="0" fill="#1C4B82" points="167.375,87.535 165.595,87.922 165.595,79.22" />
              </G>
            </G>
          </G>
          <G>
            <Circle fill="#6d2241" cx="254.722" cy="115.898" r="11.907" />
            <Polygon fill="#6d2241" points="254.721,43.987 251.098,118.134 254.721,118.134 258.345,118.134" />
          </G>
        </G>
        <Path
          fill="#BED0FC"
          d="M298.737,254.422v129.797h-85.474V254.422c0-11.603,9.476-21.078,21.039-21.078h43.395
            c6.846,0,12.995,3.326,16.823,8.47C297.19,245.333,298.737,249.704,298.737,254.422z"
        />
        <Path
          fill="#BED0FC"
          d="M298.737,263.782v120.437h-85.474V263.782c0-11.603,9.476-21.079,21.039-21.079h43.395
            c6.846,0,12.995,3.327,16.823,8.47C297.19,254.693,298.737,259.063,298.737,263.782z"
        />
      </G>
      <Path
        opacity="0.06"
        fill="#040000"
        d="M498.4,33.304c-5.486-8.036-12.363-14.914-20.322-20.322
          C466.101,4.79,451.728,0,436.352,0H256v384.218h42.736v-0.026h190.237c12.441,0,22.718-10.432,22.718-23.181L512,77.426
          C512,61.121,506.977,45.821,498.4,33.304z"
      />
      </G>
    </Svg>
</View>
<Text style={styles.subtitle}>- înregistrează greutate nouă: -</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.weightInput}
            placeholder="ex: 63.2"
            keyboardType="numeric"
            value={newWeight}
            onChangeText={setNewWeight}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddWeight}>
            <Text style={styles.addButtonText}>salvează</Text>
          </TouchableOpacity>
        </View>
      <Card style={styles.grafCard}>
        <Text style={styles.title}>Evoluție greutate (3 luni)</Text>

        <View style={styles.graphContainer}>
          <VictoryChart
            theme={VictoryTheme.material}
            width={windowWidth * 0.9}
            height={250}
            domain={{ x: domainX, y: domainY }}
            domainPadding={{ x: 10, y: 10 }}
            style={{ parent: { marginBottom: -20, marginTop: -15 } }}
          >
            <VictoryAxis
              label="săptămâna"
              tickValues={Array.from({ length: 14 }, (_, i) => i + 1)}
              tickFormat={(v) => `${v}`}
              style={{
                axisLabel: {
                  padding: 30,
                  fontSize: 14,
                  fill: '#1C4B82',
                  fontWeight: 'bold',
                },
                tickLabels: { fontSize: 10, fill: '#666' },
              }}
            />
            <VictoryAxis
              dependentAxis
              label="kg"
              style={{
                axisLabel: {
                  padding: 35,
                  fontSize: 12,
                  fill: '#1C4B82',
                  fontWeight: 'bold',
                },
                tickLabels: { fontSize: 10, fill: '#666' },
              }}
            />

            <VictoryLine
                data={graphData}
                interpolation="linear"
                style={{ data: { stroke: '#74C4C0', strokeWidth: 3 } }}
                {...({ connectNulls: true } as any)}
              />

            <VictoryScatter
              data={graphData}
              size={5}
              style={{
                data: {
                  fill: ({ datum }) =>
                    datum.y == null ? 'transparent' : '#7d7fc6',
                  stroke: '#7d7fc6',
                  strokeWidth: ({ datum }) => (datum.y == null ? 2 : 0),
                },
              }}
            />
          </VictoryChart>
        </View>
      </Card>
      </ScrollView>
    </View>
  );
};
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
          marginTop: Platform.select({ ios: 55, android: 10 }),
          alignItems: 'center',
          borderBottomColor: '#1C4B82',
          borderBottomWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 10,
          marginBottom: 7,
          position: 'relative',
        },
        headerTitle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: '#1C4B82',
          textAlign: 'center',
          alignSelf: 'stretch',
        },
        butonWr: {
          position: 'absolute',
        left: 16,
        top: '75%',
        transform: [{ translateY: -12 }],
        },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C4B82',
    marginBottom: -45,
    textAlign: 'center',
    marginTop:10,
  },
  grafCard:{
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 4,
    marginBottom: 15,
    padding: 3,
    width: '90%',
    alignSelf: 'center',
    marginTop: 50,
  },
  graphContainer: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 20,
    alignSelf: 'center',
    width: '110%',
    marginBottom: 20,
  },
  subtitle: {
    marginTop: -40,
    fontSize: 16,
    color: '#7d7fc6',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    alignSelf: 'center',
    width: '90%',
  },
  weightInput: {
    flex: 1,
    borderColor: '#1C4B82',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#1C4B82',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  imgKG: {
    width: 390,
    height: 300,
    resizeMode: 'contain',
  },
});

export default IstoricKg;
