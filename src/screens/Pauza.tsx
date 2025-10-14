import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const { height } = Dimensions.get('window');

const Pose1 = () => (
    <Svg viewBox="0 0 460.16 460.16" width={height * 0.6} height={height * 0.6}>
      <G>
        <Path d="M321.137,226.403l-29.642-56.813c-2.633-5.431-7.292-8.675-12.216-11.529l-47.704-27.182l0.34-63.578
        l51.523-41.241c6.309-5.051,7.33-14.261,2.279-20.571c-5.049-6.309-14.258-7.332-20.57-2.279l-56.974,45.605
        c-3.448,2.759-5.465,6.929-5.489,11.346l-0.43,80.337l-62.176,109.12c-1.283,2.736-2.716,4.665-2.716,9.894v181.132
        c0,10.777,8.736,19.512,19.512,19.512c10.777,0,19.512-8.736,19.512-19.512V277.318l8.108,4.619l22.001,161.344
        c1.457,10.686,11.302,18.153,21.969,16.697c10.677-1.456,18.153-11.292,16.697-21.969l-21.785-159.76l8.861-15.552l78.692-15.155
        c4.54-0.875,8.4-3.843,10.411-8.007C323.351,235.371,323.276,230.502,321.137,226.403z M251.316,229.217l19.981-35.068
        l14.801,28.369L251.316,229.217z" fill="#1C4B82"/>
        <Circle cx="274.293" cy="101.481" r="33.864" fill="#FFB578"/>
      </G>
    </Svg>
  );

  const Pose2 = () => (
    <Svg viewBox="0 0 461.372 461.372" width={height * 0.6} height={height * 0.6}>
      <G>
        <Circle cx="268.639" cy="88.833" r="34.661" fill="#FFB578" />
        <Path d="M356.368,0.088c-8.481-0.903-16.075,5.249-16.971,13.725l-7.812,73.865l-38.203,49.665l-69.216,0.117
        l-61.068,4.803l-50.993-19.35c-7.969-3.026-16.881,0.984-19.905,8.954c-3.024,7.969,0.985,16.882,8.954,19.906l54.228,20.578
        c2.121,0.805,4.4,1.136,6.686,0.957l62.098-4.885v110.099L185.846,436.57c-2.612,10.771,4.003,21.621,14.775,24.232
        c1.589,0.385,3.18,0.57,4.745,0.57c9.048,0,17.261-6.162,19.487-15.345l39.439-165.139h8.684v160.416
        c0,11.083,8.985,20.068,20.069,20.068s20.068-8.985,20.068-20.068l-0.364-278.511l45.96-59.748
        c1.737-2.258,2.815-4.953,3.115-7.787l8.271-78.198C370.99,8.583,364.846,0.984,356.368,0.088z"
        fill="#1C4B82" />
      </G>
    </Svg>
  );

const Pauza: React.FC = () => {
  const navigation = useNavigation();
  const [countdown, setCountdown] = useState(10);
  const [svgIndex, setSvgIndex] = useState(0);

  useEffect(() => {
    const svgInterval = setInterval(() => {
      setSvgIndex(prev => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(svgInterval);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigation]);



  return (
    <View style={styles.container}>
      <Animated.View
        key={svgIndex}
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(500)}
        style={styles.svgWrapper}
      >
        {svgIndex === 0 ? <Pose1 /> : <Pose2 />}
      </Animated.View>
      <Text style={styles.text}>Luați o pauză ⏱️</Text>
      <Text style={styles.counter}>{countdown}</Text>
    </View>
  );
};

export default Pauza;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  text: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1C4B82',
  },
  counter: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#1C4B82',
    marginTop: 8,
  },
});
