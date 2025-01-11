import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { View, Text } from 'react-native';
import useFonts from './src/hooks/usefonts.js';
import './src/i18n/i18n.js';

export default function App() {
  const fontsLoaded = useFonts();
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }
  return <AppNavigator />;
}
