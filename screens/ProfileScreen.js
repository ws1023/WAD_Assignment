import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { 
  getUserProfile, 
  getUserFollowing, 
  getUserPlaylists, 
  clearAuthData 
} from '../spotifyAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ProfileScreen = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);
  const [playlistsCount, setPlaylistsCount] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const profile = await getUserProfile();
      
      if (profile) {
        setUserProfile(profile);
        
        const following = await getUserFollowing();
        if (following) {
          setFollowingCount(following.artists.total);
        }
        
        const playlists = await getUserPlaylists();
        if (playlists) {
          setPlaylistsCount(playlists.total);
        }
      } else {
        Alert.alert(
          'Error',
          'Could not load your profile. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching user profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAuthData();
              // Navigate back to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Image 
          source={
            userProfile?.images && userProfile.images.length > 0
              ? { uri: userProfile.images[0].url }
              : require('../assets/images/UCS_logo.png') // Fallback image
          }
          style={styles.profileImage}
        />
        <Text style={styles.displayName}>{userProfile?.display_name || 'Spotify User'}</Text>
        <Text style={styles.username}>{userProfile?.id || '@user'}</Text>
        
        <View style={styles.statsRow}>
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{userProfile?.followers?.total || 0}</Text>
    <Text style={styles.statLabel}>Followers</Text>
  </View>
  
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{followingCount}</Text>
    <Text style={styles.statLabel}>Following</Text>
  </View>
  
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{playlistsCount}</Text>
    <Text style={styles.statLabel}>Playlists</Text>
  </View>
</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="account-outline" size={24} color="white" />
          <Text style={styles.menuItemText}>Profile Settings</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="white" />
          <Text style={styles.menuItemText}>Notifications</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="shield-outline" size={24} color="white" />
          <Text style={styles.menuItemText}>Privacy</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="theme-light-dark" size={24} color="white" />
          <Text style={styles.menuItemText}>Appearance</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="music-note" size={24} color="white" />
          <Text style={styles.menuItemText}>Playback</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutButton]} 
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={24} color="#ff5252" />
          <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Spotify Clone App</Text>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#b3b3b3',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: '#b3b3b3',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 16,
    flex: 1,
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: '#ff5252',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default ProfileScreen;
