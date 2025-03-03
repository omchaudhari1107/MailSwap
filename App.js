// import React from 'react';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { Provider as PaperProvider } from 'react-native-paper';
// import SplashScreen from './src/screens/SplashScreen';
// import MainEmailScreen from './src/screens/MainEmailScreen';
// import ComposeScreen from './src/screens/ComposeScreen';
// import ProfileScreen from './src/screens/ProfileScreen';
// import EmailDetailScreen from './src/screens/EmailDetailScreen';

// const Stack = createNativeStackNavigator();

// export default function App() {
//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <PaperProvider>
//         <NavigationContainer>
//           <Stack.Navigator
//             initialRouteName="Splash"
//             screenOptions={{
//               headerShown: false,
//             }}>
//             <Stack.Screen name="Splash" component={SplashScreen} />
//             <Stack.Screen name="MainEmail" component={MainEmailScreen} />
//             <Stack.Screen name="Compose" component={ComposeScreen} />
//             <Stack.Screen name="Profile" component={ProfileScreen} />
//             <Stack.Screen 
//               name="EmailDetail"
//               component={EmailDetailScreen}
//               options={{
//                 presentation: 'card',
//                 animation: 'slide_from_right'
//               }}
//             />
//           </Stack.Navigator>
//         </NavigationContainer>
//       </PaperProvider>
//     </GestureHandlerRootView>
//   );
// }


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import GoogleAuth from './src/screens/GoogleAuth';
import MainEmailScreen from './src/screens/MainEmailScreen';
import EmailDetail from './src/screens/EmailDetailScreen';
import Compose from './src/screens/ComposeScreen';
import Profile from './src/screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="GoogleAuth"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' }
        }}
      >
        <Stack.Screen 
          name="GoogleAuth" 
          component={GoogleAuth}
        />
        <Stack.Screen 
          name="MainEmailScreen" 
          component={MainEmailScreen}
          options={{
            gestureEnabled: false, // Prevent going back to auth screen
          }}
        />
        <Stack.Screen 
          name="EmailDetail" 
          component={EmailDetail}
        />
        <Stack.Screen 
          name="Compose" 
          component={Compose}
        />
        <Stack.Screen 
          name="Profile" 
          component={Profile}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
