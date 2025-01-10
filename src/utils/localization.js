import * as Localization from 'expo-localization';
import I18n from 'i18n-js';

// Translation files
const translations = {
  en: {
    welcome: 'Welcome to Deliverme!',
    signup: 'Go to Signup',
    changeLanguage: 'Change Language',
    SignUpScreen:'Signup screen'
  },
  ar: {
    welcome: 'مرحبًا بك في Deliverme!',
    signup: 'الذهاب إلى التسجيل',
    changeLanguage: 'تغيير اللغة',
    SignUpScreen:'تسجيل جديد'
  },
};

// Set translations
I18n.translations = translations;
I18n.locale = Localization.locale;
I18n.fallbacks = true;

export const setLanguage = (lang) => {
    I18n.locale = lang;
  };

export default I18n;
