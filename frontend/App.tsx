import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { AddressFormScreen } from './src/screens/AddressFormScreen';
import { NavigationScreen } from './src/screens/NavigationScreen';
import './global.css';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }}/>
          <Stack.Screen name="AddressForm" component={AddressFormScreen} options={{ title: 'Address Form' }}/>
          <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigation' }}/>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
