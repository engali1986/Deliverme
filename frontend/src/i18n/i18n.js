import i18n from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from './translations.json';
// Set fallback and translations
i18n.fallbacks = true;
i18n.translations = translations;

// Function to initialize the language
export const initializeLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      if (savedLanguage) {
        i18n.locale = savedLanguage;
      } else {
        i18n.locale = Localization.locale;
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

export default i18n;
