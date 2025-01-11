import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import i18n from '../i18n/i18n.js';
import LanguageToggle from '../components/LanguageToggle.js';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('home_title')}</Text>
      <LanguageToggle />
      <Button title={i18n.t('client_signup')} onPress={() => navigation.navigate('ClientSignup')} />
      <Button title={i18n.t('driver_signup')} onPress={() => navigation.navigate('DriverSignup')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
