// screens/BuyTickets.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function BuyTickets({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buy Tickets</Text>
      <View style={styles.ticketBox}>
        <Text>Single Ride Ticket — R12.00</Text>
        <TouchableOpacity style={styles.buyButton}>
          <Text style={styles.buyText}>Buy</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.ticketBox}>
        <Text>Multi-Ride Bundle — R100.00 (10 Trips)</Text>
        <TouchableOpacity style={styles.buyButton}>
          <Text style={styles.buyText}>Buy</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={() => navigation.navigate('VirtualTapIn')}>
        <Text style={styles.nextText}>Go to Tap-In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.accentLight, padding: 20 },
  title: { fontSize: 22, color: colors.primaryBlue, marginBottom: 20 },
  ticketBox: { backgroundColor: colors.white, padding: 15, marginVertical: 10, borderRadius: 8 },
  buyButton: { backgroundColor: colors.primaryGreen, padding: 8, borderRadius: 6, marginTop: 10, alignItems: 'center' },
  buyText: { color: colors.white },
  nextButton: { backgroundColor: colors.primaryBlue, padding: 12, borderRadius: 8, marginTop: 30, alignItems: 'center' },
  nextText: { color: colors.white, fontWeight: 'bold' },
});