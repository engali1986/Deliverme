import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator.js';
import { initializeLanguage } from './src/i18n/i18n.js';
import { LanguageProvider } from './src/context/LanguageContext.js';
import './src/i18n/i18n.js';

export default function App() {
  const [loading, setLoading] = useState(true); // Always call useState at the top

  useEffect(() => {
    const loadLanguage = async () => {
      await initializeLanguage();
      setLoading(false);
    };
    loadLanguage();
  }, []); // Always call useEffect in the same order

  // Conditional rendering happens here, not before hooks
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <AppNavigator />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
