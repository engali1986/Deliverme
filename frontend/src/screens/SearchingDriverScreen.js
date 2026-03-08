import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
} from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LanguageContext } from "../context/LanguageContext.js";
import LanguageToggle from "../components/LanguageToggle.js";
import i18n from "../i18n/i18n";

const { height } = Dimensions.get("window");

const SearchingDriverScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId } = route.params;

  const { language } = useContext(LanguageContext);

  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -250,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();

    Toast.show({
      type: "success",
      text1: i18n.t("logout_success"),
      text2: i18n.t("logout_message"),
    });

    navigation.replace("Home");
  };

  const cancelRide = () => {
    Toast.show({
      type: "info",
      text1: i18n.t("ride_cancelled"),
    });

    navigation.goBack();
  };

  return (
    <View style={styles.rootWrapper}>
      <View style={styles.container}>

        {/* Menu Button */}
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Ionicons name="menu" size={28} color="#004080" />
        </TouchableOpacity>

        {/* Searching Content */}
        <View style={styles.searchContainer}>

          <Ionicons name="car-sport" size={80} color="#004080" />

          <Text style={styles.searchTitle}>
            {i18n.t("searching_driver")}
          </Text>

          <ActivityIndicator
            size="large"
            color="#004080"
            style={{ marginTop: 20 }}
          />

          <Text style={styles.searchText}>
            {i18n.t("looking_for_drivers")}
          </Text>

          <TouchableOpacity style={styles.cancelButton} onPress={cancelRide}>
            <Text style={styles.cancelText}>
              {i18n.t("cancel_ride")}
            </Text>
          </TouchableOpacity>

        </View>

        {/* Side Menu Overlay */}
        {menuVisible && (
          <TouchableWithoutFeedback onPress={toggleMenu}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
        )}

        {/* Side Menu */}
        <Animated.View
          style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={toggleMenu}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.menuItem}>{i18n.t("completed_rides")}</Text>

          <Text style={styles.menuItem}>{i18n.t("settings")}</Text>

          <LanguageToggle />

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>{i18n.t("logout")}</Text>
          </TouchableOpacity>

        </Animated.View>

      </View>
    </View>
  );
};

export default SearchingDriverScreen;

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: "#e6f0ff",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    height: height * 0.9,
    width: "100%",
  },

  menuButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 30,
    zIndex: 20,
    elevation: 3,
  },

  searchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  searchTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 20,
  },

  searchText: {
    fontSize: 16,
    color: "#004080",
    marginTop: 10,
  },

  cancelButton: {
    marginTop: 40,
    backgroundColor: "#003366",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
  },

  cancelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  sideMenu: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: "#cce0ff",
    padding: 20,
    paddingTop: 60,
    zIndex: 200,
  },

  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#003366",
    padding: 5,
    borderRadius: 15,
  },

  menuItem: {
    marginVertical: 15,
    fontSize: 18,
    color: "#003366",
  },

  logoutButton: {
    marginTop: 40,
    backgroundColor: "#003366",
    paddingVertical: 12,
    borderRadius: 6,
  },

  logoutText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 100,
  },
});