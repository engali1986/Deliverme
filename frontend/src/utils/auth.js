import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';
/**
 * Logs the user out by clearing AsyncStorage and navigating to Home screen.
 * @param {object} navigation - Navigation object from React Navigation.
 */
export const handleLogout = async (navigation) => {
    Toast.show({
      type: "info",
      text1: "Logging Out",
      text2: "You have been signed out.",
      visibilityTime: 1500,
    });
  
    setTimeout(async () => {
      try {
        await AsyncStorage.clear();
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }, 1500); // Match toast visibility time
  };