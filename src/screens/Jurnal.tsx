/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet,View, TouchableWithoutFeedback, TouchableOpacity, KeyboardAvoidingView,Platform, Modal, Dimensions} from 'react-native';
import { Text, Card, Button, Slider } from 'react-native-ui-lib';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, increment, arrayRemove} from 'firebase/firestore';
import {db} from '../firebaseConfig';
import ButonInapoi from '../comp/ButonInapoi';
import { calculateCaloricData, CaloricInput } from '../comp/CalcCal';

type RootStackParamList = {
  Jurnal: { date?: string };
  AddMancare: { mealType: string; date?: string };
};

type JurnalScreenProp = StackNavigationProp<RootStackParamList, 'Jurnal'>;
type JurnalRouteProp = RouteProp<RootStackParamList, 'Jurnal'>;
interface MealItem {
  foodName: string;
  servingSize: number;
  mealType: string;
  calories: number;
  carbs?: number;
  fats?: number;
  protein?: number;
}

const Jurnal = () => {
  const navigation = useNavigation<JurnalScreenProp>();
  const route = useRoute<JurnalRouteProp>();
  const paramDate = route.params?.date;
  const isoDate = paramDate || new Date().toISOString().split('T')[0];
  const dateObj = new Date(isoDate);
  const isToday = isoDate === new Date().toISOString().split('T')[0];
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const textTitle = isToday
    ? 'Calorii rămase azi'
    : `Consum caloric anterior- ${day}/${month}`;
  const userId = getAuth().currentUser?.uid;
  const [caloriiObiectiv, setCaloriiObiectiv] = useState(0);
  const [caloriiMancate, setCaloriiMancate] = useState(0);
  const [caloriiArse, setCaloriiArse] = useState(0);
  const [totalWater, setTotalWater] = useState(0);
  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [showAddApa, setShowAddApa] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealModalType, setMealModalType] = useState<string>('breakfast');
  const [mealItems, setMealItems] = useState<MealItem[]>([]);

  useFocusEffect(
    React.useCallback(() => {
    if (!userId) {return;}
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'Chestionar', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const varsta = Number(userData['10']) || 30;
          const inaltime = Number(userData['3']) || 170;
          const greutate = Number(userData['4']) || 70;
          const sexRaw = userData['1'] || 'Masculin';
          const activ = userData['5'] || 'sedentar';
          const goal = userData['6'] || 'Menținere';
          const input: CaloricInput = {
            weight: greutate,
            height: inaltime,
            age: varsta,
            sex: sexRaw.toLowerCase().includes('fem') ? 'Feminin' : 'Masculin',
            activityLevel: activ,
            totalCaloriesEaten: 0,
            totalCaloriesBurned: 0,
            goal,
            consumedProtein: 0,
            consumedFats: 0,
            consumedCarbs: 0,
          };
          const caloricData = calculateCaloricData(input);
          setCaloriiObiectiv(caloricData.adjustedCaloricNeed);
          setWaterGoal(caloricData.waterGoal);
        }
      } catch (error) {
        console.error('Eroare la preluarea datelor din Chestionar:', error);
      }
    };
    const fetchNutritionLog = async () => {
      try {
        const docId = `${userId}_${isoDate}`;
        const nutritionRef = doc(db, 'nutrition_logs', docId);
        const nutritionSnap = await getDoc(nutritionRef);
        if (nutritionSnap.exists()) {
          const data = nutritionSnap.data();
          setCaloriiMancate(data.total_calories || 0);
          setTotalWater(data.water_intake_ml || 0);
        } else {
          setCaloriiMancate(0);
          setTotalWater(0);
        }
      } catch (error) {
        console.error('err- preluare date- nutrition_logs:', error);
      }
    };
    const fetchActivityData = async () => {
      try {
        const docId = `${userId}_${isoDate}`;
        const activityRef = doc(db, 'activity_logs', docId);
        const activitySnap = await getDoc(activityRef);
        if (activitySnap.exists()) {
          const activityData = activitySnap.data();
          const burned = activityData?.calories_burned ?? 0;
          setCaloriiArse(burned);
        }
      } catch (error) {
        console.error('err- preluare date- activity_logs:', error);
      }
    };
    Promise.all([fetchUserData(), fetchNutritionLog(), fetchActivityData()]);
  }, [userId, isoDate]));

  const totalCaloriesRamase = caloriiObiectiv - caloriiMancate + caloriiArse;
  const handleLogWater = async () => {
    if (!userId) {return;}
    try {
      const docId = `${userId}_${isoDate}`;
      await setDoc(
        doc(db, 'nutrition_logs', docId),
        {
          uid: userId,
          date: isoDate,
          water_intake_ml: increment(sliderValue),
        },
        { merge: true }
      );
      setTotalWater((prev) => prev + sliderValue);
      setShowAddApa(false);
    } catch (error) {
      console.error('err- logarea apei:', error);
    }
  };
  const openMealModal = async (mealType: string) => {
    if (!userId) {return;}
    try {
      const docId = `${userId}_${isoDate}`;
      const nutritionRef = doc(db, 'nutrition_logs', docId);
      const snap = await getDoc(nutritionRef);

      if (snap.exists()) {
        const data = snap.data();
        const allMeals: MealItem[] = data?.meals || [];
        const filtered = allMeals.filter((m) => m.mealType === mealType);
        setMealItems(filtered);
      } else {
        setMealItems([]);
      }
      setMealModalType(mealType);
      setShowMealModal(true);
    } catch (error) {
      console.error('err- openMealModal:', error);
    }
  };
  const handleRemoveItem = async (item: MealItem) => {
    if (!userId) {return;}
    try {
      const docId = `${userId}_${isoDate}`;
      const nutritionRef = doc(db, 'nutrition_logs', docId);

      await setDoc(
        nutritionRef,
        {
          meals: arrayRemove(item),
          total_calories: increment(-item.calories),
          ...(item.carbs ? { total_carbs: increment(-item.carbs) } : {}),
          ...(item.fats ? { total_fats: increment(-item.fats) } : {}),
          ...(item.protein ? { total_protein: increment(-item.protein) } : {}),
        },
        { merge: true }
      );
      setMealItems((prev) => prev.filter((m) => m !== item));
      setCaloriiMancate((prev) => prev - item.calories);
    } catch (error) {
      console.error('err- handleRemoveItem:', error);
    }
  };
  function getMealModalImage(type: string) {
    switch (type) {
      case 'breakfast':
        return require('../icons/breakiee.png');
      case 'lunch':
        return require('../icons/lunchh.png');
      case 'dinner':
        return require('../icons/dinner.png');
      case 'snacks':
        return require('../icons/snackkk.png');
      case 'reteta':
        return require('../icons/add_food.png');
      default:
        return require('../icons/Jurnal.png');
    }
  }
  const mese = [
    { title: 'mic dejun 🥞', type: 'breakfast' },
    { title: 'prânz 🥪',    type: 'lunch'     },
    { title: 'cină 🥘',    type: 'dinner'    },
    { title: 'gustări 🧁', type: 'snacks'    },
  ];

  const { height } = Dimensions.get('window');

  const styles = StyleSheet.create({
    safeArea: {
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
      height: Platform.OS === 'android' ? 0.15 * height : 0.22 * height,
      resizeMode: 'stretch',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomColor: '#1C4B82',
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 0,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1C4B82',
      marginLeft: 120,
    },
    scrollContainer: {
      padding: 16,
    },
    card: {
      padding: 15,
      marginTop: 3,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#1C4B82',
      borderRadius: 8,
      backgroundColor: '#FFF',
    },
    mfpTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1C4B82',
      textAlign: 'center',
      marginBottom: 10,
    },
    mfpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mfpColumn: {
      alignItems: 'center',
      marginHorizontal: 6,
    },
    mfpNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1C4B82',
    },
    mfpLabel: {
      fontSize: 14,
      color: '#444',
      marginTop: 2,
    },
    mfpOperator: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1C4B82',
      marginHorizontal: 4,
    },
    mealTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1C4B82',
      marginBottom: 8,
    },
    addBtn: {
      backgroundColor: '#D7EDFA',
      borderRadius: 5,
      paddingVertical: 10,
      marginTop: 8,
      width: '102%',
      alignSelf: 'center',
    },
    addBtnLabel: {
      color: '#1C4B82',
      fontWeight: '600',
      fontSize: 14,
    },
    recomSubtext: {
      fontSize: 14,
      color: '#0059a9',
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContainer: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: '50%',
      maxHeight: '80%',
      paddingTop: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomColor: '#1C4B82',
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    modalHeaderTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1C4B82',
    },
    headerSeparator: {
      height: 1,
      backgroundColor: '#1C4B82',
      opacity: 0.1,
    },
    modalBackgroundImage: {
      position: 'absolute',
      marginTop: 60,
      top: 60,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height:250,
      resizeMode: 'contain',
      opacity: 0.2,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    modalContent: {
      flex: 1,
      padding: 16,
      justifyContent: 'flex-start',
    },
    subHeader: {
      fontSize: 16,
      color: '#1C4B82',
      fontWeight: 'bold',
      textAlign: 'center',
      paddingVertical: 5,
      marginBottom: 10,
      marginTop: 18,
      borderRadius: 5,
    },
    trackStyle: {
      height: 5,
      backgroundColor: '#ccc',
    },
    thumbStyle: {
      height: 24,
      width: 24,
      backgroundColor: 'transparent',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#469FCC',
    },
    sliderText: {
      textAlign: 'center',
      marginTop: 10,
      fontSize: 16,
      color: '#1C4B82',
    },
    logButton: {
      backgroundColor: '#D7EDFA',
      borderRadius: 5,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignSelf: 'center',
      marginTop: 20,
      width: '100%',
      alignItems: 'center',
    },
    logButtonText: {
      color: '#1C4B82',
      fontSize: 16,
      fontWeight: '600',
    },
    summaryCard: {
      marginTop: 80,
      padding: 15,
      borderWidth: 1,
      borderColor: '#1C4B82',
      borderRadius: 8,
      backgroundColor: '#FFF',
    },
    summaryText: {
      fontWeight: 'bold',
      fontSize: 15,
      color: '#1C4B82',
      textAlign: 'center',
    },

    // MEAL LOG MODAL
    mealLogRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomColor: '#ccc',
      borderBottomWidth: 1,
      alignItems: 'center',
    },
    logFoodName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
    },
    logFoodDetails: {
      fontSize: 14,
      color: '#444',
    },
    removeBtn: {
      backgroundColor: '#F8D7DA',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 5,
      marginLeft: 10,
    },
    removeBtnText: {
      color: '#900',
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image source={require('../icons/Jurnal.png')} style={styles.topLeftImage} />
      <View style={styles.header}>
        <ButonInapoi />
        <Text style={styles.headerTitle}>Jurnal</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Text style={styles.mfpTitle}>{textTitle}</Text>
          <View style={styles.mfpRow}>
            <View style={styles.mfpColumn}>
              <Text style={styles.mfpNumber}>{caloriiObiectiv}</Text>
              <Text style={styles.mfpLabel}>Necesar</Text>
            </View>
            <Text style={styles.mfpOperator}>-</Text>
            <View style={styles.mfpColumn}>
              <Text style={styles.mfpNumber}>{caloriiMancate}</Text>
              <Text style={styles.mfpLabel}>Consum</Text>
            </View>
            <Text style={styles.mfpOperator}>+</Text>
            <View style={styles.mfpColumn}>
              <Text style={styles.mfpNumber}>{caloriiArse}</Text>
              <Text style={styles.mfpLabel}>Ars</Text>
            </View>
            <Text style={styles.mfpOperator}>=</Text>
            <View style={styles.mfpColumn}>
              <Text style={styles.mfpNumber}>{totalCaloriesRamase}</Text>
              <Text style={styles.mfpLabel}>Rămas</Text>
            </View>
          </View>
        </Card>
        {mese.map((meal, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.9}
            onPress={() => openMealModal(meal.type)}
          >
            <Card style={styles.card}>
              <Text style={styles.mealTitle}>{meal.title}</Text>
              <Button
                label="+ adaugă"
                style={styles.addBtn}
                labelStyle={styles.addBtnLabel}
                onPress={() => {
                  navigation.navigate('AddMancare', {
                    mealType: meal.type,
                    date: isoDate,
                  });
                }}
              />
            </Card>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => openMealModal('reteta')}
        >
          <Card style={styles.card}>
            <Text style={styles.mealTitle}>din rețetele recomandate 📰</Text>
            <Text style={styles.recomSubtext}>
              Verificați meniul, se vor adăuga automat valorile nutriționale 🍱
            </Text>
          </Card>
        </TouchableOpacity>
        <Card style={styles.card}>
          <Text style={styles.mealTitle}>apă consumată azi: {totalWater} ml.</Text>
          <Button
            label="+ adaugă 💧"
            style={styles.addBtn}
            labelStyle={styles.addBtnLabel}
            onPress={() => {
              setSliderValue(0);
              setShowAddApa(true);
            }}
          />
        </Card>
      </ScrollView>
      <Modal
        visible={showAddApa}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddApa(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddApa(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowAddApa(false)} />
                  <Text style={styles.modalHeaderTitle}>
                    Înregistrează apa consumată
                  </Text>
                </View>
                <View style={styles.headerSeparator} />
                <Image
                  source={require('../icons/apa.png')}
                  style={styles.modalBackgroundImage}
                />
                <KeyboardAvoidingView
                  style={styles.modalContent}
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                  <Text style={styles.subHeader}>Selectează cantitatea băută (ml)</Text>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    minimumValue={0}
                    maximumValue={waterGoal || 2000}
                    step={50}
                    trackStyle={styles.trackStyle}
                    thumbStyle={styles.thumbStyle}
                  />
                  <Text style={styles.sliderText}>
                    Logați {sliderValue} ml 🚰
                  </Text>
                  <TouchableOpacity style={styles.logButton} onPress={handleLogWater}>
                    <Text style={styles.logButtonText}>+ adaugă apă</Text>
                  </TouchableOpacity>
                  <Card style={styles.summaryCard}>
                    <Text style={styles.summaryText}>
                      Azi ați consumat {totalWater} ml din necesarul de{' '}
                      {waterGoal !== null ? `${waterGoal} ml` : '...'}!
                    </Text>
                  </Card>
                </KeyboardAvoidingView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        visible={showMealModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMealModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMealModal(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowMealModal(false)} />
                  <Text style={styles.modalHeaderTitle}>
                    Log {mealModalType === 'breakfast' ? 'mic dejun' :
                        mealModalType === 'lunch' ? 'prânz' :
                        mealModalType === 'dinner' ? 'cină' :
                        mealModalType === 'snacks' ? 'gustări' : 'aliment'}</Text>
                </View>
                <View style={styles.headerSeparator} />
                <Image
                  source={getMealModalImage(mealModalType)}
                  style={styles.modalBackgroundImage}
                />
                <KeyboardAvoidingView
                  style={styles.modalContent}
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                  {mealItems.length === 0 ? (
                    <Text style={styles.subHeader}>
                      Nu există nimic logat la această masă.
                    </Text>
                  ) : (
                    mealItems.map((food, idx) => (
                      <View key={idx} style={styles.mealLogRow}>
                        <View style={{ flex: 3 }}>
                          <Text style={styles.logFoodName}>{food.foodName}</Text>
                          <Text style={styles.logFoodDetails}>
                            porție: {food.servingSize} g - calorii: {food.calories}
                          </Text>
                          {(food.protein || food.carbs || food.fats) && (
                            <Text style={styles.logFoodDetails}>
                              proteină: {food.protein ?? 0}g, grăsimi: {food.fats ?? 0}g, carbohidrați: {food.carbs ?? 0}g
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => handleRemoveItem(food)}
                        >
                          <Text style={styles.removeBtnText}>Șterge</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </KeyboardAvoidingView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default Jurnal;

