import i18n from 'i18n-js';
import * as Localization from 'expo-localization';
import translations from './translations.json';

i18n.fallbacks = true;
i18n.translations = translations;
i18n.locale = Localization.locale;

export default i18n;
