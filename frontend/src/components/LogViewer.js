import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Button,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as Clipboard from "expo-clipboard";


const STORAGE_KEY = "DEV_LOGS";

const LogViewer = forwardRef((props, ref) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef();

  // Load logs from storage when component mounts
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const savedLogs = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLogs) {
          setLogs(JSON.parse(savedLogs));
        }
      } catch (err) {
        console.warn("Failed to load logs", err);
      }
    };
    loadLogs();
  }, []);

  // Save logs whenever they change + auto-scroll
  useEffect(() => {
    const saveLogs = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
      } catch (err) {
        console.warn("Failed to save logs", err);
      }
    };
    saveLogs();

    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [logs]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    addLog: (message, level = "info") => {
      const timestamp = new Date().toLocaleTimeString();
      const entry = { text: `[${timestamp}] ${message}`, level };
      setLogs((prevLogs) => [...prevLogs, entry]);
    },
    clearLogs: async () => {
      setLogs([]);
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to clear logs", err);
      }
    },
  }));

  const getTextStyle = (level) => {
    switch (level) {
      case "error":
        return styles.errorText;
      case "warn":
        return styles.warnText;
      default:
        return styles.infoText;
    }
  };

  // Apply filter + search
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filter === "all" || log.level === filter;
    const matchesSearch =
      searchTerm === "" ||
      log.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // Copy logs to clipboard
  // const copyLogs = async () => {
  //   const allText = filteredLogs.map((log) => log.text).join("\n");
  //   await Clipboard.setStringAsync(allText);
  //   Alert.alert("Copied!", "Logs have been copied to clipboard.");
  // };

 
  return (
    <View style={styles.container}>
      {/* Toggle button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowFilters((prev) => !prev)}
      >
        <Text style={styles.toggleText}>
          {showFilters ? "Hide Filters ▲" : "Show Filters ▼"}
        </Text>
      </TouchableOpacity>

      {/* Collapsible filter row */}
      {showFilters && (
        <View style={styles.filterRow}>
          <Button title="All" onPress={() => setFilter("all")} />
          <Button title="Info" onPress={() => setFilter("info")} />
          <Button title="Warn" onPress={() => setFilter("warn")} />
          <Button title="Error" onPress={() => setFilter("error")} />
        </View>
      )}

      {/* Search bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search logs..."
        placeholderTextColor="#888"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {/* Action buttons */}
      {/* <View style={styles.actionRow}>
        <Button title="Copy Logs" onPress={copyLogs} />
      </View> */}

      {/* Log display */}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        {filteredLogs.map((log, index) => (
          <Text key={index} style={getTextStyle(log.level)}>
            {log.text}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: "60%",
    width: "80%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#000",
    padding: 8,
  },
  toggleButton: {
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  toggleText: {
    color: "#0ff",
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  searchBar: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: "#fff",
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  infoText: {
    color: "#0f0",
    fontSize: 14,
    marginBottom: 4,
  },
  warnText: {
    color: "#ff0",
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    color: "#f00",
    fontSize: 14,
    marginBottom: 4,
  },
});

export default LogViewer;
