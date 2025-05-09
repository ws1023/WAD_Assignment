import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { search, getPlaybackState } from '../spotifyAPI';

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

  // Load saved playback state on component mount
  useEffect(() => {
    loadPlaybackState();
  }, []);

  // Save playback state when it changes
  useEffect(() => {
    if (currentTrack) {
      savePlaybackState();
    }
  }, [currentTrack, isPlaying, queue]);

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
        playbackState, // Add this to expose the full playback state
        currentTrack,
        isPlaying,
        queue,
        recentlyPlayed,
        playTrack,
        togglePlay,
        playNextTrack,
        addToQueue,
        startPolling,
        stopPolling,
        // Add these for the play/pause functionality in PlaybackBar
        play: () => {
          /* Add play implementation */
        },
        pause: () => {
          /* Add pause implementation */
        },
        skipToNext: playNextTrack,
        skipToPrevious: () => {
          /* Add skipToPrevious implementation */
        },
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