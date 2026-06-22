// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CardLogin from './screens/CardLogin';
import BuyTickets from './screens/BuyTickets';
import VirtualTapIn from './screens/VirtualTapIn';
import CardManagement from './screens/CardManagement';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="CardLogin" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CardLogin" component={CardLogin} />
        <Stack.Screen name="BuyTickets" component={BuyTickets} />
        <Stack.Screen name="VirtualTapIn" component={VirtualTapIn} />
        <Stack.Screen name="CardManagement" component={CardManagement} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}