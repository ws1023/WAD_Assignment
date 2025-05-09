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
  TouchableWithoutFeedback
} from "react-native";
import { getUserPlaylists, getUserSavedAlbums, getFollowedArtists, getRecentlyPlayedItems } from "../spotifyAPI";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from "../theme/colors";
import { queryLocalPlaylists } from '../utils/storage';
import { useNavigation } from "@react-navigation/native";

const LibraryScreen = () => {
    const navigation = useNavigation();
    const [playlists, setPlaylists] = useState([]);
    const [savedAlbums, setSavedAlbums] = useState([]);
    const [followedArtists, setFollowedArtists] = useState([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState([]);
    const [localPlaylists, setLocalPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(null);
    const [sortMode, setSortMode] = useState("recent");
    const [showSortOptions, setShowSortOptions] = useState(false);

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

    useEffect(() => {
        const fetchLocalPlaylists = async () => {
            try {
                const localPlaylistsData = await queryLocalPlaylists();
                setLocalPlaylists(localPlaylistsData || []);
            } catch (error) {
                console.error('Error fetching local playlists:', error);
                setLocalPlaylists([]);
            }
        };
        
        fetchLocalPlaylists();
    }, []);

    const prepareData = () => {
        let data = [];
        
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

    const renderLibraryItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.libraryItem}
            onPress={() => {
                if (item.type === "album") {
                    navigation.navigate('AlbumDetails', { albumId: item.id });
                } else if (item.type === "playlist" || item.type === "localPlaylist") {
                    navigation.navigate('PlaylistDetails', { playlistId: item.id });
                } else if (item.type === "artist") {
                    navigation.navigate('ArtistDetails', { artistId: item.id });
                }
            }}
        >
            {item.image ? (
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
            )}
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                    {item.displayName}
                </Text>
                <View style={styles.itemDetailRow}>
                    {item.type === "album" && (
                        <MaterialIcons name="album" size={14} color={Colors.primary} style={styles.typeIcon} />
                    )}
                    {item.type === "playlist" && (
                        <MaterialIcons name="playlist-play" size={14} color={Colors.primary} style={styles.typeIcon} />
                    )}
                    <Text style={styles.itemType}>
                        {item.type === "artist" ? "Artist" : `${item.type} • ${item.owner}`}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Your Library</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity style={styles.headerButton}>
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
            
            {showSortOptions && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showSortOptions}
                    onRequestClose={() => {
                        setShowSortOptions(false);
                    }}
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
            )}
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
                    if (item.type === "album" && !item.id) {
                        return item.album?.id ? `album-${item.album.id}` : `album-index-${index}`;
                    }
                    return `${item.type}-${item.id || index}`;
                }}
                renderItem={renderLibraryItem}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default LibraryScreen;

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
    },
});