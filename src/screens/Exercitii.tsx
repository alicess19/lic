/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState, useCallback} from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity,Image, Platform,Dimensions} from 'react-native';
import {collection, getDocs,doc, setDoc, updateDoc,increment, arrayUnion } from 'firebase/firestore';
import YoutubePlayer from 'react-native-youtube-iframe';
import {auth, db} from '../firebaseConfig';
import ButonInapoi from '../comp/ButonInapoi';
import BaraSearch from '../comp/BaraSearch';
import { SafeAreaView } from 'react-native-safe-area-context';
interface Exercise {
  name: string;
  category: string;
  difficulty: string;
  equipment: string;
  muscle_group?: string[];
  video_url: string;
}
const Exercitii = () => {
  const userId = auth.currentUser?.uid;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'exercises'));
        const exerciseList = snapshot.docs.map((docSnap) => docSnap.data() as Exercise);
        setExercises(exerciseList);
        setFilteredExercises(exerciseList);
      } catch (error) {
        console.error('err- preluarea ex:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExercises();
  }, []);
  const getYoutubeVideoId = (url: string): string => {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/embed\/)([^"&?/\s]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.length < 3) {
        setFilteredExercises(exercises);
        return;
      }
      const filtered = exercises.filter((exItem) =>
        exItem.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredExercises(filtered);
    },
    [exercises]
  );
  const logExercitiu = async (exercitiu: Exercise) => {
    if (!userId) {
      Alert.alert('Eroare', 'Trebuie să fii autentificat pentru a loga exercițiul.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const docId = `${userId}_${today}`;
    try {
      await setDoc(
        doc(db, 'activity_logs', docId),
        {
          uid: userId,
          date: today,
          workouts_done: arrayUnion(exercitiu.name),
        },
        { merge: true }
      );
      await updateDoc(doc(db, 'activity_logs', docId), {
        total_exercices: increment(1),
      });
      Alert.alert('Succes', `Exercițiul "${exercitiu.name}" a fost adăugat.`);
    } catch (error) {
      console.error('err- inreg ex:', error);
    }
  };
   const { height } = Dimensions.get('window');
  const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        marginTop: Platform.OS === 'ios' ? -10 : 0,
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
      header: {
        marginTop: Platform.select({ ios: 9, android: 20 }),
        alignItems: 'center',
        borderBottomColor: '#1C4B82',
        borderBottomWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 19,
        position: 'relative',
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1C4B82',
        textAlign: 'center',
        alignSelf: 'stretch',
      },
  flatListStyle: {
    marginTop: 15,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 70,
  },
  exerciseItem: {
    marginTop: 5,
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 10,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#BED0FC',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C4B82',
    textAlign: 'center',
    marginTop: 5,
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  exerciseDifficulty: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  exerciseEquipment: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#1C4B82',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'center',
  },
  textButon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  butonWr: {
    position: 'absolute',
  left: 16,
  top: '75%',
  transform: [{ translateY: -12 }],
  },
});
  const renderExercise = ({ item }: { item: Exercise }) => {
    const videoId = getYoutubeVideoId(item.video_url);
    return (
      <View style={styles.exerciseItem}>
        <YoutubePlayer height={200} play={false} videoId={videoId} />
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseCategory}>{item.category}</Text>
        <Text style={styles.exerciseDifficulty}>
          Dificultate: {item.difficulty}
        </Text>
        <Text style={styles.exerciseEquipment}>
          Echipament: {item.equipment}
        </Text>

        <TouchableOpacity style={styles.doneButton} onPress={() => logExercitiu(item)}>
          <Text style={styles.textButon}>Făcut 🧘🏻</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../icons/Jurnal.png')} style={styles.topLeftImage} />
      <View style={styles.header}>
      <View style={styles.butonWr}>
        <ButonInapoi />
        </View>
        <Text style={styles.headerTitle}>Exerciții din baza de date</Text>
      </View>
      <View style={{ paddingHorizontal: 15, marginTop: -3 }}>
        <BaraSearch  searchQuery={searchQuery} onSearch={handleSearch} />
      </View>
      {loading ? (
        <Text style={styles.loadingText}>Se încarcă...</Text>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.video_url}
          renderItem={renderExercise}
          style={styles.flatListStyle}
          removeClippedSubviews={false}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
};



export default Exercitii;
