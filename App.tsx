import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";  // Import useEffect from React
import Navigation from "./StackNavigator";
import { Colors } from './theme';
import { PlaybackProvider } from './contexts/PlaybackContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebSocketService from './services/WebSocketService';

export default function App() {
  useEffect(() => {
    // Check if user is logged in and initialize WebSocket if needed
    const initializeServices = async () => {
      const token = await AsyncStorage.getItem('@spotify_token');
      const userId = await AsyncStorage.getItem('@spotify_user_id');
      
      if (token && userId) {
        // Initialize WebSocket connection for logged-in users
        WebSocketService.getInstance().connect(userId);
      }
    };
    
    initializeServices();
    
    return () => {
      // Clean up WebSocket connection when app is closed
      WebSocketService.getInstance().disconnect();
    };
  }, []);

  return (
    <PlaybackProvider>
      <View style={styles.container}>
        <Navigation />
      </View>
    </PlaybackProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});