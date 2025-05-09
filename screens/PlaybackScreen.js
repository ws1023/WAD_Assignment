import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { usePlayback } from '../contexts/PlaybackContext';
import { Colors } from '../theme';
import { getArtistDetails, startPlayback, pausePlayback, seekToPosition } from '../spotifyAPI'; // Add this to your import statements

const { width, height } = Dimensions.get('window');

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
};

// Placeholder image when album art isn't available
const placeholderImage = 'https://community.spotify.com/t5/image/serverpage/image-id/55829iC2AD64ADB887E2A5';

const PlaybackScreen = () => {
  const navigation = useNavigation();
  const { playbackState, play, pause, isFavorite, toggleFavorite } = usePlayback();
  const [sliderValue, setSliderValue] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const intervalRef = useRef(null);
  const [artistDetails, setArtistDetails] = useState(null); // Add a state for artist details
  
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
  }, []);
  
  // Initialize progress and slider value when playback state changes
  useEffect(() => {
    if (playbackState && playbackState.item) {
      setCurrentProgress(playbackState.progress_ms || 0);
      setSliderValue(playbackState.progress_ms / playbackState.item.duration_ms);
      
      // Reset interval if it exists
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Only start interval if music is playing
      if (playbackState.is_playing) {
        startProgressInterval();
      }
    }
  }, [playbackState]);
  
  // Fetch artist details when the current track changes
  useEffect(() => {
    const fetchArtistInfo = async () => {
      if (playbackState && playbackState.item && playbackState.item.artists && playbackState.item.artists.length > 0) {
        try {
          const artistId = playbackState.item.artists[0].id;
          const details = await getArtistDetails(artistId);
          if (details) {
            setArtistDetails(details);
          }
        } catch (error) {
          console.error('Error fetching artist details:', error);
        }
      }
    };
    
    fetchArtistInfo();
  }, [playbackState?.item?.artists]);
  
  // Start the progress interval for real-time updates
  const startProgressInterval = () => {
    intervalRef.current = setInterval(() => {
      setCurrentProgress(prev => {
        const newProgress = prev + 100; // Update every 100ms
        
        if (playbackState && playbackState.item) {
          // Update slider position
          setSliderValue(newProgress / playbackState.item.duration_ms);
          
          // Stop if we reached the end of the track
          if (newProgress >= playbackState.item.duration_ms) {
            clearInterval(intervalRef.current);
          }
          
          return newProgress;
        }
        return prev;
      });
    }, 100);
  };
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Toggle play/pause should also handle the timer
  const handlePlayPause = () => {
    if (playbackState.is_playing) {
      pause();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      play();
      startProgressInterval();
    }
  };

  // Format followers count for display
  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleSliderValueChange = (value) => {
    // Update the slider value without updating time during slide
    setSliderValue(value);
  };

  const handleSliderSlidingComplete = async (value) => {
    // Calculate the position in ms
    const newPosition = Math.round(value * (playbackState.item.duration_ms || 0));
    setCurrentProgress(newPosition);
    
    // Call the API to seek to that position
    await seekToPosition(newPosition);
    
    // If the track was playing, ensure it continues playing
    if (playbackState.is_playing) {
      startProgressInterval();
    }
  };

  // First-level check for playback state
  if (!playbackState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-down" size={30} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.noPlaybackText}>Loading playback information...</Text>
      </SafeAreaView>
    );
  }

  // Second-level check for playback item
  if (!playbackState.item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-down" size={30} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.noPlaybackText}>Nothing is currently playing</Text>
      </SafeAreaView>
    );
  }

  // We have a valid playback state with an item
  const { item, is_playing } = playbackState;
  let albumImageUrl = placeholderImage;
  
  // Safely get album image
  if (item.album && item.album.images && item.album.images.length > 0) {
    albumImageUrl = item.album.images[0].url;
  }

  const artistName = item.artists ? item.artists[0].name : 'Unknown Artist';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-down" size={30} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.nowPlayingText}>NOW PLAYING</Text>
            <Text style={styles.albumTitle} numberOfLines={1}>
              {item.album ? item.album.name : 'Unknown Album'}
            </Text>
          </View>
          
          {/* Empty view for balance */}
          <View style={styles.backButton} />
        </View>

        {/* Album Art & Track Info */}
        <View style={styles.mainContent}>
          <View style={styles.trackInfoContainer}>
            <Image 
              source={{ uri: albumImageUrl }}
              style={styles.smallArtwork}
            />
            <View style={styles.trackTextContainer}>
              <Text style={styles.trackTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.artistNameSmall} numberOfLines={1}>{artistName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => toggleFavorite(item.id)}
            >
              <MaterialCommunityIcons 
                name={isFavorite(item.id) ? "check-circle" : "plus-circle-outline"} 
                size={24} 
                color={isFavorite(item.id) ? Colors.primary : Colors.text} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Slider */}
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={sliderValue}
              minimumTrackTintColor={Colors.text}
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
              thumbTintColor={Colors.text}
              onValueChange={handleSliderValueChange}
              onSlidingComplete={handleSliderSlidingComplete}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {formatTime(currentProgress)}
              </Text>
              <Text style={styles.timeText}>
                {formatTime(item.duration_ms || 0)}
              </Text>
            </View>
          </View>
          
          {/* Controls */}
          <View style={styles.controlsContainer}>
            {/* Only keep the play/pause button */}
            <TouchableOpacity 
              style={styles.playPauseButton} 
              onPress={handlePlayPause}
            >
              <MaterialCommunityIcons 
                name={is_playing ? "pause" : "play"} 
                size={30} 
                color="black" 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Artist Card */}
        <View style={styles.artistCardContainer}>
          <View style={styles.artistCard}>
            <Text style={styles.artistCardTitle}>About the artist</Text>
            
            <View style={styles.artistProfileContainer}>
              <Image 
                source={{ uri: albumImageUrl }}
                style={styles.artistImage}
              />
              <View style={styles.artistInfoContainer}>
                <Text style={styles.artistNameLarge}>{artistName}</Text>
                <Text style={styles.monthlyListeners}>
                  {artistDetails ? formatFollowers(artistDetails.followers.total) : '...'} followers
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40, // Fixed width to balance the header
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  nowPlayingText: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  albumTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  trackInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  smallArtwork: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  trackTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  artistNameSmall: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  addButton: {
    padding: 8,
  },
  sliderContainer: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -15,
  },
  timeText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistCardContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  artistCard: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 16,
  },
  artistCardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  artistProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  artistInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  artistNameLarge: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthlyListeners: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  artistBio: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  noPlaybackText: {
    color: Colors.text,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default PlaybackScreen;