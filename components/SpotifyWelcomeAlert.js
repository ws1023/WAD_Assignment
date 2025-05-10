import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme';

const { width } = Dimensions.get('window');

const SpotifyWelcomeAlert = ({ message, username, onDismiss, autoDismissTime = 5000 }) => {
  const [slideAnim] = useState(new Animated.Value(-200));
  const [fadeAnim] = useState(new Animated.Value(1));
  
  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 40,
      friction: 8,
      useNativeDriver: true
    }).start();
    
    // Auto dismiss after specified time
    const timer = setTimeout(() => {
      dismissAlert();
    }, autoDismissTime);
    
    return () => clearTimeout(timer);
  }, []);
  
  const dismissAlert = () => {
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      if (onDismiss) onDismiss();
    });
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim
        }
      ]}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="spotify" size={30} color={Colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Welcome to Spotify</Text>
        <Text style={styles.message}>{message}, {username}!</Text>
      </View>
      <TouchableOpacity 
        style={styles.dismissButton} 
        onPress={dismissAlert}
      >
        <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: Colors.elevatedBackground,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 1000,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  dismissButton: {
    padding: 5,
  }
});

export default SpotifyWelcomeAlert;