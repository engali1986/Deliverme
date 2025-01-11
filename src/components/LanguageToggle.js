import React, {useState} from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import i18n from '../i18n/i18n.js';

export default function LanguageToggle() {
  const [language, setLanguage] = useState(i18n.locale); // State to track current language

  const toggleLanguage = () => {
    const newLanguage = i18n.locale === 'en' ? 'ar' : 'en';
    i18n.locale = newLanguage;
    setLanguage(newLanguage); // Update state to trigger re-render
  };

  return (
    <TouchableOpacity onPress={toggleLanguage} style={styles.button}>
      <Text style={styles.buttonText}>{i18n.t('language')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
  },
});
