import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View className={styles.container}>
      <Text className={styles.title}>Homescreen</Text>
      <TouchableOpacity 
        className={styles.button}
        onPress={() => navigation.navigate('AddressForm' as never)}
      >
        <Text className={styles.buttonText}>Go to Address Form</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  container: `flex-1 items-center justify-center bg-white`,
  title: `text-3xl font-bold text-gray-800 mb-8`,
  button: `bg-blue-600 px-6 py-3 rounded-lg`,
  buttonText: `text-white font-semibold text-base`,
};