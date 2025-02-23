import React,{useContext} from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import i18n from '../i18n/i18n.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { LanguageContext } from '../context/LanguageContext.js';

export default function HomeScreen({ navigation }) {
  const { language } = useContext(LanguageContext); // Use context to trigger re-render
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('home_title')}</Text>
      <LanguageToggle />
      <Button
        title={i18n.t('clientSignIn')}
        onPress={() => navigation.navigate('ClientSignin')}
      />
      <Button
        title={i18n.t('driverSignIn')}
        onPress={() => navigation.navigate('DriverSignin')}
      />
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
