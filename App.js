import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import GoogleAuth from './screens/GoogleAuth';
import Profile from './screens/Profile';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="GoogleAuth">
        <Stack.Screen 
          name="GoogleAuth" 
          component={GoogleAuth}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Profile" 
          component={Profile}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}