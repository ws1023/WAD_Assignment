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

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {['All', 'Music', 'Podcasts'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.selectedTab
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.selectedTabText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

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

  const renderOfflineBackup = () => (
    <TouchableOpacity style={styles.offlineBackupContainer}>
      <View style={styles.offlineIconContainer}>
        <MaterialCommunityIcons name="wifi-off" size={40} color="#1DB954" />
      </View>
      <View style={styles.offlineTextContainer}>
        <Text style={styles.offlineTitle}>Offline Backup</Text>
        <Text style={styles.offlineDescription}>
          Tracks you can play offline. So when your connection drops out, the music won't.
        </Text>
      </View>
      <TouchableOpacity style={styles.playButton}>
        <MaterialCommunityIcons name="play" size={26} color={Colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderDownloadsSection = () => (
    <View style={styles.downloadsSection}>
      <Text style={styles.sectionTitle}>Music downloads</Text>
      <View style={styles.downloadRow}>
        <TouchableOpacity style={styles.newPlaylistButton}>
          <View style={styles.newPlaylistIcon}>
            <MaterialCommunityIcons name="playlist-plus" size={32} color={Colors.textSecondary} />
          </View>
          <Text style={styles.newPlaylistText}>New Playlist</Text>
        </TouchableOpacity>
        
        {playlists.slice(0, 1).map(playlist => (
          <TouchableOpacity
            key={playlist.id}
            style={styles.mediaItem}
            onPress={() => {
              navigation.navigate('PlaylistDetails', {playlistId: playlist.id});
            }}>
            <Image
              source={
                playlist.images && playlist.images.length > 0
                  ? { uri: playlist.images[0].url }
                  : require('../assets/images/UCS_logo.png')
              }
              style={styles.downloadImage}
            />
            <Text style={styles.downloadTitle} numberOfLines={1}>
              {playlist.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );


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
        {renderProfileHeader()}
        {renderContentRow('Recently played', recentTracks, 'track')}
        {renderContentRow('Your top albums', topAlbums, 'album')}
        {renderOfflineBackup()}
        {renderDownloadsSection()}
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.cardBackground,
  },
  selectedTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.text,
    fontWeight: '500',
  },
  selectedTabText: {
    color: Colors.background,
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
  offlineBackupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
  },
  offlineIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  offlineTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  offlineDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  downloadItem: {
    width: 150,
  },
  downloadImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  downloadTitle: {
    color: Colors.text,
    fontSize: 14,
    marginTop: 8,
  },
 
  playButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
});

export default HomeScreen;