// screens/LibraryScreen.js
import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../theme/colors';
import SQLite from 'react-native-sqlite-storage';

// Enable database promises
SQLite.enablePromise(true);

const LibraryScreen = ({navigation}) => {
  const [localPlaylists, setLocalPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState('recent');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showPlaylistOptionsModal, setShowPlaylistOptionsModal] =
    useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [db, setDb] = useState(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const database = await SQLite.openDatabase({
          name: 'mydatabase.db',
          location: 'default',
        });
        setDb(database);

        // Create tables if they don't exist
        await createTables(database);

        // Fetch local playlists after DB initialization
        fetchLocalPlaylists(database);
      } catch (error) {
        console.error('Error initializing database:', error);
        Alert.alert('Database Error', 'Failed to initialize the database.');
      }
    };

    initializeDatabase();

    // Clean up database connection when component unmounts
    return () => {
      if (db) {
        db.close()
          .then(() => console.log('Database closed'))
          .catch(error => console.error('Error closing database:', error));
      }
    };
  }, []);

  const createTables = async database => {
    try {
      await database.executeSql(`
                CREATE TABLE IF NOT EXISTS playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    createdAt INTEGER NOT NULL
                );
            `);

      await database.executeSql(`
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

      await database.executeSql(`
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

      await database.executeSql(`
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

  const fetchLocalPlaylists = async database => {
    try {
      setLoading(true);
      const [results] = await database.executeSql(`
                SELECT p.id, p.name, p.createdAt,
                    (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlistId = p.id) as songCount
                FROM playlists p
                ORDER BY p.createdAt DESC;
            `);

      const localPlaylistsData = [];
      for (let i = 0; i < results.rows.length; i++) {
        const playlist = results.rows.item(i);

        // Get first 4 song album arts for the playlist cover
        const [coverResults] = await database.executeSql(
          `
                    SELECT s.albumArt 
                    FROM playlist_songs ps
                    JOIN songs s ON ps.songId = s.id
                    WHERE ps.playlistId = ?
                    ORDER BY ps.addedAt DESC
                    LIMIT 4;
                `,
          [playlist.id],
        );

        const albumArts = [];
        for (let j = 0; j < coverResults.rows.length; j++) {
          albumArts.push(coverResults.rows.item(j).albumArt);
        }

        localPlaylistsData.push({
          ...playlist,
          displayName: playlist.name,
          albumArts: albumArts,
          image: albumArts[0] || null,
          added_at: new Date(playlist.createdAt * 1000).toISOString(),
        });
      }

      setLocalPlaylists(localPlaylistsData);
    } catch (error) {
      console.error('Error fetching local playlists:', error);
      Alert.alert('Error', 'Failed to load your saved playlists');
    } finally {
      setLoading(false);
    }
  };

  const createNewPlaylist = async () => {
    if (!db || !newPlaylistName.trim()) return;

    try {
      const now = Math.floor(Date.now() / 1000);

      // Create the playlist
      const [result] = await db.executeSql(
        `INSERT INTO playlists (name, createdAt) VALUES (?, ?)`,
        [newPlaylistName.trim(), now],
      );

      setNewPlaylistName('');
      setShowCreatePlaylistModal(false);

      // Refresh local playlists
      fetchLocalPlaylists(db);

      // Navigate to the new playlist for adding songs
      navigation.navigate('PlaylistDetail', {
        playlistId: result.insertId,
        playlistName: newPlaylistName.trim(),
        isLocal: true,
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    }
  };

  const deletePlaylist = async () => {
    if (!db || !selectedPlaylist) return;

    try {
      // Delete the playlist and all its songs (CASCADE will handle playlist_songs)
      await db.executeSql(`DELETE FROM playlists WHERE id = ?`, [
        selectedPlaylist.id,
      ]);

      // Close modal and refresh
      setShowPlaylistOptionsModal(false);
      setSelectedPlaylist(null);
      fetchLocalPlaylists(db);

      Alert.alert('Success', 'Playlist deleted successfully');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      Alert.alert('Error', 'Failed to delete playlist');
    }
  };

  const confirmDeletePlaylist = () => {
    if (!selectedPlaylist) return;

    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${selectedPlaylist.displayName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: deletePlaylist,
          style: 'destructive',
        },
      ],
    );
  };

  const updatePlaylistName = async () => {
    if (!db || !selectedPlaylist || !newPlaylistName.trim()) return;

    try {
      await db.executeSql(
        `UPDATE playlists SET name = ? WHERE id = ?`,
        [newPlaylistName.trim(), selectedPlaylist.id]
      );
      
      setShowEditNameModal(false);
      
      // Refresh playlists to show updated name
      fetchLocalPlaylists(db);
      
      Alert.alert('Success', 'Playlist name updated');
    } catch (error) {
      console.error('Error updating playlist name:', error);
      Alert.alert('Error', 'Failed to update playlist name');
    }
  };

  const sortPlaylists = () => {
    switch (sortMode) {
      case 'recent':
        return [...localPlaylists].sort((a, b) => b.createdAt - a.createdAt);
      case 'alphabetical':
        return [...localPlaylists].sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        );
      default:
        return localPlaylists;
    }
  };

  const handleItemPress = item => {
    navigation.navigate('PlaylistDetail', {
      playlistId: item.id,
      playlistName: item.displayName,
      isLocal: true,
    });
  };

  const handleItemLongPress = item => {
    setSelectedPlaylist(item);
    setShowPlaylistOptionsModal(true);
  };

  const renderLocalPlaylistCover = item => {
    if (item.albumArts && item.albumArts.length > 0) {
      if (item.albumArts.length === 1) {
        return (
          <Image source={{uri: item.albumArts[0]}} style={styles.itemImage} />
        );
      } else {
        // Create a 2x2 grid of album arts
        return (
          <View style={styles.playlistCoverGrid}>
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.playlistCoverQuadrant}>
                {item.albumArts[index] ? (
                  <Image
                    source={{uri: item.albumArts[index]}}
                    style={styles.playlistCoverImage}
                  />
                ) : (
                  <View style={styles.playlistCoverPlaceholder} />
                )}
              </View>
            ))}
          </View>
        );
      }
    } else {
      return (
        <View style={styles.itemImagePlaceholder}>
          <MaterialIcons name="playlist-play" size={24} color={Colors.text} />
        </View>
      );
    }
  };

  const renderLibraryItem = ({item}) => (
    <TouchableOpacity
      style={styles.libraryItem}
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleItemLongPress(item)}
      delayLongPress={500}>
      {renderLocalPlaylistCover(item)}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.displayName}
        </Text>
        <View style={styles.itemDetailRow}>
          <MaterialIcons
            name="playlist-play"
            size={14}
            color={Colors.primary}
            style={styles.typeIcon}
          />
          <Text style={styles.itemType}>
            {`Local playlist • ${item.songCount || 0} songs`}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.optionsButton}
        onPress={() => {
          setSelectedPlaylist(item);
          setShowPlaylistOptionsModal(true);
        }}>
        <MaterialCommunityIcons
          name="dots-vertical"
          size={22}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCreatePlaylistModal(true)}>
            <Ionicons name="add" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortOptions(!showSortOptions)}>
          <Ionicons name="swap-vertical" size={18} color={Colors.text} />
          <Text style={styles.sortButtonText}>
            {sortMode === 'recent' ? 'Recent' : 'Alphabetical'}
          </Text>
        </TouchableOpacity>
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
    <View style={styles.container}>
      <FlatList
        data={sortPlaylists()}
        keyExtractor={(item, index) => `local-playlist-${item.id}`}
        renderItem={renderLibraryItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="playlist-add"
              size={64}
              color={Colors.textSecondary}
            />
            <Text style={styles.emptyText}>No playlists yet</Text>
            <Text style={styles.emptySubText}>
              Create a playlist to get started
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreatePlaylistModal(true)}>
              <Text style={styles.createButtonText}>Create Playlist</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Sort Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSortOptions}
        onRequestClose={() => setShowSortOptions(false)}>
        <TouchableWithoutFeedback onPress={() => setShowSortOptions(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.sortOptionsModal}>
          <View style={styles.sortOptionsHeader}>
            <Text style={styles.sortOptionsTitle}>Sort by</Text>
          </View>

          <TouchableOpacity
            style={styles.sortOptionRow}
            onPress={() => {
              setSortMode('recent');
              setShowSortOptions(false);
            }}>
            <Text style={styles.sortOptionText}>Recent</Text>
            {sortMode === 'recent' && (
              <Ionicons name="checkmark" size={24} color={Colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortOptionRow}
            onPress={() => {
              setSortMode('alphabetical');
              setShowSortOptions(false);
            }}>
            <Text style={styles.sortOptionText}>Alphabetical</Text>
            {sortMode === 'alphabetical' && (
              <Ionicons name="checkmark" size={24} color={Colors.primary} />
            )}
          </TouchableOpacity>
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

      {/* Playlist Options Modal */}
      <Modal
        visible={showPlaylistOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistOptionsModal(false)}>
        <TouchableWithoutFeedback
          onPress={() => setShowPlaylistOptionsModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.playlistOptionsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedPlaylist?.displayName || 'Playlist options'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => {
              setShowPlaylistOptionsModal(false);
              if (selectedPlaylist) {
                navigation.navigate('PlaylistDetail', {
                  playlistId: selectedPlaylist.id,
                  playlistName: selectedPlaylist.displayName,
                  isLocal: true,
                });
              }
            }}>
            <MaterialIcons name="queue-music" size={24} color={Colors.text} />
            <Text style={styles.optionText}>View playlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => {
              setShowPlaylistOptionsModal(false);
              setNewPlaylistName(selectedPlaylist.displayName);
              setShowEditNameModal(true);
            }}>
            <MaterialIcons name="edit" size={24} color={Colors.text} />
            <Text style={styles.optionText}>Edit playlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, styles.deleteOption]}
            onPress={() => {
              setShowPlaylistOptionsModal(false);
              confirmDeletePlaylist();
            }}>
            <MaterialIcons name="delete" size={24} color="#E53935" />
            <Text style={[styles.optionText, styles.deleteText]}>
              Delete playlist
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit Playlist Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditNameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createPlaylistModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit playlist</Text>
              <TouchableOpacity
                onPress={updatePlaylistName}
                disabled={!newPlaylistName.trim()}>
                <Text
                  style={[
                    styles.createText,
                    !newPlaylistName.trim() && styles.disabledText,
                  ]}>
                  Save
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
    </View>
  );
};

export default LibraryScreen;

// Styles for LibraryScreen
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 20,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonText: {
    color: Colors.text,
    marginLeft: 4,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 24,
  },
  createButtonText: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortOptionsModal: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sortOptionsHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortOptionsTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sortOptionText: {
    color: Colors.text,
    fontSize: 16,
  },
  libraryItem: {
    flexDirection: 'row',
    padding: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  itemImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: Colors.elevatedBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistCoverGrid: {
    width: 56,
    height: 56,
    borderRadius: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  playlistCoverQuadrant: {
    width: 28,
    height: 28,
  },
  playlistCoverImage: {
    width: '100%',
    height: '100%',
  },
  playlistCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.elevatedBackground,
  },
  itemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  itemName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeIcon: {
    marginRight: 6,
  },
  itemType: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  optionsButton: {
    padding: 8,
  },
  createPlaylistModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    width: '90%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  createText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  playlistNameInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
  },
  playlistOptionsModal: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  optionText: {
    color: Colors.text,
    fontSize: 16,
    marginLeft: 16,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 16,
  },
  deleteText: {
    color: '#E53935',
  },
});
