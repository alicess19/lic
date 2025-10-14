import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { navigationRef } from '../navigation/AppNavigation';

type ButonInapoiProps = {popToTop?: boolean;};
export default function ButonInapoi({ popToTop = false }: ButonInapoiProps) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  const handleBackPress = () => {
    if (popToTop) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      });
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };
  return (
    <TouchableOpacity
      onPress={handleBackPress}
      style={styles.button}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="#1C4B82"
        width={24}
        height={24}
      >
        <Path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33z"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    height: 32,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
