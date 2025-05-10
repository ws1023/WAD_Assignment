// screens/PlaylistDetail.js
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../theme/colors";
import SQLite from 'react-native-sqlite-storage';
import { getPlaylistTracks } from "../spotifyAPI";

// Format duration from milliseconds to MM:SS
const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const PlaylistDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { playlistId, playlistName, isLocal } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState({
    name: playlistName,
    description: "",
    image: null,
    totalTracks: 0,
  });
  const [db, setDb] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState(playlistName);

  useEffect(() => {
    const initDb = async () => {
      try {
        const database = await SQLite.openDatabase({
          name: 'mydatabase.db',
          location: 'default'
        });
        setDb(database);
        
        if (isLocal) {
          fetchLocalPlaylistTracks(database);
        }
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };
    
    initDb();
    
    // If it's a Spotify playlist, fetch from API
    if (!isLocal) {
      fetchSpotifyPlaylistTracks();
    }
    
    return () => {
      if (db) {
        db.close()
          .then(() => console.log('Database closed'))
          .catch(error => console.error('Error closing database:', error));
      }
    };
  }, [playlistId, isLocal]);

  // Set navigation title and header menu
  useEffect(() => {
    navigation.setOptions({
      title: playlistInfo.name,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{marginLeft: 16}}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity 
          style={{ paddingRight: 16 }} 
          onPress={() => {
            if (isLocal) {
              setShowEditNameModal(true);
            }
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, playlistInfo.name, isLocal]);

  const fetchLocalPlaylistTracks = async (database) => {
    try {
      setLoading(true);
      
      // Get playlist info
      const [playlistInfoResult] = await database.executeSql(
        `SELECT p.*, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlistId = p.id) as totalTracks
         FROM playlists p WHERE p.id = ?`,
        [playlistId]
      );
      
      if (playlistInfoResult.rows.length > 0) {
        const playlist = playlistInfoResult.rows.item(0);
        
        // Get album arts for cover
        const [coverResult] = await database.executeSql(
          `SELECT s.albumArt 
           FROM playlist_songs ps
           JOIN songs s ON ps.songId = s.id
           WHERE ps.playlistId = ?
           ORDER BY ps.addedAt DESC
           LIMIT 4`,
          [playlistId]
        );
        
        const albumArts = [];
        for (let i = 0; i < coverResult.rows.length; i++) {
          albumArts.push(coverResult.rows.item(i).albumArt);
        }
        
        setPlaylistInfo({
          name: playlist.name,
          description: "",
          totalTracks: playlist.totalTracks,
          image: albumArts[0] || null,
          albumArts: albumArts
        });
      }
      
      // Get tracks
      const [tracksResult] = await database.executeSql(
        `SELECT s.*, ps.addedAt 
         FROM playlist_songs ps
         JOIN songs s ON ps.songId = s.id
         WHERE ps.playlistId = ?
         ORDER BY ps.addedAt DESC`,
        [playlistId]
      );
      
      const tracksData = [];
      for (let i = 0; i < tracksResult.rows.length; i++) {
        const track = tracksResult.rows.item(i);
        tracksData.push({
          id: track.id,
          name: track.name,
          artist: track.artist,
          album: track.album,
          albumArt: track.albumArt,
          uri: track.uri,
          duration: track.duration,
          addedAt: track.addedAt
        });
      }
      
      setTracks(tracksData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching local playlist tracks:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load playlist tracks');
    }
  };

  const fetchSpotifyPlaylistTracks = async () => {
    try {
      setLoading(true);
      const response = await getPlaylistTracks(playlistId);
      
      if (response) {
        setPlaylistInfo({
          name: response.name || playlistName,
          description: response.description || "",
          image: response.images?.[0]?.url || null,
          totalTracks: response.tracks?.total || 0
        });
        
        // Process tracks
        const tracksData = response.tracks?.items?.map(item => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map(artist => artist.name).join(", "),
          album: item.track.album.name,
          albumArt: item.track.album.images?.[0]?.url,
          uri: item.track.uri,
          duration: item.track.duration_ms,
          addedAt: new Date(item.added_at).getTime()
        })) || [];
        
        setTracks(tracksData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching Spotify playlist tracks:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load playlist tracks');
    }
  };

  const navigateToAddTracks = () => {
    // Navigate to search screen with callback parameter to add tracks
    navigation.navigate('Search', { 
      isSelectingTracks: true,
      onTrackSelected: (track) => addTrackToPlaylist(track)
    });
  };

  const addTrackToPlaylist = async (track) => {
    if (!isLocal || !db) return;
    
    try {
      // First check if this track is already in the playlist
      const [existingCheck] = await db.executeSql(
        `SELECT * FROM playlist_songs WHERE playlistId = ? AND songId = ?`,
        [playlistId, track.id]
      );
      
      if (existingCheck.rows.length > 0) {
        Alert.alert('Info', 'This track is already in the playlist');
        return;
      }
      
      // Insert the song if it doesn't exist
      await db.executeSql(
        `INSERT OR IGNORE INTO songs (id, name, artist, album, albumArt, uri, duration)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [track.id, track.name, track.artist, track.album, track.albumArt, track.uri, track.duration]
      );
      
      // Add to playlist
      const now = Math.floor(Date.now() / 1000);
      await db.executeSql(
        `INSERT INTO playlist_songs (playlistId, songId, addedAt) VALUES (?, ?, ?)`,
        [playlistId, track.id, now]
      );
      
      console.log('Song added to playlist successfully');
      
      // Refresh playlist
      fetchLocalPlaylistTracks(db);
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      Alert.alert('Error', 'Failed to add track to playlist');
    }
  };

  const removeTrackFromPlaylist = async () => {
    if (!isLocal || !db || !selectedTrack) return;
    
    try {
      await db.executeSql(
        `DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?`,
        [playlistId, selectedTrack.id]
      );
      
      // Refresh playlist
      fetchLocalPlaylistTracks(db);
      setShowOptionsModal(false);
      setSelectedTrack(null);
      
      Alert.alert('Success', 'Track removed from playlist');
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      Alert.alert('Error', 'Failed to remove track from playlist');
    }
  };

  const updatePlaylistName = async () => {
    if (!isLocal || !db || !newPlaylistName.trim()) return;
    
    try {
      await db.executeSql(
        `UPDATE playlists SET name = ? WHERE id = ?`,
        [newPlaylistName.trim(), playlistId]
      );
      
      // Update state
      setPlaylistInfo(prevInfo => ({
        ...prevInfo,
        name: newPlaylistName.trim()
      }));
      
      setShowEditNameModal(false);
      Alert.alert('Success', 'Playlist name updated');
    } catch (error) {
      console.error('Error updating playlist name:', error);
      Alert.alert('Error', 'Failed to update playlist name');
    }
  };

  const renderPlaylistHeader = () => {
    return (
      <View style={styles.playlistHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.customBackButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        
        {/* Playlist Cover */}
        <View style={styles.coverContainer}>
          {isLocal && playlistInfo.albumArts && playlistInfo.albumArts.length > 1 ? (
            <View style={styles.playlistCoverGrid}>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={styles.playlistCoverQuadrant}>
                  {playlistInfo.albumArts[index] ? (
                    <Image 
                      source={{ uri: playlistInfo.albumArts[index] }} 
                      style={styles.playlistCoverImage}
                    />
                  ) : (
                    <View style={styles.playlistCoverPlaceholder} />
                  )}
                </View>
              ))}
            </View>
            
          ) : playlistInfo.image ? (
            <Image source={{ uri: playlistInfo.image }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <MaterialIcons name="playlist-play" size={56} color={Colors.text} />
            </View>
          )}
        </View>
        
        {/* Playlist Info */}
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistName}>{playlistInfo.name}</Text>
          
          {playlistInfo.description ? (
            <Text style={styles.playlistDescription} numberOfLines={2}>
              {playlistInfo.description}
            </Text>
          ) : null}
          
          <Text style={styles.playlistStats}>
            {playlistInfo.totalTracks} {playlistInfo.totalTracks === 1 ? 'track' : 'tracks'}
          </Text>
        </View>

      </View>
    );
  };

  const renderTrackItem = ({ item, index }) => {
    return (
      <TouchableOpacity 
        style={styles.trackItem}
        onPress={() => {}}
        onLongPress={() => {
          if (isLocal) {
            setSelectedTrack(item);
            setShowOptionsModal(true);
          }
        }}
      >
        <View style={styles.trackIndexContainer}>
          <Text style={styles.trackIndex}>{index + 1}</Text>
        </View>
        
        {item.albumArt ? (
          <Image source={{ uri: item.albumArt }} style={styles.trackImage} />
        ) : (
          <View style={styles.trackImagePlaceholder}>
            <MaterialIcons name="music-note" size={20} color={Colors.textSecondary} />
          </View>
        )}
        
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        
        {isLocal && (
          <TouchableOpacity 
            style={styles.trackOptions}
            onPress={() => {
              setSelectedTrack(item);
              setShowOptionsModal(true);
            }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `track-${item.id || index}`}
        renderItem={renderTrackItem}
        ListHeaderComponent={renderPlaylistHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks in this playlist</Text>
            {isLocal && (
              <TouchableOpacity 
                style={styles.emptyAddButton}
                onPress={navigateToAddTracks}
              >
                <Text style={styles.emptyAddText}>Add Tracks</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      
      {/* Edit Playlist Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEditNameModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.editNameModal}>
          <Text style={styles.modalTitle}>Edit Playlist Name</Text>
          
          <TextInput
            style={styles.nameInput}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            placeholder="Playlist name"
            placeholderTextColor={Colors.textSecondary}
            autoFocus
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowEditNameModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={updatePlaylistName}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Track Options Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOptionsModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.trackOptionsModal}>
          {selectedTrack && (
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedTrack.name}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {selectedTrack.artist}
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => {
              // Play track functionality would go here
              setShowOptionsModal(false);
            }}
          >
            <MaterialIcons name="music-note" size={24} color={Colors.text} />
            <Text style={styles.optionText}>Play track</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => {
              // Add to queue functionality would go here
              setShowOptionsModal(false);
            }}
          >
            <MaterialIcons name="queue-music" size={24} color={Colors.text} />
            <Text style={styles.optionText}>Add to queue</Text>
          </TouchableOpacity>
          
          {isLocal && (
            <TouchableOpacity 
              style={[styles.optionRow, styles.deleteOption]}
              onPress={removeTrackFromPlaylist}
            >
              <MaterialIcons name="delete" size={24} color="#E53935" />
              <Text style={[styles.optionText, styles.deleteText]}>Remove from playlist</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  playlistHeader: {
    padding: 16,
  },
  customBackButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    width: 200,
    height: 200,
    alignSelf: "center",
    marginBottom: 16,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: Colors.elevatedBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistCoverGrid: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  playlistCoverQuadrant: {
    width: "50%",
    height: "50%",
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
  playlistInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  playlistName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  playlistDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  playlistStats: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  shuffleText: {
    color: Colors.text,
    marginLeft: 8,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  addText: {
    color: Colors.text,
    marginLeft: 8,
    fontWeight: "600",
  },
  // Track item styles
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  trackIndexContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 8,
  },
  trackIndex: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  trackImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: Colors.elevatedBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
  },
  trackName: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  trackOptions: {
    padding: 8,
  },
  // Empty state styles
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
  emptyAddButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  emptyAddText: {
    color: Colors.text,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Edit name modal styles
  editNameModal: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: Colors.elevatedBackground,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  nameInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 10,
    marginVertical: 20,
    fontSize: 16,
    color: Colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    padding: 10,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  saveButton: {
    marginLeft: 20,
  },
  saveButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Track options modal styles
  trackOptionsModal: {
    backgroundColor: Colors.elevatedBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 32,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalHeader: {
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 16,
  },
  deleteOption: {
    marginTop: 8,
  },
  deleteText: {
    color: "#E53935",
  },
});

export default PlaylistDetail;