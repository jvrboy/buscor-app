// screens/VirtualTapIn.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import colors from '../theme/colors';

export default function VirtualTapIn({ navigation }) {
  const [expiry, setExpiry] = useState(90);
  const [token, setToken] = useState('BUSCOR-TAP-' + Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setExpiry(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Virtual Tap-In</Text>
      <Text style={styles.subtitle}>Tap to Ride</Text>
      <View style={styles.qrContainer}>
        <QRCode value={token} size={200} />
      </View>
      <Text style={styles.expiry}>Expires in {expiry}s</Text>
      <TouchableOpacity style={styles.nfcButton}>
        <Text style={styles.nfcText}>Use NFC</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('CardManagement')}>
        <Text style={styles.backText}>Manage Card</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryBlue, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, color: colors.white, marginBottom: 10 },
  subtitle: { fontSize: 18, color: colors.white, marginBottom: 20 },
  qrContainer: { backgroundColor: colors.white, padding: 20, borderRadius: 12 },
  expiry: { color: colors.white, marginTop: 15 },
  nfcButton: { backgroundColor: colors.primaryGreen, padding: 12, borderRadius: 8, marginTop: 20 },
  nfcText: { color: colors.white, fontWeight: 'bold' },
  backButton: { marginTop: 30 },
  backText: { color: colors.white, textDecorationLine: 'underline' },
});