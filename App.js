import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PromptScreen from './screens/PromptScreen';
import EmailScreen from './screens/EmailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Prompt">
          <Stack.Screen 
            name="Prompt" 
            component={PromptScreen}
            options={{ title: 'Email Generator' }}
          />
          <Stack.Screen 
            name="Email" 
            component={EmailScreen}
            options={{ title: 'Generated Email' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
