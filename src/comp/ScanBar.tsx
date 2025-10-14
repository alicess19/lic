/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useCameraDevices, Camera, useCodeScanner } from 'react-native-vision-camera';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import Svg, { Path } from 'react-native-svg';

type ScanBarProps = {
    onDetected: (code: string) => void;
    onClose: () => void;
  };
  const ScanBar = ({ onDetected, onClose }: ScanBarProps) => {
    const devices = useCameraDevices();
    const device = devices.find((d) => d.position === 'back');
  const [permission, setPermission] = useState(false);
  const scannedOnce = useRef(false);
  useEffect(() => {
    Camera.requestCameraPermission().then(status => {
        setPermission(status === 'granted');
      });
  }, []);
  const checkFoodDatabase = async (barcode: string): Promise<boolean> => {
    try {
        const q = query(collection(db, 'food_database'), where('barcode', '==', barcode));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('err- verif cod firebase:', error);
      return false;
    }
  };

    const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'qr'],
    onCodeScanned: async (codes) => {
        if (scannedOnce.current || codes.length === 0 || !codes[0].value) {return;}

        scannedOnce.current = true;
        const value = codes[0].value;

        const found = await checkFoodDatabase(value);

        Alert.alert(
        found ? 'Găsit în baza de date!' : 'Cod nou',
        found ? `Cod: ${value}` : `Codul ${value} nu a fost găsit.`,
        [
            {
            text: 'OK',
            onPress: () => {
                onDetected(value);
                onClose();
                scannedOnce.current = false;
            },
            },
        ],
        { cancelable: false }
        );
    },
    });

    const svgNouLuri = (style: any, _rotation: string) => (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 15 15"
        fill="none"
        style={[styles.corner, style]}
      >
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.1 3C10.5283 3 10.8194 3.00039 11.0445 3.01878C11.2637 3.03669 11.3758 3.06915 11.454 3.10899C11.6422 3.20487 11.7951 3.35785 11.891 3.54601C11.9309 3.62421 11.9633 3.73631 11.9812 3.95552C11.9996 4.18056 12 4.47171 12 4.9V5.5C12 5.77614 12.2239 6 12.5 6C12.7761 6 13 5.77614 13 5.5V4.87935C13 4.47687 13 4.14469 12.9779 3.87409C12.9549 3.59304 12.9057 3.33469 12.782 3.09202C12.5903 2.7157 12.2843 2.40973 11.908 2.21799C11.6653 2.09434 11.407 2.04506 11.1259 2.0221C10.8553 1.99999 10.5231 1.99999 10.1207 2H10.1H9.5C9.22386 2 9 2.22386 9 2.5C9 2.77614 9.22386 3 9.5 3H10.1ZM5.5 2H4.87935C4.47686 1.99999 4.14468 1.99999 3.87409 2.0221C3.59304 2.04506 3.33469 2.09434 3.09202 2.21799C2.7157 2.40973 2.40973 2.7157 2.21799 3.09202C2.09434 3.33469 2.04506 3.59304 2.0221 3.87409C1.99999 4.14468 1.99999 4.47686 2 4.87934V5.5C2 5.77614 2.22386 6 2.5 6C2.77614 6 3 5.77614 3 5.5V4.9C3 4.47171 3.00039 4.18056 3.01878 3.95552C3.03669 3.73631 3.06915 3.62421 3.10899 3.54601C3.20487 3.35785 3.35785 3.20487 3.54601 3.10899C3.62421 3.06915 3.73631 3.03669 3.95552 3.01878C4.18056 3.00039 4.47171 3 4.9 3H5.5C5.77614 3 6 2.77614 6 2.5C6 2.22386 5.77614 2 5.5 2Z"
          fill="#1C4B82"
        />
      </Svg>
    );

  if (!device || !permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Se încarcă camera...</Text>
      </View>
    );
  }
  return (
    <>
    <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity
              onPress={onClose}
              style={{
                  position: 'absolute',
                  top: 40,
                  left: 20,
                  backgroundColor: '#1C4B82',
                  padding: 10,
                  borderRadius: 8,
                  zIndex: 99,
                  marginTop: 20,
              }}
          >
              <Text style={{ color: '#fff', fontSize: 16 }}>Închide</Text>
          </TouchableOpacity>

          <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              codeScanner={codeScanner} />
          {svgNouLuri({ top: '0%', left: '0%', bottom: '20%', right: '20%'}, '0deg')}
          {svgNouLuri({ top: '10%', left: '0%', bottom: '20%', right: '20%', transform: [{ rotate: '180deg' }] }, '180deg')}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  corner: {
    position: 'absolute',
  },
  text: { fontSize: 16 },
});

export default ScanBar;
