import React, { useEffect, useState } from 'react';
import {View, Text, Image, TouchableOpacity,StyleSheet, Alert, Linking, SafeAreaView, ScrollView,Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback} from 'react-native';
import { collection, getDocs, doc,getDoc, setDoc, arrayUnion, increment} from 'firebase/firestore';
import {auth, db} from '../firebaseConfig';
import images from '../icons/retete/index';
import ButonInapoi from '../comp/ButonInapoi';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Recipe {
  nume: string;
  alergeni: string[];
  link: string;
  calories: number;
  carbs: number;
  fibre: number;
  protein: number;
  sodium: number;
  sugar: number;
  vegetarian: boolean;
  fats: number;
  obiectiv: string;
}
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const mapObjective = (dbObj: string) => {
  const obj = normalize(dbObj);
      if (['slabire', 'slăbire'].includes(obj))       {return 'scadere in greutate';}
      if (['ingrasare', 'îngrășare'].includes(obj))    {return 'crestere in greutate';}
      if (['mentinere', 'menținere'].includes(obj))    {return 'mentinere';}
      if (['tonifiere'].includes(obj))                 {return 'tonifiere';}
      return obj;
    };

const ReteteSugerate: React.FC = () => {
  const [retete, setRetete] = useState<Recipe[]>([]);
  const userId = auth.currentUser?.uid;
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [portions, setPortions] = useState('1');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!userId) {return;}
    const fetchUserPreferences = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const lastUpdate = await AsyncStorage.getItem('ultima_zi_retete');
        const storedRecipesJson = await AsyncStorage.getItem('retete_azi');
        const storedRecipes: Recipe[] = storedRecipesJson
          ? JSON.parse(storedRecipesJson)
          : [];
        if (lastUpdate === today && storedRecipes.length > 0) {
          console.log('folosire retete salvate local.');
          setRetete(storedRecipes);
          return;
        }
        await AsyncStorage.setItem('ultima_zi_retete', today);
        const userRef = doc(db, 'Chestionar', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {return;}
        const userData = userSnap.data();
        const alergeniUtilizator: string[] = Array.isArray(userData['8']) ? userData['8'] : [];
        const obiectivUtilizator: string = userData['6'] || '';
        const userObj = normalize(obiectivUtilizator);
        const esteVegetarian: boolean = userData['9'] === 'Da';
        const reteteSnapshot = await getDocs(collection(db, 'retete_database'));
        let reteteFiltrate: Recipe[] = [];
        reteteSnapshot.forEach((docSnap) => {
          const reteta = docSnap.data() as Recipe;
          if (
            Array.isArray(reteta.alergeni) &&
            reteta.alergeni.some((alergen) => alergeniUtilizator.includes(alergen))
          ) {
            return;
          }
          if (esteVegetarian && !reteta.vegetarian) {
            return;
          }
          const recetaMappedObj = mapObjective(reteta.obiectiv || '');
            if (recetaMappedObj === userObj) {
              reteteFiltrate.push(reteta);
            }
        });
        if (reteteFiltrate.length > 2) {
          reteteFiltrate = reteteFiltrate
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);
        }
        await AsyncStorage.setItem('retete_azi', JSON.stringify(reteteFiltrate));
        setRetete(reteteFiltrate);
      } catch (error) {
        console.error('err- preluarea retete:', error);
      }
    };
    fetchUserPreferences();
  }, [userId]);
  const askPortionsAndLog = (reteta: Recipe) => {
    setSelectedRecipe(reteta);
    setPortions('1');
    setShowPortionModal(true);
  };
  const handleLogReteta = async () => {
    if (!selectedRecipe || !userId) {return;}
    setShowPortionModal(false);
    const nrPortii = parseFloat(portions) || 1;
    if (nrPortii <= 0) {
      Alert.alert('Valoare incorectă', 'Numărul porțiilor trebuie să fie minim 1.');
      return;
    }
    const totalCalories = selectedRecipe.calories * nrPortii;
    const totalCarbs = selectedRecipe.carbs * nrPortii;
    const totalFats = selectedRecipe.fats * nrPortii;
    const totalProtein = selectedRecipe.protein * nrPortii;
    try {
      const docId = `${userId}_${currentDate}`;
      await setDoc(
        doc(db, 'nutrition_logs', docId),
        {
          uid: userId,
          date: currentDate,
          meals: arrayUnion({
            foodName: selectedRecipe.nume,
            portion: nrPortii,
            mealType: 'reteta',
            calories: totalCalories,
            carbs: totalCarbs,
            fats: totalFats,
            protein: totalProtein,
          }),
          total_calories: increment(totalCalories),
          total_carbs:    increment(totalCarbs),
          total_fats:     increment(totalFats),
          total_protein:  increment(totalProtein),
        },
        { merge: true }
      );
      Alert.alert(
        'Succes',
        `Rețeta "${selectedRecipe.nume}" a fost adăugată (${nrPortii} porții).`
      );
    } catch (error) {
      console.error('err- logarea reteta:', error);
      Alert.alert('Eroare:', 'Nu s-a putut adăuga rețeta în jurnal. Vă rugăm reîncercați.');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <Image source={require('../icons/Retete.png')} style={styles.bottomRightImage} />
      <View style={styles.header}>
        <ButonInapoi />
        <Text style={styles.headerTitle}>Rețete sugerate 🍴</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {retete.length === 0 ? (
          <Text style={styles.mesaj}>Nu există rețete recomandate pentru azi.</Text>
        ) : (
          retete.map((reteta, index) => (
            <View key={index} style={styles.retetaContainer}>
              <TouchableOpacity onPress={() => Linking.openURL(reteta.link)}>
                <Image
                  source={images[reteta.nume.replace(/ /g, '_')]}
                  style={styles.imagine}
                />
              </TouchableOpacity>
              <View style={styles.detalii}>
                <Text style={styles.nume}>{reteta.nume}</Text>
                <TouchableOpacity
                  style={styles.buton}
                  onPress={() => askPortionsAndLog(reteta)}
                >
                  <Text style={styles.textButon}>adaugă în jurnalul de azi 😋</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <Modal
        visible={showPortionModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPortionModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPortionModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <Text style={styles.modalTitle}>Câte porții?</Text>
                <TextInput
                  style={styles.portionInput}
                  keyboardType="numeric"
                  value={portions}
                  onChangeText={setPortions}
                  placeholder="ex: 1"
                  placeholderTextColor="#888"
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleLogReteta}>
                  <Text style={styles.modalButtonText}>Adaugă</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowPortionModal(false)}>
                  <Text style={styles.modalButtonTextCancel}>Renunță</Text>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default ReteteSugerate;

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
     marginTop: Platform.OS === 'ios' ? -10 : 0,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginTop: Platform.select({ ios: 0, android: 10 }),
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#1C4B82',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: -10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C4B82',
    textAlign: 'center',
  },

  bottomRightImage: {
    position: 'absolute',
    zIndex: Platform.OS === 'android' ? 0 : -1,
    bottom: -80,
    right: Platform.select({ ios: 0, android: -20 }),
    width: 460,
    height: 280,
    pointerEvents: 'none',
    resizeMode: 'contain',
  },
  mesaj: {
    fontSize: 18,
    textAlign: 'center',
    color: '#010127',
    marginTop: 20,
  },
  retetaContainer: {
    borderWidth: 4,
    borderColor: '#BED0FC',
    marginTop: 30,
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  imagine: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  detalii: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'center',
  },
  nume: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    alignItems: 'center',
    textAlign: 'center',
  },
  buton: {
    backgroundColor: '#1C4B82',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  textButon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    width: '78%',
    borderRadius: 13,
    padding: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C4B82',
    marginBottom: 15,
    textAlign: 'center',
  },
  portionInput: {
    borderWidth: 1,
    borderColor: '#1C4B82',
    borderRadius: 8,
    width: '40%',
    height: 45,
    textAlign: 'center',
    fontSize: 16,
    color: '#000',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#1C4B82',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonCancel: {
    backgroundColor: '#1C4B82',
    borderRadius: 8,
    marginTop: -4,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalButtonTextCancel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
