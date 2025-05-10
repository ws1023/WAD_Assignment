import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {getPlaylistDetails} from '../spotifyAPI';
import {Colors} from '../theme';
import TrackItem from '../components/TrackItem';

const {width} = Dimensions.get('window');
const PLAYLIST_IMAGE_SIZE = width * 0.6;

const PlaylistDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {playlistId} = route.params;
  const [playlistDetails, setPlaylistDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchPlaylistDetails();
  }, []);

  const fetchPlaylistDetails = async () => {
    try {
      const data = await getPlaylistDetails(playlistId);
      setPlaylistDetails(data);
    } catch (error) {
      console.error('Error fetching playlist details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    // Here you would implement the actual follow/unfollow API call
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header with back button, follow and menu */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {/* Update the follow button in the header section */}
          <TouchableOpacity onPress={toggleFollow} style={styles.iconButton}>
            <MaterialCommunityIcons
              name={isFollowing ? "check-circle" : "plus-circle-outline"}
              size={28}
              color={isFollowing ? Colors.primary : Colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={28}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>

      {playlistDetails && (
        <FlatList
          data={playlistDetails.tracks.items}
          keyExtractor={(item, index) => `${item.track?.id || index}`}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={() => (
            <View style={styles.playlistHeader}>
              <Image
                source={
                  playlistDetails.images && playlistDetails.images.length > 0
                    ? {uri: playlistDetails.images[0].url}
                    : require('../assets/images/UCS_logo.png')
                }
                style={styles.playlistImage}
              />

              <Text style={styles.playlistTitle}>{playlistDetails.name}</Text>
              <Text style={styles.playlistInfo}>
                {playlistDetails.description || ''}
              </Text>
              <Text style={styles.playlistCreator}>
                Created by {playlistDetails.owner.display_name} • {playlistDetails.tracks.total} songs
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.shuffleButton}>
                  <Text style={styles.shuffleButtonText}>Shuffle play</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.downloadButton}>
                  <MaterialCommunityIcons name="download" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          renderItem={({item, index}) => {
            if (!item.track) return null;
            return (
              <TrackItem 
                key={item.track.id} 
                track={item.track} 
                index={index}
                isInPlaylist={true}
                playlistId={playlistId}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  playlistHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  playlistImage: {
    width: PLAYLIST_IMAGE_SIZE,
    height: PLAYLIST_IMAGE_SIZE,
    borderRadius: 8,
    marginBottom: 24,
  },
  playlistTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  playlistInfo: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  playlistCreator: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shuffleButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginRight: 16,
  },
  shuffleButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  trackInfo: {
    flex: 1,
    paddingRight: 8,
  },
  trackName: {
    color: 'white',
    fontSize: 16,
    marginBottom: 4,
  },
  artistName: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  trackRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDuration: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  menuButton: {
    padding: 8,
  },
});

export default PlaylistDetailScreen;