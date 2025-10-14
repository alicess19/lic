import React, {useEffect, useState} from 'react';
import {View, Text,StyleSheet, Image,TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {signOut} from 'firebase/auth';
import {doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import {auth, db} from '../firebaseConfig';
import ButonInapoi from '../comp/ButonInapoi';
import {calculateCaloricData, CaloricInput} from '../comp/CalcCal';

type RootStackParamList = {
  Obiective: undefined;
};

const Profil = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const userId = auth.currentUser?.uid!;
  const [nume, setNume] = useState<string>('Utilizator');
  const [varsta, setVarsta] = useState<number | null>(null);
  const [sex, setSex] = useState<'Masculin' | 'Feminin'>('Masculin');
  const [inaltime, setInaltime] = useState<number | null>(null);
  const [activitate, setActivitate] = useState<string>('sedentar');
  const [obiectiv, setObiectiv] = useState<string>('Menținere');
  const [IMC, setIMC] = useState<number | null>(null);
  const [BMR, setBMR] = useState<number | null>(null);
  const [alergeni, setAlergeni] = useState<string[]>([]);
  const [vegetarian, setVegetarian] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const result = await request(PERMISSIONS.IOS.CAMERA);
      return result === RESULTS.GRANTED;
    }
  };
  const requestGalleryPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      return result === RESULTS.GRANTED;
    }
  };
  const handleSelectPhoto = () => {
    Alert.alert('Schimbare poză', 'Alege o sursă', [
      {
        text: 'Cameră',
        onPress: async () => {
          const granted = await requestCameraPermission();
          if (!granted) {
            Alert.alert('Permisiune refuzată', 'Nu avem acces la cameră.');
            return;
          }
          const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
          if (result.assets && result.assets[0]?.uri) {
            const selectedUri = result.assets[0].uri;
            setPhotoUrl(selectedUri);
            try {
              await updateDoc(doc(db, 'user', userId), {
                profile_photo: selectedUri,
              });
            } catch (error) {
              console.error('Eroare la salvarea pozei în Firestore:', error);
            }
          }
          },
        },
      {
        text: 'Galerie',
        onPress: async () => {
          const granted = await requestGalleryPermission();
          if (!granted) {
            Alert.alert('Permisiune refuzată', 'Nu avem acces la galerie.');
            return;
          }
          const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
          if (result.assets && result.assets[0]?.uri) {
            const selectedUri = result.assets[0].uri;
            setPhotoUrl(selectedUri);
            try {
              await updateDoc(doc(db, 'user', userId), {
                profile_photo: selectedUri,
              });
            } catch (error) {
              console.error('Eroare la salvarea pozei în Firestore:', error);
            }
          }
        },
      },
      { text: 'Anulează', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    async function fetchAll() {
      const chRef = doc(db, 'Chestionar', userId);
      const chSnap = await getDoc(chRef);
      const userRef = doc(db, 'user', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.profile_photo) {
          setPhotoUrl(data.profile_photo);
        }
      }
      let quizWeight: number | null = null;
      if (chSnap.exists()) {
        const d = chSnap.data();
        setNume(d['0'] ?? 'Utilizator');
        setVarsta(d['2'] ? parseInt(d['2'], 10) : null);
        const rawSex = (d['1'] as string)?.toLowerCase().includes('fem')
          ? 'Feminin'
          : 'Masculin';
        setSex(rawSex as 'Masculin' | 'Feminin');
        setInaltime(d['3'] ? parseInt(d['3'], 10) : null);
        setAlergeni(d['8'] as string[] ?? []);
        setVegetarian(d.vegetarian ?? false);
        setActivitate(d['5'] ?? 'sedentar');
        setObiectiv(d['6'] ?? 'Menținere');
        quizWeight = Number(d['4']) || null;
      }
      const hmRef = doc(db, 'health_metrics', userId);
      const hmSnap = await getDoc(hmRef);
      let lastWeight: number | null = quizWeight;
      if (hmSnap.exists()) {
        const { weight_history = [] } = hmSnap.data() as {
          weight_history?: { date: Timestamp; weight: number }[];
        };
        if (weight_history.length > 0) {
          lastWeight = weight_history[weight_history.length - 1].weight;
        }
      }
      if (
        lastWeight != null &&
        inaltime != null &&
        varsta != null &&
        sex
      ) {
        const hM = inaltime / 100;
        setIMC(parseFloat((lastWeight / (hM * hM)).toFixed(1)));
        const input: CaloricInput = {
          weight: lastWeight,
          height: inaltime,
          age: varsta,
          sex,
          activityLevel: activitate,
          totalCaloriesEaten: 0,
          totalCaloriesBurned: 0,
          goal: obiectiv,
          consumedProtein: 0,
          consumedFats: 0,
          consumedCarbs: 0,
        };
        const { tdee } = calculateCaloricData(input);
        const factor = (() => {
          const a = activitate.toLowerCase();
          if (a.includes('ușor')) {return 1.375;}
          if (a.includes('moderat')) {return 1.55;}
          if (a.includes('foarte')) {return 1.725;}
          if (a.includes('extrem')) {return 1.9;}
          return 1.2;
        })();
        setBMR(Math.round(tdee / factor));
      }
    }
    fetchAll().catch(console.error);
  }, [userId, inaltime, varsta, sex, activitate, obiectiv]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Succes', 'Te-ai deconectat cu succes.');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
      <ButonInapoi popToTop />
        <Text style={styles.headerTitle}>Profil</Text>
      </View>
      <View style={styles.profileContainer}>
      <TouchableOpacity onPress={handleSelectPhoto}>
        <Image
          source={
            photoUrl
              ? { uri: photoUrl }
              : require('../icons/xpoza_profil.png')
          }
          style={styles.profileImage}
        />
      </TouchableOpacity>
        <Text style={styles.profileName}>Bună, {nume}! 🫶🏼</Text>
        <Text style={styles.profileAge}>
          {varsta != null ? `${varsta} ani` : 'Vârstă necunoscută'}
        </Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Deconectare</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.progressButton}
          onPress={() => navigation.navigate('Obiective')}
        >
          <Text style={styles.progressButtonText}>
            Vizualizare progres curent
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Datele mele curente</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sex</Text>
          <Text style={styles.infoValue}>{sex}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Înălțime</Text>
          <Text style={styles.infoValue}>
            {inaltime != null ? `${inaltime} cm` : 'N/A'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            Indice de Masă Corporală (IMC)
          </Text>
          <Text style={styles.infoValue}>
            {IMC != null ? IMC.toFixed(1) : 'N/A'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            Rata Metabolică Bazală (BMR)
          </Text>
          <Text style={styles.infoValue}>
            {BMR != null ? `${BMR} kcal/zi` : 'N/A'}
          </Text>
        </View>
        <View style={styles.infoRowVertical}>
          <Text style={styles.infoLabel}>Alergeni</Text>
          <Text style={styles.infoValueWrap}>
            {alergeni.length > 0 ? alergeni.join(', ') : 'Niciun alergen'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vegetarian</Text>
          <Text style={styles.infoValue}>
            {vegetarian ? 'Da' : 'Nu'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', paddingTop: 40,  marginTop: Platform.OS === 'ios' ? -8 : 0 },
  header: {
    marginTop: Platform.select({ ios: 20, android: -30 }),
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
    textAlign: 'center',
    alignItems: 'center',
    marginLeft: 125,
  },
  profileContainer: { alignItems: 'center', padding: 20 },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 20,
    marginBottom: 10,
  },
  profileName: { fontSize: 24, fontWeight: 'bold' },
  profileAge: { fontSize: 16, color: '#888', marginBottom: 20 },
  logoutButton: {
    backgroundColor: '#1C4B82',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginBottom: 10,
  },
  logoutButtonText: { color: '#fff', fontSize: 16 },
  progressButton: {
    backgroundColor: '#ffff',
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  progressButtonText: { color: '#1C4B82', fontSize: 16, fontWeight: 'bold' },
  infoContainer: {
    padding: 20,
    backgroundColor: '#d7edfa',
    borderRadius: 15,
    margin: 20,
  },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,75,130,0.3)',
  },
  infoValueWrap: {
    fontSize: 16,
    color: '#000',
    marginTop: 4,
    lineHeight: 22,
  },
  infoRowVertical: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,75,130,0.3)',
  },
  infoLabel: { fontSize: 16, color: '#1C4B82' },
  infoValue: { fontSize: 16 },
});

export default Profil;
