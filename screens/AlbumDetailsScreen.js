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
import {getAlbumDetails} from '../spotifyAPI';
import {Colors} from '../theme';
import TrackItem from '../components/TrackItem';

const {width} = Dimensions.get('window');
const ALBUM_IMAGE_SIZE = width * 0.6;

const AlbumDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {albumId} = route.params;
  const [albumDetails, setAlbumDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchAlbumDetails();
  }, []);

  const fetchAlbumDetails = async () => {
    try {
      const data = await getAlbumDetails(albumId);
      setAlbumDetails(data);
    } catch (error) {
      console.error('Error fetching album details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
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

      {/* Header with back button, favorite and menu */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {albumDetails && (
        <FlatList
          data={albumDetails.tracks.items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={() => (
            <View style={styles.albumHeader}>
              <Image
                source={{uri: albumDetails.images[0].url}}
                style={styles.albumImage}
              />

              <Text style={styles.albumTitle}>{albumDetails.name}</Text>
              <Text style={styles.albumCreator}>
                by {albumDetails.artists.map(artist => artist.name).join(', ')}
              </Text>
            </View>
          )}
          renderItem={({item, index}) => (
            <TrackItem
              key={item.id}
              track={item}
              index={index}
              isInPlaylist={false}
              playlistId={albumId}
            />
          )}
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
    paddingBottom: 0, // Space for bottom nav
  },
  albumHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  albumImage: {
    width: ALBUM_IMAGE_SIZE,
    height: ALBUM_IMAGE_SIZE,
    borderRadius: 8,
    marginBottom: 24,
  },
  albumTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  albumCreator: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 24,
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

export default AlbumDetailsScreen;
