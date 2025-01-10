import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import I18n, { setLanguage } from '../utils/localization';

const SignupScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{I18n.t('SignUpScreen')}</Text>
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
  },
});

export default SignupScreen;
