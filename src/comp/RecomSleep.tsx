/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { SLEEP_MODEL_API } from '@env';

const hhmmToHour = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h % 24) + m / 60;
};

const hourToHHMM = (hour: number): string => {
  const totalMin = Math.round(hour * 60);
  const rounded = Math.round(totalMin / 15) * 15;
  const hh = Math.floor(rounded / 60) % 24;
  const mm = rounded % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

const MEAN  = [288.45, 87.69, 76.66, 0, 0, 0.44];
const SCALE = [45.38, 20.69, 17.32, 1, 1, 0.50];
const isWeekendDay = (d: number) => [5, 6, 0].includes(d);

export default function RecomSleep() {
  const [opt, setOpt] = useState<{ h: number; q: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [insufficientLogs, setInsufficientLogs] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) {throw new Error('Nu eşti autentificat');}

        const db = getFirestore();
        const snap = await getDocs(query(
          collection(db, 'sleep_logs'),
          where('uid', '==', user.uid),
          orderBy('date', 'desc'),
          limit(7),
        ));
        const logs = snap.docs.map(d => d.data());

        if (logs.length < 7) {
          setInsufficientLogs(true);
          return;
        }

        const validLogs = logs.filter(l =>
          l.sleep_rem != null && l.sleep_deep != null && l.sleep_light != null && typeof l.start_time === 'string'
        );

        if (!validLogs.length) {throw new Error('date incomplete sleeplogs');}
        const logsWithQuality = validLogs.map(l => {
          const rem = l.sleep_rem;
          const deep = l.sleep_deep;
          const light = l.sleep_light;
          const total = rem + deep + light;
          let q = (rem + deep) / total;

          const durationPenalty = Math.min(1, total / 480);
          q = q * durationPenalty;

          const h = hhmmToHour(l.start_time);
          return { h, q };
        });
        logsWithQuality.sort((a, b) => b.q - a.q);
        const bestQualityHour = logsWithQuality[0].h;

        const candMin = Math.max(0, bestQualityHour - 0.75);
        const candMax = Math.min(24, bestQualityHour + 0.75);

        const cands: number[] = [];
        for (let h = candMin; h <= candMax; h += 0.25) {cands.push(+h.toFixed(2));}

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
        const avgLight = avg(validLogs.map(l => l.sleep_light));
        const avgRem = avg(validLogs.map(l => l.sleep_rem));
        const avgDeep = avg(validLogs.map(l => l.sleep_deep));

        const aziWeekend = isWeekendDay(new Date().getDay()) ? 1 : 0;

        const instances = cands.map(h => {
          const rad = 2 * Math.PI * h / 24;
          const raw = [avgLight, avgRem, avgDeep, Math.sin(rad), Math.cos(rad), aziWeekend];
          return raw.map((x, i) => (x - MEAN[i]) / SCALE[i]);
        });

        const preds: number[] = [];
        for (const inst of instances) {
          const response = await fetch(SLEEP_MODEL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [inst] }),
          });
          const json = await response.json();
          if (json.error) {throw new Error(json.error);}
          if (!json.prediction || !Array.isArray(json.prediction) || !Array.isArray(json.prediction[0])) {
            throw new Error('Format invalid din model');
          }
          preds.push(json.prediction[0][0]);
        }

        if (preds.length !== cands.length) {throw new Error(`Preds(${preds.length})≠cands(${cands.length})`);}

        let best = 0;
        preds.forEach((q, i) => { if (q > preds[best]) {best = i;} });

        const mlHour = cands[best];
        const personalHour = bestQualityHour;
        let finalHour = mlHour;

        if (Math.abs(mlHour - personalHour) > 2) {
          finalHour = personalHour + (mlHour - personalHour) * 0.3;
        }

        const recommendedHH = hourToHHMM(finalHour);
        const today = new Date().toISOString().split('T')[0];
        const metricRef = doc(db, 'health_metrics', user.uid, 'daily', today);
        const metricSnap = await getDoc(metricRef);
        if (!metricSnap.exists() || !metricSnap.data().hhsugestie) {
          await setDoc(metricRef, { hhsugestie: recommendedHH }, { merge: true });
        }

        setOpt({ h: finalHour, q: preds[best] });

      } catch (e: any) {
        console.warn('RecomSleep error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {return <ActivityIndicator style={{ margin: 12 }} />;}

  if (insufficientLogs) {
    return (
      <View style={styles.root}>
        <Text style={styles.txt}>
          Nu aveți date suficiente pentru a se realiza sugestia, reveniți!
        </Text>
      </View>
    );
  }

  if (!opt) {return null;}

  return (
    <View style={styles.root}>
      <Text style={styles.txt}>
        Pe baza datelor din ultima săptămână, ora optimă de culcare pentru seara aceasta e {hourToHHMM(opt.h)} 💤.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: 4 },
  txt: { fontSize: 13, fontWeight: '600', color: '#1C4B82', textAlign: 'center' },
});
