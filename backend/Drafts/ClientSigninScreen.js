import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import i18n from '../i18n/i18n';
const ClientSigninScreen = () => {
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const navigation = useNavigation();
  
    const handleSignIn = () => {
      // TODO: Add sign-in logic
      console.log(i18n.t('clientSignInSuccess'), mobile);
    };
  
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('clientSignIn')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('mobile_number')}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title={i18n.t('signIn')} onPress={handleSignIn} />
        <Button
          title={i18n.t('signUp')}
          onPress={() => navigation.navigate('ClientSignup')}
        />
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 24,
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      marginBottom: 10,
      paddingHorizontal: 10,
    },
  });
  
  export default ClientSigninScreen;