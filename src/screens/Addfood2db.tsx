/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect } from 'react';
import { View, Text, TextInput,StyleSheet, TouchableOpacity,Alert, ScrollView} from 'react-native';
import {collection, getDocs, addDoc} from 'firebase/firestore';
import {db} from '../firebaseConfig';
import {Picker} from '@react-native-picker/picker';
import Intrebari from '../comp/Intrebari';

const alergeniOptions = Intrebari.find((q) => q.id === 8)?.options || [];

const categorieOptions = [
  'Condimente',
  'Carne',
  'Baza plante',
  'Dulciuri',
  'Alimente de baza',
  'Preparate',
  'Peste',
  'Fainoase',
];

const titluri = [
  'Nume: ',
  'Categorie: ',
  'Calorii / 100g',
  'Carbohidrați / 100g',
  'Fibre / 100g',
  'Proteină / 100g',
  'Grăsimi / 100g',
  'Zaharuri / 100g',
  'Sare / 100g',
  'Alergeni',
  'Cod de bare detectat',
];

const Addfood2db = ({ barcode, onClose }: { barcode: string; onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [foodId, setFoodId] = useState<number>(443);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    calories: '',
    carbs: '',
    fiber: '',
    protein: '',
    fats: '',
    sugar: '',
    sodium: '',
    allergens: [] as string[],
    barcode: barcode,
  });

  useEffect(() => {
    const fetchMaxId = async () => {
      const snapshot = await getDocs(collection(db, 'food_database'));
      let maxId = 443;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const currentId = parseInt(data.food_id, 10);
        if (!isNaN(currentId) && currentId > maxId) {
          maxId = currentId;
        }
      });
      setFoodId(maxId + 1);
    };
    fetchMaxId();
  }, []);

  const totalSteps = 11;

  const handleNext = () => {
    if (
      step === 0 && !formData.name ||
      step === 1 && !formData.category ||
      step === 2 && !formData.calories ||
      step === 3 && !formData.carbs ||
      step === 4 && !formData.fiber ||
      step === 5 && !formData.protein ||
      step === 6 && !formData.fats ||
      step === 7 && !formData.sugar ||
      step === 8 && !formData.sodium
    ) {
      Alert.alert('Câmp obligatoriu', 'Vă rog completați.');
      return;
    }
    if (step < totalSteps - 1) {
      setStep(step + 1);
      setProgress(((step + 2) / totalSteps) * 100);
    } else {
      saveToFirebase();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setProgress(((step) / totalSteps) * 100);
    }
  };

  const handleMultiSelect = (item: string) => {
    if (formData.allergens.includes(item)) {
      setFormData({
        ...formData,
        allergens: formData.allergens.filter((al) => al !== item),
      });
    } else {
      setFormData({
        ...formData,
        allergens: [...formData.allergens, item],
      });
    }
  };

  const saveToFirebase = async () => {
    try {
      await addDoc(collection(db, 'food_database'), {
        name: formData.name,
        category: formData.category,
        calories: Number(formData.calories),
        carbs: Number(formData.carbs),
        fiber: Number(formData.fiber),
        protein: Number(formData.protein),
        fats: Number(formData.fats),
        sugar: Number(formData.sugar),
        sodium: Number(formData.sodium),
        allergens: formData.allergens,
        barcode: formData.barcode,
        food_id: foodId.toString(),
      });
      Alert.alert('Succes', 'Alimentul a fost adăugat cu succes!');
      onClose();
    } catch (e) {
      console.error('err- salvare:', e);
      Alert.alert('Eroare', 'Nu s-a putut salva în Firebase.');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <TextInput placeholder="ex: Ovăz integral" style={styles.input}
          value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />;
      case 1:
        return (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(val) => setFormData({ ...formData, category: val })}
              style={{ color: '#000' }}
              itemStyle={{ color: '#000' }}
            >
              {categorieOptions.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        );
      case 2: return <TextInput placeholder="ex: 375" style={styles.input} keyboardType="numeric"
        value={formData.calories} onChangeText={(text) => setFormData({ ...formData, calories: text })} />;
      case 3: return <TextInput placeholder="ex: 65" style={styles.input} keyboardType="numeric"
        value={formData.carbs} onChangeText={(text) => setFormData({ ...formData, carbs: text })} />;
      case 4: return <TextInput placeholder="ex: 10" style={styles.input} keyboardType="numeric"
        value={formData.fiber} onChangeText={(text) => setFormData({ ...formData, fiber: text })} />;
      case 5: return <TextInput placeholder="ex: 15" style={styles.input} keyboardType="numeric"
        value={formData.protein} onChangeText={(text) => setFormData({ ...formData, protein: text })} />;
      case 6: return <TextInput placeholder="ex: 4.5" style={styles.input} keyboardType="numeric"
        value={formData.fats} onChangeText={(text) => setFormData({ ...formData, fats: text })} />;
      case 7: return <TextInput placeholder="ex: 0.9" style={styles.input} keyboardType="numeric"
        value={formData.sugar} onChangeText={(text) => setFormData({ ...formData, sugar: text })} />;
      case 8: return <TextInput placeholder="ex: 0.15" style={styles.input} keyboardType="numeric"
        value={formData.sodium} onChangeText={(text) => setFormData({ ...formData, sodium: text })} />;
      case 9:
        return (
          <ScrollView style={{ maxHeight: 250 }}>
            {alergeniOptions.map((item) => (
              <TouchableOpacity key={item} onPress={() => handleMultiSelect(item)}
                style={[styles.multiItem, formData.allergens.includes(item) && styles.multiItemSelected]}>
                <Text style={{ color: formData.allergens.includes(item) ? '#fff' : '#000' }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        );
      case 10:
        return <Text style={{ textAlign: 'center' }}>Codul de bare asociat: {barcode}</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={{ paddingBottom: 20 }}>
    <Text style={styles.modalTitle}>{titluri[step]}</Text>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
    <View style={styles.stepContainer}>{renderStep()}</View>
    <View style={styles.buttonContainer}>
      {step > 0 && (
        <TouchableOpacity style={styles.buttonBack} onPress={handleBack}>
          <Text style={styles.buttonText}>Înapoi</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.buttonNext} onPress={handleNext}>
        <Text style={styles.buttonText}>{step === totalSteps - 1 ? 'Salvează' : 'Următorul'}</Text>
      </TouchableOpacity>
    </View>
  </View>
  );
};

export default Addfood2db;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '42%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C4B82',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ccc',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1C4B82',
  },
  stepContainer: {
    minHeight: 80,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  multiItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#eee',
  },
  multiItemSelected: {
    backgroundColor: '#1C4B82',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonBack: {
    padding: 12,
    backgroundColor: '#ccc',
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    marginTop: -30,
  },
  buttonNext: {
    padding: 12,
    backgroundColor: '#1C4B82',
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    marginTop: -30,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
