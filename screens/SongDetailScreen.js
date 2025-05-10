import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import SQLite from 'react-native-sqlite-storage';

// Enable database promises and debugging
SQLite.enablePromise(true);
SQLite.DEBUG(true);

const {width} = Dimensions.get('window');

// Global database variable
let db = null;

const SongDetailScreen = ({route, navigation}) => {
  const [track, setTrack] = useState(
    route.params?.track || route.params?.song || null,
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [isLikedSongsSelected, setIsLikedSongsSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [dbInitialized, setDbInitialized] = useState(false);

  // ...other state variables...

  // Initialize database
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Open database
        db = await SQLite.openDatabase({
          name: 'mydatabase.db',
          location: 'default',
        });
        console.log('Database opened successfully');

        // Create tables if they don't exist
        await createTables();
        setDbInitialized(true);
      } catch (error) {
        console.error('Error initializing database:', error);
        Alert.alert('Database Error', 'Failed to initialize the database.');
      }
    };

    initializeDatabase();

    // Cleanup on component unmount
    return () => {
      if (db) {
        db.close()
          .then(() => console.log('Database closed'))
          .catch(error => console.error('Error closing database:', error));
      }
    };
  }, []);

  useEffect(() => {
    // Standardize track format whether coming from search or other navigation
    if (route.params?.song) {
      // If we received a flattened song object (from search)
      const songData = route.params.song;

      // Create a compatible track object
      const formattedTrack = {
        ...songData,
        // Make sure album exists in expected format
        album: songData.album
          ? typeof songData.album === 'string'
            ? {
                name: songData.album,
                id: songData.albumId,
                images: [{url: songData.albumArt}],
              }
            : songData.album
          : {name: 'Unknown Album', images: []},
        // Make sure artists exists as an array
        artists: songData.artists
          ? songData.artists
          : songData.artist
          ? [{name: songData.artist}]
          : [{name: 'Unknown Artist'}],
      };

      setTrack(formattedTrack);
    } else {
      // Normal track loading logic...
    }
  }, [route.params]);

  useEffect(() => {
    // If we're coming from search and should show playlist modal immediately
    if (route.params?.showPlaylistModal) {
      // Short delay to ensure component is fully mounted
      setTimeout(() => {
        setShowPlaylistModal(true);
      }, 100);
    }
  }, [route.params]);

  // Create necessary tables
  const createTables = async () => {
    try {
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          artist TEXT,
          album TEXT,
          albumArt TEXT,
          uri TEXT,
          duration INTEGER
        );
      `);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS playlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
      `);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS playlist_songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playlistId INTEGER NOT NULL,
          songId TEXT NOT NULL,
          addedAt INTEGER NOT NULL,
          FOREIGN KEY (playlistId) REFERENCES playlists (id) ON DELETE CASCADE,
          FOREIGN KEY (songId) REFERENCES songs (id) ON DELETE CASCADE,
          UNIQUE (playlistId, songId)
        );
      `);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS liked_songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          songId TEXT NOT NULL,
          addedAt INTEGER NOT NULL,
          FOREIGN KEY (songId) REFERENCES songs (id) ON DELETE CASCADE,
          UNIQUE (songId)
        );
      `);

      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  };

  // Fetch playlists from the database
  const fetchPlaylists = async () => {
    if (!dbInitialized) return;

    setIsLoading(true);
    try {
      const [results] = await db.executeSql(`
        SELECT p.id, p.name, 
          (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlistId = p.id) as songCount
        FROM playlists p
        ORDER BY p.createdAt DESC;
      `);

      const fetchedPlaylists = [];
      for (let i = 0; i < results.rows.length; i++) {
        fetchedPlaylists.push(results.rows.item(i));
      }

      setPlaylists(fetchedPlaylists);
      console.log('Fetched Playlists:', fetchedPlaylists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      Alert.alert('Error', 'Failed to fetch playlists');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if song is in liked songs
  const checkIfSongIsLiked = async () => {
    if (!dbInitialized) return;

    try {
      const [results] = await db.executeSql(
        `SELECT * FROM liked_songs WHERE songId = ?;`,
        [track.id],
      );

      setIsLikedSongsSelected(results.rows.length > 0);
    } catch (error) {
      console.error('Error checking if song is liked:', error);
    }
  };

  // Check which playlists this song is already in
  const checkSongPlaylists = async () => {
    if (!dbInitialized) return;

    try {
      const [results] = await db.executeSql(
        `SELECT playlistId FROM playlist_songs WHERE songId = ?;`,
        [track.id],
      );

      const playlistIds = [];
      for (let i = 0; i < results.rows.length; i++) {
        playlistIds.push(results.rows.item(i).playlistId);
      }

      setSelectedPlaylists(playlistIds);
    } catch (error) {
      console.error('Error checking song playlists:', error);
    }
  };

  useEffect(() => {
    if (showPlaylistModal && dbInitialized) {
      fetchPlaylists();
      checkIfSongIsLiked();
      checkSongPlaylists();
    }
  }, [showPlaylistModal, dbInitialized]);

  // Add song to a playlist
  const addToPlaylist = async playlistId => {
    if (!dbInitialized) return;

    // Toggle selection visually
    if (selectedPlaylists.includes(playlistId)) {
      setSelectedPlaylists(selectedPlaylists.filter(id => id !== playlistId));
    } else {
      setSelectedPlaylists([...selectedPlaylists, playlistId]);
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      // Check if song already exists in playlist
      const [checkResults] = await db.executeSql(
        `SELECT * FROM playlist_songs WHERE playlistId = ? AND songId = ?`,
        [playlistId, track.id],
      );

      if (checkResults.rows.length > 0) {
        // Song already exists in playlist, remove it
        await db.executeSql(
          `DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?`,
          [playlistId, track.id],
        );
        console.log('Song removed from playlist');
      } else {
        // Make sure song exists in songs table first
        await db.executeSql(
          `INSERT OR IGNORE INTO songs (id, name, artist, album, albumArt, uri, duration)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            track.id,
            track.name,
            track.artists.map(artist => artist.name).join(', '),
            track.album.name,
            track.album.images[0]?.url || null,
            track.uri,
            track.duration_ms,
          ],
        );

        // Add song to playlist
        await db.executeSql(
          `INSERT INTO playlist_songs (playlistId, songId, addedAt) VALUES (?, ?, ?)`,
          [playlistId, track.id, now],
        );

        console.log('Song added to playlist successfully');
      }
    } catch (error) {
      console.error('Error managing playlist song:', error);
      Alert.alert('Error', 'Failed to update playlist');
    }
  };

  // Toggle liked songs
  const toggleLikedSongs = async () => {
    if (!dbInitialized) return;

    const now = Math.floor(Date.now() / 1000);
    setIsLikedSongsSelected(!isLikedSongsSelected);

    try {
      if (!isLikedSongsSelected) {
        // Make sure song exists in songs table
        await db.executeSql(
          `INSERT OR IGNORE INTO songs (id, name, artist, album, albumArt, uri, duration)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            track.id,
            track.name,
            track.artists.map(artist => artist.name).join(', '),
            track.album.name,
            track.album.images[0]?.url || null,
            track.uri,
            track.duration_ms,
          ],
        );

        // Add to liked songs
        await db.executeSql(
          `INSERT OR IGNORE INTO liked_songs (songId, addedAt) VALUES (?, ?)`,
          [track.id, now],
        );

        console.log('Song added to liked songs');
      } else {
        // Remove from liked songs
        await db.executeSql(`DELETE FROM liked_songs WHERE songId = ?`, [
          track.id,
        ]);

        console.log('Song removed from liked songs');
      }
    } catch (error) {
      console.error('Error toggling liked song:', error);
      Alert.alert('Error', 'Failed to update liked songs');
    }
  };

  // Clear all selections
  const clearAllSavedSelections = async () => {
    if (!dbInitialized) return;

    try {
      // Remove song from all playlists
      await db.executeSql(`DELETE FROM playlist_songs WHERE songId = ?`, [
        track.id,
      ]);

      // Remove from liked songs
      await db.executeSql(`DELETE FROM liked_songs WHERE songId = ?`, [
        track.id,
      ]);

      console.log('Song removed from all collections');
      setSelectedPlaylists([]);
      setIsLikedSongsSelected(false);
    } catch (error) {
      console.error('Error clearing selections:', error);
      Alert.alert('Error', 'Failed to clear selections');
    }
  };

  // Create a new playlist
  const createNewPlaylist = async () => {
    if (!dbInitialized || !newPlaylistName.trim()) return;

    const now = Math.floor(Date.now() / 1000);

    try {
      // Create the playlist
      const [playlistResult] = await db.executeSql(
        `INSERT INTO playlists (name, createdAt) VALUES (?, ?)`,
        [newPlaylistName, now],
      );

      const newPlaylistId = playlistResult.insertId;

      // Make sure song exists in songs table
      await db.executeSql(
        `INSERT OR IGNORE INTO songs (id, name, artist, album, albumArt, uri, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          track.id,
          track.name,
          track.artists.map(artist => artist.name).join(', '),
          track.album.name,
          track.album.images[0]?.url || null,
          track.uri,
          track.duration_ms,
        ],
      );

      // Add song to the new playlist
      await db.executeSql(
        `INSERT INTO playlist_songs (playlistId, songId, addedAt) VALUES (?, ?, ?)`,
        [newPlaylistId, track.id, now],
      );

      console.log('New playlist created and song added successfully');
      setNewPlaylistName('');
      setShowCreatePlaylistModal(false);

      // Update playlists and select the new one
      await fetchPlaylists();
      setSelectedPlaylists([...selectedPlaylists, newPlaylistId]);
    } catch (error) {
      console.error('Error creating new playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    }
  };

  return (
    <LinearGradient
      colors={['#704214', '#2C1E0F', '#121212']}
      style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.customBackButton}>
        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Album Artwork */}
        <Image
          source={{
            uri:
              track?.albumArt ||
              track?.album?.images?.[0]?.url ||
              'https://community.spotify.com/t5/image/serverpage/image-id/55829iC2AD64ADB887E2A5',
          }}
          style={styles.albumCover}
          resizeMode="contain"
        />

        {/* Track Info */}
        <Text style={styles.trackName}>{track?.name || 'Unknown Track'}</Text>
        <Text style={styles.artistName}>
          {track?.artists
            ? track.artists.map(artist => artist?.name || 'Unknown').join(', ')
            : 'Unknown Artist'}
        </Text>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.addToPlaylistButton}
          onPress={() => setShowPlaylistModal(true)}>
          <Text style={styles.addToPlaylistText}>Add to playlist</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton}>
          <Text style={styles.playButtonText}>I want to play this song</Text>
        </TouchableOpacity>
      </View>

      {/* Playlist Modal */}
      <Modal
        visible={showPlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add to playlist</Text>
              <View style={{width: 50}} />
            </View>

            {/* New Playlist Button */}
            <TouchableOpacity
              style={styles.newPlaylistButton}
              onPress={() => setShowCreatePlaylistModal(true)}>
              <Text style={styles.newPlaylistText}>New playlist</Text>
            </TouchableOpacity>

            {/* Saved in Section with Clear All */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved in</Text>
              <TouchableOpacity onPress={clearAllSavedSelections}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>

            {/* Liked Songs with Checkmark */}
            <TouchableOpacity
              style={styles.playlistItem}
              onPress={toggleLikedSongs}>
              <View style={styles.checkContainer}>
                {isLikedSongsSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color="#1DB954"
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Most Relevant Section */}
            <Text style={styles.sectionTitle}>Most relevant</Text>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1DB954" />
              </View>
            ) : (
              <ScrollView style={styles.playlistsContainer}>
                {playlists.map(playlist => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistItem}
                    onPress={() => addToPlaylist(playlist.id)}>
                    <View style={styles.playlistCover}>
                      <MaterialCommunityIcons
                        name="music-note"
                        size={24}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.playlistInfoContainer}>
                      <Text style={styles.playlistName}>{playlist.name}</Text>
                      <Text style={styles.playlistDetails}>
                        {playlist.songCount > 0
                          ? `${playlist.songCount} songs`
                          : 'Empty'}
                      </Text>
                    </View>
                    <View style={styles.radioContainer}>
                      <View
                        style={[
                          styles.radioButton,
                          selectedPlaylists.includes(playlist.id) &&
                            styles.radioButtonSelected,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                ))}

                {playlists.length === 0 && (
                  <Text style={styles.emptyText}>
                    No playlists found. Create a new playlist to get started.
                  </Text>
                )}
              </ScrollView>
            )}

            {/* Done Button */}
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowPlaylistModal(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreatePlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreatePlaylistModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createPlaylistModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowCreatePlaylistModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create playlist</Text>
              <TouchableOpacity
                onPress={createNewPlaylist}
                disabled={!newPlaylistName.trim()}>
                <Text
                  style={[
                    styles.createText,
                    !newPlaylistName.trim() && styles.disabledText,
                  ]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.playlistNameInput}
              placeholder="Playlist name"
              placeholderTextColor="#8e8e8e"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
              maxLength={50}
            />
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Styles remain unchanged
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 30,
  },
  albumCover: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 30,
  },
  trackName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 20,
    color: '#B3B3B3',
    textAlign: 'center',
    marginBottom: 40,
  },
  addToPlaylistButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  addToPlaylistText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    paddingVertical: 10,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 40,
    width: '100%',
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  newPlaylistButton: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 30,
    padding: 14,
    alignItems: 'center',
  },
  newPlaylistText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 20,
    marginVertical: 10,
  },
  clearAllText: {
    color: '#1DB954',
    fontSize: 14,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  playlistIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistCover: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
  },
  playlistDetails: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  playlistIconSmall: {
    marginLeft: 8,
  },
  playlistsContainer: {
    maxHeight: '60%',
  },
  checkContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#fff',
  },
  radioButtonSelected: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  doneButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: '#1DB954',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: 150,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#8e8e8e',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 40,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    height: 100,
  },
  createPlaylistModal: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 30,
    width: '100%',
    height: '25%',
  },
  playlistNameInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    color: '#fff',
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  createText: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  customBackButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SongDetailScreen;
