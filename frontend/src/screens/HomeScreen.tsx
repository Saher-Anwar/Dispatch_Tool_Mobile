import React from 'react';
import { Text, View } from 'react-native';

export const HomeScreen = () => {
  return (
    <View className={styles.container}>
      <Text className={styles.title}>Homescreen</Text>
    </View>
  );
};

const styles = {
  container: `flex-1 items-center justify-center bg-white`,
  title: `text-3xl font-bold text-gray-800`,
};