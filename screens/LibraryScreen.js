// screens/LibraryScreen.js
import React, { useEffect, useState } from "react";
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
  ScrollView
} from "react-native";
import { getUserPlaylists, getUserSavedAlbums, getFollowedArtists, getRecentlyPlayedItems } from "../spotifyAPI";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../theme/colors";
import SQLite from 'react-native-sqlite-storage';

// Enable database promises
SQLite.enablePromise(true);

const LibraryScreen = ({ navigation }) => {
    const [playlists, setPlaylists] = useState([]);
    const [localPlaylists, setLocalPlaylists] = useState([]);
    const [savedAlbums, setSavedAlbums] = useState([]);
    const [followedArtists, setFollowedArtists] = useState([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState([]);
    const [localPlaylists, setLocalPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(null);
    const [sortMode, setSortMode] = useState("recent");
    const [showSortOptions, setShowSortOptions] = useState(false);
    const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showPlaylistOptionsModal, setShowPlaylistOptionsModal] = useState(false);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [db, setDb] = useState(null);

    useEffect(() => {
        const initializeDatabase = async () => {
            try {
                const database = await SQLite.openDatabase({
                    name: 'mydatabase.db',
                    location: 'default'
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

    useEffect(() => {
        const fetchLibraryData = async () => {
            setLoading(true);
            try {
                const userPlaylists = await getUserPlaylists();
                const userSavedAlbums = await getUserSavedAlbums();
                const userFollowedArtists = await getFollowedArtists();
                const userRecentlyPlayed = await getRecentlyPlayedItems();

                setPlaylists(userPlaylists?.items || []);
                setSavedAlbums(userSavedAlbums?.items || []);
                setFollowedArtists(userFollowedArtists?.items || []);
                setRecentlyPlayed(userRecentlyPlayed?.contexts || []);
            } catch (error) {
                console.error("Error fetching library data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLibraryData();
    }, []);

    const createTables = async (database) => {
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

    const fetchLocalPlaylists = async (database) => {
        try {
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
                const [coverResults] = await database.executeSql(`
                    SELECT s.albumArt 
                    FROM playlist_songs ps
                    JOIN songs s ON ps.songId = s.id
                    WHERE ps.playlistId = ?
                    ORDER BY ps.addedAt DESC
                    LIMIT 4;
                `, [playlist.id]);
                
                const albumArts = [];
                for (let j = 0; j < coverResults.rows.length; j++) {
                    albumArts.push(coverResults.rows.item(j).albumArt);
                }
                
                localPlaylistsData.push({
                    ...playlist,
                    type: "local_playlist",
                    displayName: playlist.name,
                    owner: "You", 
                    albumArts: albumArts,
                    image: albumArts[0] || null,
                    added_at: new Date(playlist.createdAt * 1000).toISOString()
                });
            }
            
            setLocalPlaylists(localPlaylistsData);
        } catch (error) {
            console.error('Error fetching local playlists:', error);
            Alert.alert('Error', 'Failed to load your saved playlists');
        }
    };

    const createNewPlaylist = async () => {
        if (!db || !newPlaylistName.trim()) return;

        try {
            const now = Math.floor(Date.now() / 1000);
            
            // Create the playlist
            const [result] = await db.executeSql(
                `INSERT INTO playlists (name, createdAt) VALUES (?, ?)`,
                [newPlaylistName.trim(), now]
            );
            
            setNewPlaylistName('');
            setShowCreatePlaylistModal(false);
            
            // Refresh local playlists
            fetchLocalPlaylists(db);
            
            // Navigate to the new playlist for adding songs
            navigation.navigate('PlaylistDetail', { 
                playlistId: result.insertId,
                playlistName: newPlaylistName.trim(),
                isLocal: true
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
            await db.executeSql(
                `DELETE FROM playlists WHERE id = ?`,
                [selectedPlaylist.id]
            );
            
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
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    onPress: deletePlaylist,
                    style: 'destructive'
                }
            ]
        );
    };

    const prepareData = () => {
        let data = [];
        
        // Add local playlists first
        if (activeFilter === null || activeFilter === "playlists") {
            data = [...data, ...localPlaylists];
        }
        
        // Then add spotify playlists
        if (activeFilter === null || activeFilter === "playlists") {
            data = [...data, ...playlists.map(item => ({
                ...item,
                type: "playlist",
                displayName: item.name,
                owner: item.owner?.display_name || "You", 
                image: item.images?.[0]?.url,
                id: item.id
            }))];
        }
        
        if (activeFilter === null || activeFilter === "localPlaylists") {
            data = [...data, ...localPlaylists.map(item => ({
                ...item,
                type: "localPlaylist",
                displayName: item.name || item.playlistName,
                owner: "Local Storage",
                image: item.image || null,
                id: item.id
            }))];
        }
        
        if (activeFilter === null || activeFilter === "albums") {
            data = [...data, ...savedAlbums.map(item => ({
                ...item,
                type: "album",
                displayName: item.album.name,
                owner: item.album.artists.map(artist => artist.name).join(", "),
                image: item.album.images?.[0]?.url,
                id: item.album.id
            }))];
        }
        
        if (activeFilter === null || activeFilter === "artists") {
            data = [...data, ...followedArtists.map(item => ({
                ...item,
                type: "artist",
                displayName: item.name,
                owner: "Artist",
                image: item.images?.[0]?.url,
                id: item.id
            }))];
        }
        
        switch (sortMode) {
            case "recent":
                return sortByRecentlyPlayed(data);
            case "added":
                return data.sort((a, b) => {
                    if (a.added_at && b.added_at) {
                        return new Date(b.added_at) - new Date(a.added_at);
                    }
                    return 0;
                });
            case "alphabetical":
                return data.sort((a, b) => a.displayName.localeCompare(b.displayName));
            default:
                return data;
        }
    };

    const handleItemPress = (item) => {
        if (item.type === "local_playlist") {
            navigation.navigate('PlaylistDetail', {
                playlistId: item.id,
                playlistName: item.displayName,
                isLocal: true
            });
        } else if (item.type === "playlist") {
            navigation.navigate('PlaylistDetail', {
                playlistId: item.id,
                playlistName: item.displayName,
                isLocal: false
            });
        } else if (item.type === "album") {
            navigation.navigate('AlbumDetail', { albumId: item.id });
        } else if (item.type === "artist") {
            navigation.navigate('ArtistDetail', { artistId: item.id });
        }
    };

    const handleItemLongPress = (item) => {
        if (item.type === "local_playlist") {
            setSelectedPlaylist(item);
            setShowPlaylistOptionsModal(true);
        }
    };

    const sortByRecentlyPlayed = (data) => {
        if (!recentlyPlayed || recentlyPlayed.length === 0) {
            return data;
        }

        const dataMap = new Map();
        data.forEach(item => {
            dataMap.set(item.id, item);
        });
        
        const recentlyPlayedMap = new Map();
        
        recentlyPlayed.forEach(context => {
            recentlyPlayedMap.set(context.id, context.playedAt);
        });
        
        return data.sort((a, b) => {
            const aPlayedAt = recentlyPlayedMap.get(a.id) || 0;
            const bPlayedAt = recentlyPlayedMap.get(b.id) || 0;
            
            if (aPlayedAt && bPlayedAt) {
                return bPlayedAt - aPlayedAt;
            }
            
            if (aPlayedAt && !bPlayedAt) return -1;
            if (!aPlayedAt && bPlayedAt) return 1;
            
            return 0;
        });
    };

    const renderFilterTab = (label, filterName) => (
        <TouchableOpacity
            style={[
                styles.filterTab,
                activeFilter === filterName ? styles.activeFilterTab : null
            ]}
            onPress={() => {
                if (activeFilter === filterName) {
                    setActiveFilter(null);
                } else {
                    setActiveFilter(filterName);
                }
            }}
        >
            <Text style={[
                styles.filterText,
                activeFilter === filterName ? styles.activeFilterText : null
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderLocalPlaylistCover = (item) => {
        if (item.albumArts && item.albumArts.length > 0) {
            if (item.albumArts.length === 1) {
                return (
                    <Image 
                        source={{ uri: item.albumArts[0] }} 
                        style={styles.itemImage}
                    />
                );
            } else {
                // Create a 2x2 grid of album arts
                return (
                    <View style={styles.playlistCoverGrid}>
                        {[0, 1, 2, 3].map((index) => (
                            <View key={index} style={styles.playlistCoverQuadrant}>
                                {item.albumArts[index] ? (
                                    <Image 
                                        source={{ uri: item.albumArts[index] }} 
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

    const renderLibraryItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.libraryItem}
            onPress={() => handleItemPress(item)}
            onLongPress={() => handleItemLongPress(item)}
            delayLongPress={500}
        >
            {item.type === "local_playlist" ? (
                renderLocalPlaylistCover(item)
            ) : (
                item.image ? (
                    <Image 
                        source={{ uri: item.image }} 
                        style={[
                            styles.itemImage,
                            item.type === "artist" ? styles.roundImage : null
                        ]}
                    />
                ) : (
                    <View style={[
                        styles.itemImagePlaceholder,
                        item.type === "artist" ? styles.roundImage : null
                    ]}>
                        <MaterialIcons 
                            name={item.type === "playlist" ? "playlist-play" : 
                                  item.type === "album" ? "album" : "person"} 
                            size={24} 
                            color={Colors.text} 
                        />
                    </View>
                )
            )}
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                    {item.displayName}
                </Text>
                <View style={styles.itemDetailRow}>
                    {item.type === "album" && (
                        <MaterialIcons name="album" size={14} color={Colors.primary} style={styles.typeIcon} />
                    )}
                    {(item.type === "playlist" || item.type === "local_playlist") && (
                        <MaterialIcons name="playlist-play" size={14} color={Colors.primary} style={styles.typeIcon} />
                    )}
                    <Text style={styles.itemType}>
                        {item.type === "artist" 
                            ? "Artist" 
                            : item.type === "local_playlist"
                                ? `Local playlist • ${item.songCount || 0} songs`
                                : `${item.type === "playlist" ? "Playlist" : item.type} • ${item.owner}`
                        }
                    </Text>
                </View>
            </View>
            {item.type === "local_playlist" && (
                <TouchableOpacity 
                    style={styles.optionsButton}
                    onPress={() => {
                        setSelectedPlaylist(item);
                        setShowPlaylistOptionsModal(true);
                    }}
                >
                    <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Your Library</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        style={styles.headerButton}
                        onPress={() => setShowCreatePlaylistModal(true)}
                    >
                        <Ionicons name="add" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
            
            <View style={styles.filterTabs}>
                {renderFilterTab("Playlists", "playlists")}
                {renderFilterTab("Local", "localPlaylists")}  
                {renderFilterTab("Albums", "albums")}
                {renderFilterTab("Artists", "artists")}
            </View>
            
            <View style={styles.sortRow}>
                <TouchableOpacity 
                    style={styles.sortButton}
                    onPress={() => setShowSortOptions(!showSortOptions)}
                >
                    <Ionicons name="swap-vertical" size={18} color={Colors.text} />
                    <Text style={styles.sortButtonText}>
                        {sortMode === "recent" ? "Recents" : 
                         sortMode === "added" ? "Recently Added" : "Alphabetical"}
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
                data={prepareData()}
                keyExtractor={(item, index) => {
                    if (item.type === "local_playlist") {
                        return `local-playlist-${item.id}`;
                    } else if (item.type === "album" && !item.id) {
                        return item.album?.id ? `album-${item.album.id}` : `album-index-${index}`;
                    }
                    return `${item.type}-${item.id || index}`;
                }}
                renderItem={renderLibraryItem}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
            />

            {/* Sort Options Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showSortOptions}
                onRequestClose={() => setShowSortOptions(false)}
            >
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
                            setSortMode("recent");
                            setShowSortOptions(false);
                        }}
                    >
                        <Text style={styles.sortOptionText}>Recents</Text>
                        {sortMode === "recent" && (
                            <Ionicons name="checkmark" size={24} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.sortOptionRow}
                        onPress={() => {
                            setSortMode("added");
                            setShowSortOptions(false);
                        }}
                    >
                        <Text style={styles.sortOptionText}>Recently added</Text>
                        {sortMode === "added" && (
                            <Ionicons name="checkmark" size={24} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.sortOptionRow}
                        onPress={() => {
                            setSortMode("alphabetical");
                            setShowSortOptions(false);
                        }}
                    >
                        <Text style={styles.sortOptionText}>Alphabetical</Text>
                        {sortMode === "alphabetical" && (
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
                onRequestClose={() => setShowCreatePlaylistModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.createPlaylistModal}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowCreatePlaylistModal(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Create playlist</Text>
                            <TouchableOpacity 
                                onPress={createNewPlaylist}
                                disabled={!newPlaylistName.trim()}
                            >
                                <Text style={[styles.createText, !newPlaylistName.trim() && styles.disabledText]}>
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
                onRequestClose={() => setShowPlaylistOptionsModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowPlaylistOptionsModal(false)}>
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
                                    isLocal: true
                                });
                            }
                        }}
                    >
                        <MaterialIcons name="queue-music" size={24} color={Colors.text} />
                        <Text style={styles.optionText}>View playlist</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.optionRow}>
                        <MaterialIcons name="edit" size={24} color={Colors.text} />
                        <Text style={styles.optionText}>Edit playlist</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.optionRow, styles.deleteOption]}
                        onPress={() => {
                            setShowPlaylistOptionsModal(false);
                            confirmDeletePlaylist();
                        }}
                    >
                        <MaterialIcons name="delete" size={24} color="#E53935" />
                        <Text style={[styles.optionText, styles.deleteText]}>Delete playlist</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

export default LibraryScreen;

// Completed styles for LibraryScreen
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
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
    },
    headerButtons: {
        flexDirection: "row",
    },
    headerButton: {
        marginLeft: 20,
    },
    filterTabs: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    filterTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: Colors.cardBackground,
    },
    activeFilterTab: {
        backgroundColor: Colors.text,
    },
    filterText: {
        color: Colors.text,
        fontSize: 14,
    },
    activeFilterText: {
        color: Colors.background,
    },
    sortRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    sortButtonText: {
        color: Colors.text,
        marginLeft: 4,
        fontSize: 14,
    },
    viewModeButton: {
        padding: 4,
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
        flexDirection: "row",
        padding: 8,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    itemImage: {
        width: 56,
        height: 56,
        borderRadius: 4,
    },
    roundImage: {
        borderRadius: 28,
    },
    itemImagePlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 4,
        backgroundColor: Colors.elevatedBackground,
        justifyContent: "center",
        alignItems: "center",
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
        fontWeight: "500",
    },
    itemDetailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    typeIcon: {
        marginRight: 6,
    },
    itemType: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: "400",
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