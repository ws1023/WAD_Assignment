import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  search, 
  getPlaybackState, 
  startPlayback, 
  pausePlayback,
  seekToPosition
} from '../spotifyAPI';

// Create the context
export const PlaybackContext = createContext();

// Create a provider component
export const PlaybackProvider = ({ children }) => {
  // Add a state for the full playback state object
  const [playbackState, setPlaybackState] = useState(null);
  // Other existing state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState([]);

  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const state = await getPlaybackState();
        if (state) {
          // Store the complete playback state
          setPlaybackState(state);

          // Update the other state variables as before
          setIsPlaying(state.is_playing || false);

          if (state.item && (!currentTrack || state.item.id !== currentTrack.id)) {
            setCurrentTrack(state.item);
          }
        }
      } catch (error) {
        console.error('Error fetching playback state:', error);
      }
    }, 5000);

    setPollingInterval(interval);
    console.log('Playback polling started');
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('Playback polling stopped');
    }
  };

  // Play a specific track or album/playlist
  const play = async (uris = null, context_uri = null, position_ms = 0) => {
    try {
      // If uris is a single string, convert it to an array
      const trackUris = typeof uris === 'string' ? [uris] : uris;
      
      // Start playback with the specified parameters
      await startPlayback(null, trackUris, position_ms, context_uri);
      
      // Force an immediate state update
      const newState = await getPlaybackState();
      if (newState) {
        setPlaybackState(newState);
        setIsPlaying(newState.is_playing);
        if (newState.item) {
          setCurrentTrack(newState.item);
        }
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  // Pause the current playback
  const pause = async () => {
    try {
      await pausePlayback();
      setIsPlaying(false);
      // Update the playback state to reflect the pause
      setPlaybackState(prev => prev ? {...prev, is_playing: false} : null);
    } catch (error) {
      console.error('Error pausing playback:', error);
    }
  };

  // Seek to a specific position in the current track
  const seek = async (positionMs) => {
    try {
      await seekToPosition(positionMs);
      // Update local state immediately for smooth UI
      setPlaybackState(prev => 
        prev ? {...prev, progress_ms: positionMs} : null
      );
    } catch (error) {
      console.error('Error seeking to position:', error);
    }
  };

  // Toggle favorite status for a track
  const toggleFavorite = (trackId) => {
    setFavoriteTrackIds(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
    
    // Here you would also call your Spotify API to save this preference
    // For example: saveToFavorites(trackId) or removeFromFavorites(trackId)
  };

  // Check if a track is in favorites
  const isFavorite = (trackId) => {
    return favoriteTrackIds.includes(trackId);
  };

  // Load saved playback state on component mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const saved = await AsyncStorage.getItem('@favorite_tracks');
        if (saved) {
          setFavoriteTrackIds(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    
    loadFavorites();
    loadPlaybackState();
    startPolling(); // Start polling when the app loads
    
    return () => stopPolling(); // Stop polling when unmounted
  }, []);

  // Save playback state when it changes
  useEffect(() => {
    if (currentTrack) {
      savePlaybackState();
    }
  }, [currentTrack, isPlaying, queue]);

  // Save favorites when they change
  useEffect(() => {
    const saveFavorites = async () => {
      try {
        await AsyncStorage.setItem('@favorite_tracks', JSON.stringify(favoriteTrackIds));
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
    };
    
    if (favoriteTrackIds.length > 0) {
      saveFavorites();
    }
  }, [favoriteTrackIds]);

  // Load saved playback state from AsyncStorage
  const loadPlaybackState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('@playback_state');
      if (savedState) {
        const { currentTrack, queue, recentlyPlayed } = JSON.parse(savedState);
        setCurrentTrack(currentTrack);
        setQueue(queue || []);
        setRecentlyPlayed(recentlyPlayed || []);
      }
    } catch (error) {
      console.error('Error loading playback state:', error);
    }
  };

  // Save current playback state to AsyncStorage
  const savePlaybackState = async () => {
    try {
      const stateToSave = {
        currentTrack,
        queue,
        recentlyPlayed,
      };
      await AsyncStorage.setItem('@playback_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving playback state:', error);
    }
  };

  // Play a track
  const playTrack = (track) => {
    // Add current track to recently played if exists
    if (currentTrack) {
      setRecentlyPlayed((prev) => [
        currentTrack,
        ...prev.filter((t) => t.id !== currentTrack.id).slice(0, 19),
      ]);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
  };

  // Play/pause toggle
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Skip to next track
  const playNextTrack = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const newQueue = queue.slice(1);

      // Add current track to recently played
      if (currentTrack) {
        setRecentlyPlayed((prev) => [
          currentTrack,
          ...prev.filter((t) => t.id !== currentTrack.id).slice(0, 19),
        ]);
      }

      setCurrentTrack(nextTrack);
      setQueue(newQueue);
      setIsPlaying(true);
    }
  };

  // Add track to queue
  const addToQueue = (track) => {
    setQueue((prev) => [...prev, track]);
  };

  return (
    <PlaybackContext.Provider
      value={{
        playbackState,
        currentTrack,
        isPlaying,
        queue,
        recentlyPlayed,
        favoriteTrackIds,
        play,
        pause,
        seek,
        toggleFavorite,
        isFavorite,
        playTrack,
        togglePlay,
        playNextTrack,
        addToQueue,
        startPolling,
        stopPolling,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
};

// Custom hook for using the playback context
export const usePlayback = () => useContext(PlaybackContext);

// Default export for convenience
export default PlaybackProvider;