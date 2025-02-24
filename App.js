import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import SplashScreen from './src/screens/SplashScreen';
import MainEmailScreen from './src/screens/MainEmailScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EmailDetailScreen from './src/screens/EmailDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
            }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="MainEmail" component={MainEmailScreen} />
            <Stack.Screen name="Compose" component={ComposeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen 
              name="EmailDetail"
              component={EmailDetailScreen}
              options={{
                presentation: 'card',
                animation: 'slide_from_right'
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}