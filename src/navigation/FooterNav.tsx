import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



type RootStackParamList = {
  HomeScreen: undefined;
  Exercitii: undefined;
  ReteteSugerate: undefined;
  PlanSugerat: undefined;
  Profil: undefined;
};
const FooterNav = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const navigateToScreen = (screenName: keyof RootStackParamList) => {
    navigation.push(screenName);
  };

  return (
    <View style={[styles.footerContainer, { bottom: insets.bottom + 5 }]}>
      <View style={styles.footerContent}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigateToScreen('Exercitii')}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path fill="#1C4B82" d="M19,7H14v4H10V7H5V8H2v8H5v1h5V13h4v4h5V16h3V8H19ZM4,14V10H5v4Zm4,1H7V9H8Zm8-6h1v6H16Zm4,1v4H19V10Z" />
          </Svg>
          <Text style={styles.buttonText}>exerciții</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigateToScreen('ReteteSugerate')}
        >
          <Svg width={24} height={24} viewBox="0 0 20 20">
            <Path fill="#1C4B82" d="M7 4.5c-.3 0-.5.3-.5.5v2.5h-1V5c0-.3-.2-.5-.5-.5s-.5.3-.5.5v2.5h-1V5c0-.3-.2-.5-.5-.5s-.5.3-.5.5v3.3c0 .9.7 1.6 1.5 1.7v7c0 .6.4 1 1 1s1-.4 1-1v-7c.8-.1 1.5-.8 1.5-1.7V5c0-.2-.2-.5-.5-.5zM9 5v6h1v6c0 .6.4 1 1 1s1-.4 1-1V2c-1.7 0-3 1.3-3 3zm7-1c-1.4 0-2.5 1.5-2.5 3.3-.1 1.2.5 2.3 1.5 3V17c0 .6.4 1 1 1s1-.4 1-1v-6.7c1-.7 1.6-1.8 1.5-3C18.5 5.5 17.4 4 16 4z" />
          </Svg>
          <Text style={styles.buttonText}>rețete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigateToScreen('HomeScreen')}
        >
          <Svg width={24} height={24} viewBox="0 0 1200 1200">
            <Path fill="#1C4B82" d="M600,0L56.645,422.323V1200h373.829V730.541h339.054V1200h373.828V422.323L600,0z" />
          </Svg>
          <Text style={styles.buttonText}>acasă</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigateToScreen('PlanSugerat')}
        >
          <Svg width={24} height={24} viewBox="0 0 100 100">
            <Path fill="#1C4B82" d="M39,32H61a2,2,0,0,0,2-2V26a6,6,0,0,0-6-6H43a6,6,0,0,0-6,6v4A2,2,0,0,0,39,32Zm33-7H70a.94.94,0,0,0-1,1v4a8,8,0,0,1-8,8H39a8,8,0,0,1-8-8V26a.94.94,0,0,0-1-1H28a6,6,0,0,0-6,6V74a6,6,0,0,0,6,6H72a6,6,0,0,0,6-6V31A6,6,0,0,0,72,25ZM39,68a2,2,0,0,1-2,2H35a2,2,0,0,1-2-2V66a2,2,0,0,1,2-2h2a2,2,0,0,1,2,2Zm0-10a2,2,0,0,1-2,2H35a2,2,0,0,1-2-2V56a2,2,0,0,1,2-2h2a2,2,0,0,1,2,2Zm0-10a2,2,0,0,1-2,2H35a2,2,0,0,1-2-2V46a2,2,0,0,1,2-2h2a2,2,0,0,1,2,2ZM67,68a2,2,0,0,1-2,2H45a2,2,0,0,1-2-2V66a2,2,0,0,1,2-2H65a2,2,0,0,1,2,2Zm0-10a2,2,0,0,1-2,2H45a2,2,0,0,1-2-2V56a2,2,0,0,1,2-2H65a2,2,0,0,1,2,2Zm0-10a2,2,0,0,1-2,2H45a2,2,0,0,1-2-2V46a2,2,0,0,1,2-2H65a2,2,0,0,1,2,2Z"/>
          </Svg>
          <Text style={styles.buttonText}>plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            console.log('Navigare către Profil');
            navigateToScreen('Profil');
          }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z"
              fill="#1C4B82"
            />
            <Path
              d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z"
              fill="#BFBFBF"
            />
          </Svg>
          <Text style={styles.buttonText}>profil</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#EBF6FD',
    paddingVertical: 10,
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  button: {
    alignItems: 'center',
    minWidth: 55,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 2,
  },
});

export default FooterNav;
