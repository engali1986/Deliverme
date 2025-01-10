import React,{useState} from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import I18n, { setLanguage } from '../utils/localization';

const HomeScreen = ({ navigation }) => {
  const [currentLang, setCurrentLang] = useState(I18n.locale);
  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
    setCurrentLang(newLang);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{I18n.t('welcome')}</Text>
      <Button title={I18n.t('signup')} onPress={() => navigation.navigate('Signup')} />
      <Button title={I18n.t('changeLanguage')} onPress={toggleLanguage} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default HomeScreen;
