import { useEffect } from 'react';
import { Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/core';

export type RootStackParamList = {
  Obiective: undefined;
  Jurnal: { date: string };
};
const LipsaLog = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const currentDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Alert.alert(
      'Ne pare rău, nu ați logat nimic ziua aceasta. 😣',
      '',
      [
        {
          text: 'Înapoi',
          style: 'cancel',
          onPress: () => navigation.navigate('Obiective'),
        },
      ],
      { cancelable: false }
    );
  }, [navigation, currentDate]);
  return null;
};

export default LipsaLog;
