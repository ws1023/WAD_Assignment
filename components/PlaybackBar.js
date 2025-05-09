import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePlayback } from '../contexts/PlaybackContext';
import { Colors } from '../theme';

const PlaybackBar = ({ onPress }) => {
  const { playbackState, pause, play, skipToNext, skipToPrevious } = usePlayback();

  // Don't render if no playback or not playing
  if (!playbackState || !playbackState.item) {
    return null;
  }

  const { item, is_playing, device } = playbackState;
  const { name, artists, album } = item;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progress, 
            { width: `${(playbackState.progress_ms / playbackState.item.duration_ms) * 100}%` }
          ]} 
        />
      </View>

      <View style={styles.content}>
        <Image 
          source={{ uri: album.images[0]?.url }}
          style={styles.albumArt}
        />
        
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>{name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {artists.map(artist => artist.name).join(', ')}
          </Text>
          {device && (
            <Text style={styles.deviceName} numberOfLines={1}>
              Playing on {device.name}
            </Text>
          )}
        </View>
        
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              skipToPrevious();
            }} 
            style={styles.controlButton}
          >
            <MaterialCommunityIcons name="skip-previous" size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              is_playing ? pause() : play();
            }} 
            style={styles.playPauseButton}
          >
            <MaterialCommunityIcons 
              name={is_playing ? "pause" : "play"} 
              size={28} 
              color={Colors.text} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              skipToNext();
            }} 
            style={styles.controlButton}
          >
            <MaterialCommunityIcons name="skip-next" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // Above the bottom tab bar
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
    elevation: 1, // For Android
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.inactive,
    width: '100%',
  },
  progress: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  artistName: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  deviceName: {
    color: Colors.primary,
    fontSize: 10,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 8,
  },
  playPauseButton: {
    padding: 8,
    marginHorizontal: 4,
  },
});

export default PlaybackBar;