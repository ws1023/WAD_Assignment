import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { 
  getRecentlyPlayed, 
  getTopTracks, 
  getTopAlbums, 
  getUserPlaylists,
  getUserProfile 
} from '../spotifyAPI';
import { Colors } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState('All');
  const [recentTracks, setRecentTracks] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchHomeData();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profileData = await getUserProfile();
      if (profileData) {
        setUserData(profileData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchHomeData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Try to load cached data first for instant display
      if (!forceRefresh) {
        try {
          const cachedRecentTracks = await AsyncStorage.getItem('recentTracks');
          const cachedTopAlbums = await AsyncStorage.getItem('topAlbums');
          const cachedPlaylists = await AsyncStorage.getItem('playlists');
          
          if (cachedRecentTracks) {
            setRecentTracks(JSON.parse(cachedRecentTracks));
          }
          if (cachedTopAlbums) {
            setTopAlbums(JSON.parse(cachedTopAlbums));
          }
          if (cachedPlaylists) {
            setPlaylists(JSON.parse(cachedPlaylists));
          }
        } catch (cacheError) {
          console.log('Cache retrieval error:', cacheError);
        }
      }

      // Fetch recently played tracks
      const recentlyPlayedData = await getRecentlyPlayed(10);
      if (recentlyPlayedData && recentlyPlayedData.items) {
        const uniqueItems = [];
        const trackIds = new Set();
        
        recentlyPlayedData.items.forEach(item => {
          if (!trackIds.has(item.track.id)) {
            trackIds.add(item.track.id);
            uniqueItems.push(item.track);
          }
        });
        
        setRecentTracks(uniqueItems);
        // Cache the data
        await AsyncStorage.setItem('recentTracks', JSON.stringify(uniqueItems));
        // Set "last updated" timestamp
        await AsyncStorage.setItem('recentTracksTimestamp', Date.now().toString());
      }

      // Similar caching for other data types
      const albumsData = await getTopAlbums('medium_term', 10);
      if (albumsData) {
        setTopAlbums(albumsData);
        await AsyncStorage.setItem('topAlbums', JSON.stringify(albumsData));
      }

      const playlistsData = await getUserPlaylists(10);
      if (playlistsData && playlistsData.items) {
        setPlaylists(playlistsData.items);
        await AsyncStorage.setItem('playlists', JSON.stringify(playlistsData.items));
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchHomeData(true);
  };

  const renderContentRow = (title, data, type) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contentScrollContainer}>
          {data.map(item => {
            let imageUrl, itemTitle, artist;

            if (type === 'track') {
              // Handle track type for recently played items
              imageUrl = item.album?.images?.[0]?.url;
              itemTitle = item.name;
              artist = item.artists?.map(a => a.name).join(', ');
            } else if (type === 'album') {
              // Existing album handling
              imageUrl = item.images?.[0]?.url;
              itemTitle = item.name;
              artist = item.artists?.map(a => a.name).join(', ');
            } else if (type === 'playlist') {
              // Add playlist handling if needed
              imageUrl = item.images?.[0]?.url;
              itemTitle = item.name;
              artist = `By ${item.owner?.display_name || 'Spotify'}`;
            }

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.mediaItem}
                onPress={() => {
                  if (type === 'album') {
                    navigation.navigate('AlbumDetails', {albumId: item.id});
                  } else if (type === 'track') {
                    // You might want to navigate to track details or play the track
                    // For now, we'll navigate to the album that contains this track
                    navigation.navigate('AlbumDetails', {
                      albumId: item.album.id,
                    });
                  } else if (type === 'playlist') {
                    navigation.navigate('PlaylistDetails', {playlistId: item.id});
                  }
                }}>
                <Image
                  source={
                    imageUrl
                      ? {uri: imageUrl}
                      : require('../assets/images/UCS_logo.png')
                  }
                  style={styles.mediaImage}
                />
                <Text style={styles.mediaTitle} numberOfLines={1}>
                  {itemTitle}
                </Text>
                <Text style={styles.mediaSubtitle} numberOfLines={1}>
                  {artist}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={[Colors.primary]} 
            tintColor={Colors.primary}
          />
        }
      >
        {renderContentRow('Recently played', recentTracks, 'track')}
        {renderContentRow('Your top albums', topAlbums, 'album')}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  contentSection: {
    marginTop: 24,
    paddingLeft: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  contentScrollContainer: {
    paddingRight: 16,
  },
  mediaItem: {
    width: 160,
    marginRight: 16,
  },
  mediaImage: {
    width: 160,
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
  },
  mediaTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  mediaSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  downloadsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  downloadRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  newPlaylistButton: {
    width: 150,
    marginRight: 16,
    alignItems: 'center',
  },
  newPlaylistIcon: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPlaylistText: {
    color: Colors.text,
    fontSize: 14,
    marginTop: 8,
  },
});

export default HomeScreen;

