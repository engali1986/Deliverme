import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import i18n from '../i18n/i18n';
import {driverSignin, verifyDriver} from "../services/api.js"

const DriverSigninScreen = () => {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [email,setEmail]=useState("")
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const navigation = useNavigation();
  
  const handleSignIn = async () => {
    try {
      console.log("DriverSigninScreen.js mobile, password:", mobile, password)
      const response = await driverSignin({ mobile, password });

      if (response.driverVerified) {
        Toast.show({ type: "success", text1: "Sign-In Successful", text2: "Welcome back!",props: { showIcon: true } });
        navigation.navigate("DriverHome"); // Redirect to home
      } else {
        setEmail(response.email)
        setIsVerifying(true);
        Toast.show({ type: "info", text1: "Verification Required", text2: "Please verify your account first.", props: { showIcon: true }  });
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Sign-In Failed", text2: error.message, props: { showIcon: true }  });
    }
  };

  const handleVerify = async () => {
    try {
      const response = await verifyDriver({ mobile:mobile, email:null, verificationCode });
      console.log("DriverSigninScreen.js handleVerify response", response)
      console.log("DriverSigninScreen.js handleVerify response", response.message)
      Toast.show({ type: "success", text1: "Verification Successful", text2: "You can now sign in." });
    } catch (error) {
      Toast.show({ type: "error", text1: "Verification Failed", text2: error.message });
    }
  };
  
    return (
    <View style={styles.container}>
       {!isVerifying?(
        <>
        <Text style={styles.title}>{i18n.t('driverSignIn')}</Text>
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
          onPress={() => navigation.navigate('DriverSignup')}
        />
        </>
      ):(<>
      <Text style={styles.title}>{i18n.t('verify_account')}</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('verification_code')}
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
          />
          <Button title={i18n.t('verify')} onPress={handleVerify} />
      </>)}

    </View>
    )
     
      
    
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
  
  export default DriverSigninScreen;