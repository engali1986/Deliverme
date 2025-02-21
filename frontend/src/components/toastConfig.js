import { View, Text, StyleSheet } from "react-native";

/**
 * Custom Toast Configuration with Props Support
 */
export const toastConfig = {
  success: ({ text1, text2, props }) => (
    <View style={styles.successContainer}>
      {props?.showIcon && <Text style={styles.icon}>✅</Text>} 
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.subtitle}>{text2}</Text> : null}
    </View>
  ),

  error: ({ text1, text2, props }) => (
    <View style={styles.errorContainer}>
      {props?.showIcon && <Text style={styles.icon}>❌</Text>}
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.subtitle}>{text2}</Text> : null}
    </View>
  ),
};

const styles = StyleSheet.create({
  successContainer: {
    backgroundColor: "#d1e7ff", // Light Blue
    borderLeftColor: "#0073e6", // Blue Accent
    borderLeftWidth: 6,
    padding: 12,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: "#ffe6e6", // Light Red
    borderLeftColor: "#ff4d4d", // Red Accent
    borderLeftWidth: 6,
    padding: 12,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    color: "#005f99", // Dark Blue Text
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  subtitle: {
    color: "#004c80", // Slightly Darker Blue
    fontSize: 14,
    marginLeft: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
});
