// screens/CardManagement.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function CardManagement() {
  const [blocked, setBlocked] = useState(false);

  const handleBlockToggle = () => setBlocked(!blocked);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card Management</Text>
      <Text style={styles.cardNumber}>Card Number: 1234 5678 9012 3456</Text>

      <TouchableOpacity
        style={[styles.blockButton, { backgroundColor: blocked ? '#D32F2F' : colors.primaryGreen }]}
        onPress={handleBlockToggle}
      >
        <Text style={styles.blockText}>{blocked ? 'Unblock Card' : 'Block Card'}</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        <TouchableOpacity style={styles.optionBox}>
          <Text style={styles.optionTitle}>Unblock Card</Text>
          <Text style={styles.optionDesc}>Reactivate your card</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionBox}>
          <Text style={styles.optionTitle}>Replace Card</Text>
          <Text style={styles.optionDesc}>Request a new card</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.accentLight, padding: 20 },
  title: { fontSize: 22, color: colors.primaryBlue, marginBottom: 10 },
  cardNumber: { color: colors.textDark, marginBottom: 20 },
  blockButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  blockText: { color: colors.white, fontWeight: 'bold' },
  options: { marginTop: 30 },
  optionBox: { backgroundColor: colors.white, padding: 15, borderRadius: 8, marginVertical: 10 },
  optionTitle: { color: colors.primaryBlue, fontWeight: 'bold' },
  optionDesc: { color: colors.textDark },
});