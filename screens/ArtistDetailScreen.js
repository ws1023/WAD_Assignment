import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getArtistDetails, getArtistAlbums, getArtistTopTracks } from '../spotifyAPI';
import { Colors } from '../theme';

const { width } = Dimensions.get('window');
const ARTIST_IMAGE_SIZE = width * 0.6;

const ArtistDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { artistId } = route.params;
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('popular');
  const [expandedTracks, setExpandedTracks] = useState(false);

  useEffect(() => {
    if (artistId) {
      fetchArtistData();
    } else {
      console.error('No artist ID provided');
      setLoading(false);
    }
  }, [artistId]);

  const fetchArtistData = async () => {
    try {
      setLoading(true);
      console.log('Fetching artist data for ID:', artistId);
      const artistData = await getArtistDetails(artistId);
      if (artistData) {
        setArtist(artistData);
        const [albumsData, topTracksData] = await Promise.all([
          getArtistAlbums(artistId, 10),
          getArtistTopTracks(artistId)
        ]);
        if (albumsData) setAlbums(albumsData.items);
        if (topTracksData) setTopTracks(topTracksData.tracks);
      }
    } catch (error) {
      console.error('Error fetching artist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  };

  const renderTracks = () => {
    const tracksToShow = expandedTracks ? topTracks : topTracks.slice(0, 5);
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Popular</Text>
        {tracksToShow.map((track, index) => (
          <TouchableOpacity 
            key={track.id} 
            style={styles.trackItem}
            onPress={() => {}}
          >
            <Text style={styles.trackNumber}>{index + 1}</Text>
            <Image 
              source={{ uri: track.album.images[0]?.url }} 
              style={styles.trackImage} 
            />
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>{track.name}</Text>
              <Text style={styles.trackPlays}>{formatNumber(track.popularity * 1000)} plays</Text>
            </View>
            <TouchableOpacity style={styles.menuButton}>
              <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {!expandedTracks && topTracks.length > 5 && (
          <TouchableOpacity 
            style={styles.seeMoreButton}
            onPress={() => setExpandedTracks(true)}
          >
            <Text style={styles.seeMoreText}>See more</Text>
          </TouchableOpacity>
        )}
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

  if (!artist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.errorText}>Could not load artist information</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchArtistData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.followButton}
            onPress={toggleFollow}
          >
            <Text style={styles.followButtonText}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content Tabs - Modified to be 50/50 split */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'popular' && styles.activeTab]}
          onPress={() => setActiveTab('popular')}
        >
          <Text style={[styles.tabText, activeTab === 'popular' && styles.activeTabText]}>Popular</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'albums' && styles.activeTab]}
          onPress={() => setActiveTab('albums')}
        >
          <Text style={[styles.tabText, activeTab === 'albums' && styles.activeTabText]}>Albums</Text>
        </TouchableOpacity>
      </View>

      {/* Conditional rendering based on active tab */}
      {activeTab === 'popular' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Artist Header */}
          <View style={styles.artistHeader}>
            <Image 
              source={{ uri: artist.images[0]?.url }} 
              style={styles.artistCoverImage} 
            />
            <View style={styles.artistInfo}>
              <Text style={styles.artistNameLarge}>{artist.name}</Text>
              <Text style={styles.followerCount}>
                {formatNumber(artist.followers.total)} followers • {artist.genres.slice(0, 2).join(', ')}
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.shuffleButton}>
                  <MaterialCommunityIcons name="shuffle-variant" size={20} color="#000" />
                  <Text style={styles.shuffleText}>Shuffle</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.playButton, isFollowing ? styles.followingButton : null]}
                  onPress={toggleFollow}
                >
                  <Text style={styles.playButtonText}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Popular tracks section */}
          {renderTracks()}
          <View style={styles.spacer} />
        </ScrollView>
      ) : (
        <View style={styles.container}>
          {/* Artist Header - Simplified for Albums tab */}
          <View style={[styles.artistHeader, styles.albumsArtistHeader]}>
            <Image 
              source={{ uri: artist.images[0]?.url }} 
              style={styles.albumsArtistImage} 
            />
            <Text style={styles.artistNameMedium}>{artist.name}</Text>
          </View>

          {/* Albums list - Using FlatList at the root level */}
          <FlatList
            data={[...albums].sort((a, b) => {
              const dateA = new Date(a.release_date || 0);
              const dateB = new Date(b.release_date || 0);
              return dateB - dateA; // newest first
            })}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={() => (
              <Text style={[styles.sectionTitle, styles.albumsListHeader]}>Albums</Text>
            )}
            renderItem={({item}) => (
              <TouchableOpacity 
                style={styles.albumListItem}
                onPress={() => navigation.navigate('AlbumDetails', { albumId: item.id })}
              >
                <Image 
                  source={{ uri: item.images[0]?.url }} 
                  style={styles.albumListImage} 
                />
                <View style={styles.albumListInfo}>
                  <Text style={styles.albumTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.albumYear}>{item.release_date?.split('-')[0]}</Text>
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.albumsListContainer}
          />
        </View>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.text,
    marginRight: 16,
  },
  followButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  menuButton: {
    padding: 8,
  },
  artistHeader: {
    alignItems: 'center',
    padding: 16,
  },
  artistCoverImage: {
    width: ARTIST_IMAGE_SIZE,
    height: ARTIST_IMAGE_SIZE,
    borderRadius: ARTIST_IMAGE_SIZE / 2,
    marginBottom: 20,
  },
  artistInfo: {
    alignItems: 'center',
    width: '100%',
  },
  artistNameLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  followerCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  shuffleButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginRight: 12,
  },
  shuffleText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  playButton: {
    borderWidth: 1,
    borderColor: Colors.text,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderColor: Colors.text,
  },
  playButtonText: {
    color: Colors.text,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.text,
    fontWeight: '500',
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackNumber: {
    width: 25,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  trackImage: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 4,
  },
  trackPlays: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  seeMoreButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
  },
  seeMoreText: {
    color: Colors.text,
    fontSize: 14,
  },
  albumsContainer: {
    paddingBottom: 16,
  },
  albumItem: {
    width: 170,
    marginRight: 16,
  },
  albumImage: {
    width: 170,
    height: 170,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumTitle: {
    color: Colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  albumYear: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  artistsContainer: {
    paddingBottom: 16,
  },
  artistItem: {
    width: 150,
    marginRight: 16,
    alignItems: 'center',
  },
  artistImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 8,
  },
  artistName: {
    color: Colors.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  artistType: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  spacer: {
    height: 80,
  },
  albumListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 12,
  },
  albumListImage: {
    width: 70,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
  },
  albumListInfo: {
    flex: 1,
  },
  albumsListContainer: {
    paddingBottom: 16,
  },
  albumsArtistHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  albumsArtistImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  artistNameMedium: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  albumsListHeader: {
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
});

export default ArtistDetailScreen;