import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Dimensions,
  Alert,
} from 'react-native';
import {search} from '../spotifyAPI';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme';
import { db } from '../database';
import SQLite from 'react-native-sqlite-storage';

const {width} = Dimensions.get('window');

const SearchScreen = ({navigation}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [db, setDb] = useState(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await SQLite.openDatabase({
          name: 'mydatabase.db',
          location: 'default'
        });
        setDb(database);
      } catch (error) {
        console.error('Error opening database:', error);
        Alert.alert('Database Error', 'Could not initialize the database');
      }
    };
    
    initDB();
    
    return () => {
      if (db) {
        db.close().catch(err => console.error('Error closing db', err));
      }
    };
  }, []);

  useEffect(() => {
    // Update the route params when focus state changes
    navigation.setParams({searchFocused: isFocused});
  }, [isFocused, navigation]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    try {
      const results = await search(
        query,
        ['track', 'artist', 'album', 'playlist', 'show', 'episode'],
        10,
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setQuery('');
    setSearchResults(null);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const handleAddToPlaylist = (track) => {
    // Navigate to SongDetail screen with the track data and open the playlist modal immediately
    navigation.navigate('SongDetail', { 
      song: {
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        albumArt: track.albumArt,
        uri: track.uri,
        duration_ms: track.duration,
        popularity: 0 // Default value since we might not have this info
      },
      fromSearch: true,
      showPlaylistModal: true // Flag to immediately open the playlist modal
    });
  };

  const renderEmptySearch = () => (
    <View style={styles.emptySearchContainer}>
      <Text style={styles.emptySearchTitle}>Play what you love</Text>
      <Text style={styles.emptySearchSubtitle}>
        Search for artists, songs, podcasts and more.
      </Text>
    </View>
  );

const renderTrackItem = ({item}) => (
  <TouchableOpacity 
    style={styles.trackItem}
    onPress={() => {
      // Navigate to SongDetail screen with all necessary track data
      navigation.navigate('SongDetail', { 
        song: {
          id: item.id,
          name: item.name,
          artist: item.artists.map(artist => artist.name).join(', '),
          album: item.album.name,
          albumId: item.album.id,
          albumArt: item.album.images[0]?.url || 'https://via.placeholder.com/60',
          uri: item.uri,
          duration_ms: item.duration_ms,
          preview_url: item.preview_url,
          popularity: item.popularity
        },
        fromSearch: true // Flag to indicate we came from search
      });
    }}
  >
    <Image
      source={{
        uri: item.album.images[0]?.url || 'https://via.placeholder.com/60',
      }}
      style={styles.trackImage}
    />
    <View style={styles.trackInfo}>
      <Text style={styles.trackName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.trackArtist} numberOfLines={1}>
        {item.artists.map(artist => artist.name).join(', ')}
      </Text>
    </View>
    <TouchableOpacity 
      style={styles.addToPlaylistButton}
      onPress={(e) => {
        e.stopPropagation(); // Prevent navigating to song detail
        handleAddToPlaylist({
          id: item.id,
          name: item.name,
          artist: item.artists.map(artist => artist.name).join(', '),
          album: item.album.name,
          albumArt: item.album.images[0]?.url || 'https://via.placeholder.com/60',
          uri: item.uri,
          duration: item.duration_ms,
        });
      }}
    >
      <MaterialCommunityIcons name="playlist-plus" size={22} color={Colors.textSecondary} />
    </TouchableOpacity>
  </TouchableOpacity>
);

  const renderArtistItem = ({item}) => (
    <TouchableOpacity 
      style={styles.artistItem}
      onPress={() => navigation.navigate('ArtistDetails', { artistId: item.id })}
    >
      <Image
        source={{uri: item.images[0]?.url || 'https://via.placeholder.com/80'}}
        style={styles.artistImage}
      />
      <Text style={styles.artistName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderAlbumItem = ({item}) => (
    <TouchableOpacity 
      style={styles.albumItem}
      onPress={() => navigation.navigate('AlbumDetails', { albumId: item.id })}
    >
      <Image
        source={{uri: item.images[0]?.url || 'https://via.placeholder.com/150'}}
        style={styles.albumImage}
      />
      <Text style={styles.albumName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.albumArtist} numberOfLines={1}>
        {item.artists.map(artist => artist.name).join(', ')}
      </Text>
    </TouchableOpacity>
  );

  const renderResults = () => {
    if (!searchResults) return null;

    return (
      <FlatList
        data={[]}
        ListHeaderComponent={() => (
          <>
            {searchResults.tracks?.items?.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Songs</Text>
                <FlatList
                  data={searchResults.tracks.items}
                  renderItem={renderTrackItem}
                  keyExtractor={item => `track-${item.id}`}
                  horizontal={false}
                />
              </View>
            )}

            {searchResults.artists?.items?.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Artists</Text>
                <FlatList
                  data={searchResults.artists.items}
                  renderItem={renderArtistItem}
                  keyExtractor={item => `artist-${item.id}`}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListContainer}
                />
              </View>
            )}

            {searchResults.albums?.items?.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Albums</Text>
                <FlatList
                  data={searchResults.albums.items}
                  renderItem={renderAlbumItem}
                  keyExtractor={item => `album-${item.id}`}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListContainer}
                />
              </View>
            )}
          </>
        )}
        renderItem={({item}) => null}
        keyExtractor={(item, index) => `section-${index}`}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to listen to?"
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Only unfocus if the user hasn't searched anything
              if (!query.trim()) {
                setIsFocused(false);
              }
            }}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
          />
        </View>
        {isFocused && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={styles.loader}
          />
        ) : !query ? (
          renderEmptySearch()
        ) : (
          renderResults()
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground || '#333',
    borderRadius: 4,
    paddingHorizontal: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
    color: Colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: Colors.text,
  },
  cancelButton: {
    marginLeft: 8,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptySearchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySearchSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  horizontalListContainer: {
    paddingRight: 16,
  },
  // Track styles
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 2,
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  trackInfo: {
    marginLeft: 12,
    flex: 1,
  },
  trackName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  trackArtist: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  addToPlaylistButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Artist styles
  artistItem: {
    marginRight: 16,
    width: 110,
    alignItems: 'center',
  },
  artistImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  artistName: {
    color: Colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  // Album styles
  albumItem: {
    marginRight: 16,
    width: 150,
  },
  albumImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  albumArtist: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});

export default SearchScreen;
