/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback } from 'react';
import {SafeAreaView, View, FlatList, TouchableOpacity, StyleSheet,TextInput, Modal, Image, ScrollView, TouchableWithoutFeedback,Dimensions, Platform } from 'react-native';
import { KeyboardAwareScrollView, Text } from 'react-native-ui-lib';
import {collection, getDocs, doc, setDoc,increment, arrayUnion} from 'firebase/firestore';
import {useRoute, RouteProp } from '@react-navigation/native';
import { auth, db} from '../firebaseConfig';
import Svg, {Path} from 'react-native-svg';
import ScanBar from '../comp/ScanBar';
import Addfood2db from './Addfood2db';
import BaraSearch from '../comp/BaraSearch';
import ButonInapoi from '../comp/ButonInapoi';

type RootStackParamList = {
  AddMancare: { mealType: string; date?: string };
  Jurnal: { date?: string };
};

type AddMancareRouteProp = RouteProp<RootStackParamList, 'AddMancare'>;

interface FoodItem {
  id: string;
  name: string;
  category?: string;
  allergens?: string;
  calories: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  protein?: number;
  sugar?: number;
  sodium?: number;
}

const AddMancare = () => {
  const route = useRoute<AddMancareRouteProp>();
  const { mealType, date } = route.params || {};
  const mealTitleMap: Record<string, string> = {
    breakfast: 'mic dejun 🥞',
    lunch: 'prânz 🥪',
    dinner: 'cină 🥘',
    snacks: 'gustări 🍦',
  };
  const mealTitle = mealTitleMap[mealType] || 'Adaugă mâncare';
  const mealImageMap: Record<string, any> = {
    breakfast: require('../icons/breakiee.png'),
    lunch: require('../icons/lunchh.png'),
    dinner: require('../icons/dinner.png'),
    snacks: require('../icons/snackkk.png'),
  };
  const mealImage = mealImageMap[mealType] || require('../icons/Jurnal.png');

  const userId = auth.currentUser?.uid;
  const [foodList, setFoodList] = useState<FoodItem[]>([]);
  const [filteredFood, setFilteredFood] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [portionMap, setPortionMap] = useState<{ [key: string]: number }>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  useEffect(() => {
    const fetchFoodDatabase = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'food_database'));
        const foodData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name,
            category: data.category,
            allergens: data.allergens,
            calories: Number(data.calories) || 0,
            carbs: Number(data.carbs) || 0,
            fats: Number(data.fats) || 0,
            fiber: Number(data.fiber) || 0,
            protein: Number(data.protein) || 0,
            sugar: Number(data.sugar) || 0,
            sodium: Number(data.sodium) || 0,
          } as FoodItem;
        });
        setFoodList(foodData);
        setFilteredFood(foodData);
      } catch (error) {
        console.error('err- preluarea alimentelor:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFoodDatabase();
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim().length < 3) {
        setFilteredFood(foodList);
        return;
      }
      const filtered = foodList.filter((food) =>
        food.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredFood(filtered);
    },
    [foodList]
  );

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    const portion = portionMap[item.id] || 100;
    return (
      <View style={styles.foodRow}>
        <TouchableOpacity
          onPress={() => {
            setSelectedFood(item);
            setShowModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.foodText}>{item.name}</Text>
        </TouchableOpacity>
        <View style={styles.bottomRow}>
          <View style={styles.portionContainer}>
            <Text style={styles.portionLabel}>porție (g):</Text>
            <TextInput
              style={styles.portionInput}
              keyboardType="numeric"
              value={String(portion)}
              onChangeText={(val) =>
                setPortionMap((prev) => ({
                  ...prev,
                  [item.id]: Number(val) || 0,
                }))
              }
            />
          </View>
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => handleLogFood(item)}
          >
            <Text style={styles.logButtonText}>+loghează aliment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleLogFood = async (item: FoodItem) => {
    if (!userId) {return;}
    const portion = portionMap[item.id] || 100;
    const portionCalories = Math.round((item.calories / 100) * portion);
    const portionCarbs    = Math.round(((item.carbs ?? 0) / 100) * portion);
    const portionFats     = Math.round((((item.fats ?? 0) / 100) * portion));
    const portionProtein  = Math.round((((item.protein ?? 0) / 100) * portion));
    try {
        const docId = `${userId}_${date}`;
        await setDoc(
          doc(db, 'nutrition_logs', docId),
          {
            uid: userId,
            date,
            meals: arrayUnion({
              foodName: item.name,
              servingSize: portion,
              mealType,
              calories: portionCalories,
              carbs: portionCarbs,
              fats: portionFats,
              protein: portionProtein,
            }),
            total_calories: increment(portionCalories),
            total_carbs:    increment(portionCarbs),
            total_fats:     increment(portionFats),
            total_protein:  increment(portionProtein),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('eroare salvare:', error);
      }
    };
  const handleOutsidePress = () => {
    setShowModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image source={require('../icons/Jurnal.png')} style={styles.topLeftImage} />

      <View style={styles.header}>
        <ButonInapoi />
        <Text style={styles.headerTitle}>{mealTitle}</Text>
      </View>

      <View style={styles.headerSeparator} />
      <View style={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', justifyContent: 'flex-start', paddingHorizontal: 1 }}>
          <View style={{ flex: 1 }}>
            <BaraSearch searchQuery={searchQuery} onSearch={handleSearch} containerStyle={{ height: 50 }} />
          </View>
          <TouchableOpacity onPress={() => setShowScanModal(true)} style={{ padding: 9 }}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              <Path d="M4.4 3A1.4 1.4 0 0 0 3 4.4V6a1 1 0 0 1-2 0V4.4A3.4 3.4 0 0 1 4.4 1H6a1 1 0 0 1 0 2H4.4ZM17 2a1 1 0 0 1 1-1h1.6A3.4 3.4 0 0 1 23 4.4V6a1 1 0 1 1-2 0V4.4A1.4 1.4 0 0 0 19.6 3H18a1 1 0 0 1-1-1ZM2 17a1 1 0 0 1 1 1v1.6A1.4 1.4 0 0 0 4.4 21H6a1 1 0 1 1 0 2H4.4A3.4 3.4 0 0 1 1 19.6V18a1 1 0 0 1 1-1ZM22 17a1 1 0 0 1 1 1v1.6a3.4 3.4 0 0 1-3.4 3.4H18a1 1 0 1 1 0-2h1.6a1.4 1.4 0 0 0 1.4-1.4V18a1 1 0 0 1 1-1ZM18 8a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1ZM15 9a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0V9ZM10 8a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1ZM7 9a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0V9Z" fill="#1C4B82" />
            </Svg>
          </TouchableOpacity>
        </View>

        <Image source={mealImage} style={styles.mealImage} />
        {loading ? (
          <Text style={styles.loadingText}>Se încarcă...</Text>
        ) : (
          <FlatList
            data={filteredFood}
            removeClippedSubviews={false}
            keyExtractor={(_, index) => String(index)}
            renderItem={renderFoodItem}
            style={styles.flatListStyle}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Verificați căutarea!!
              </Text>
            }
          />
        )}
      </View>
      <Modal
        visible={showModal}
        animationType="fade"
        transparent
        onRequestClose={handleOutsidePress}
      >
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <ScrollView>
                  <Text style={styles.modalTitle}>{selectedFood?.name}</Text>
                  <View style={styles.nutriBlock}>
                    <Text style={styles.nutriHeading}>Valori nutriționale</Text>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Categorie:</Text>
                      <Text style={styles.nutriValue}>
                        {selectedFood?.category || '-'}
                      </Text>
                    </View>
                    <View style={styles.nutriLine}>
                    <Text style={styles.nutriLabel}>Calorii(kcal):</Text>
                        <Text style={styles.nutriValue}>
                            {selectedFood?.calories ?? '-'}
                        </Text>
                    </View>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Alergeni:</Text>
                      <Text style={styles.nutriValue}>
                      {Array.isArray(selectedFood?.allergens)
                        ? selectedFood.allergens.join(', ')
                        : selectedFood?.allergens}
                      </Text>
                    </View>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Carbohidrați (g):</Text>
                      <Text style={styles.nutriValue}>
                        {selectedFood?.carbs}
                      </Text>
                    </View>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Grăsimi (g):</Text>
                      <Text style={styles.nutriValue}>
                        {selectedFood?.fats}
                      </Text>
                    </View>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Fibre (g):</Text>
                      <Text style={styles.nutriValue}>
                        {selectedFood?.fiber}
                      </Text>
                    </View>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Proteine (g):</Text>
                      <Text style={styles.nutriValue}>
                        {selectedFood?.protein}
                      </Text>
                    </View>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Zahăr (g):</Text>
                      <Text style={styles.nutriValue}>
                        {selectedFood?.sugar}
                      </Text>
                    </View>
                    <View style={styles.nutriLine}>
                      <Text style={styles.nutriLabel}>Sodiu (g):</Text>
                      <Text style={styles.nutriValue}>
                        {selectedFood?.sodium}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        visible={showScanModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowScanModal(false)}
      >
        <ScanBar
          onDetected={async (barcode) => {
            setShowScanModal(false);
            const snapshot = await getDocs(collection(db, 'food_database'));
            const found = snapshot.docs.find((d) => d.data().barcode === barcode);
            if (found) {
              const data = found.data();
              setSearchQuery(data.name);
              handleSearch(data.name);
            } else {
              setScannedBarcode(barcode);
              setShowAddFoodModal(true);
            }
          }}
          onClose={() => setShowScanModal(false)}
        />
      </Modal>
      <Modal
        visible={showAddFoodModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddFoodModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddFoodModal(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
              <KeyboardAwareScrollView>
                <Addfood2db
                  barcode={scannedBarcode}
                  onClose={() => setShowAddFoodModal(false)}
                />
                </KeyboardAwareScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default AddMancare;

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
    height: Platform.OS === 'android' ? 0.15 * height : 0.2 * height,
    resizeMode: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderBottomColor: '#1C4B82',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C4B82',
    textAlign: 'center',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#1C4B82',
    opacity: 0.1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mealImage: {
    alignSelf: 'center',
    width: '70%',
    height: 180,
    borderRadius: 8,
    marginTop: 15,
    marginBottom: -12,
    resizeMode: 'contain',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
  flatListStyle: {
    marginTop: 15,
  },
  foodRow: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D0E6F2',
  },
  foodText: {
    fontSize: 16,
    color: '#1C4B82',
    marginBottom: 6,
    textAlign: 'center',
  },
  calorieText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  portionLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  portionInput: {
    borderWidth: 1,
    borderColor: '#0059a9',
    borderRadius: 8,
    paddingHorizontal: 8,
    color: '#000',
    width: 60,
    height: 36,
    textAlign: 'center',
  },
  logButton: {
    backgroundColor: '#D7EDFA',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '48%',
    alignItems: 'center',
  },
  logButtonText: {
    color: '#1C4B82',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '58%',
    maxHeight: '90%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C4B82',
    textAlign: 'center',
    marginBottom: 10,
  },
  nutriBlock: {
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  nutriHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#55a5d0',
    marginBottom: 31,
    textAlign: 'center',
  },
  nutriLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,75,130,0.3)',
  },
  nutriLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  nutriValue: {
    fontSize: 15,
    color: '#555',
  },
});
