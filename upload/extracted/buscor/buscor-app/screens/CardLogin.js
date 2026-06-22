// screens/CardLogin.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function CardLogin({ navigation }) {
  const [cardNumber, setCardNumber] = useState('');
  const [pin, setPin] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buscor Card Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Card Number"
        value={cardNumber}
        onChangeText={setCardNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter PIN"
        secureTextEntry
        value={pin}
        onChangeText={setPin}
      />
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('BuyTickets')}>
        <Text style={styles.buttonText}>LOGIN</Text>
      </TouchableOpacity>
      <Text style={styles.link}>Register Your Card</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryBlue },
  title: { fontSize: 24, color: colors.white, marginBottom: 20 },
  input: { width: '80%', backgroundColor: colors.white, padding: 10, marginVertical: 10, borderRadius: 8 },
  button: { backgroundColor: colors.primaryGreen, padding: 12, borderRadius: 8, width: '80%', alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: 'bold' },
  link: { color: colors.white, marginTop: 15 },
});