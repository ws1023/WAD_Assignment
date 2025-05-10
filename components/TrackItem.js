import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePlayback } from '../contexts/PlaybackContext';
import { Colors } from '../theme';

const TrackItem = ({ track, index, isInPlaylist = false, playlistId = null }) => {
  const { play, isFavorite, toggleFavorite } = usePlayback();
  
  // Handle playing a track
  const handlePlay = () => {
    if (isInPlaylist && playlistId) {
      // If in a playlist, play this track in context of the playlist
      play(null, `spotify:playlist:${playlistId}`, 0, index);
    } else if (track.album && track.album.id) {
      // If track has album info, play in context of album
      play(null, `spotify:album:${track.album.id}`, 0, index);
    } else {
      // Otherwise just play the single track
      play(`spotify:track:${track.id}`);
    }
  };
  
  // Handle toggling favorite status
  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    toggleFavorite(track.id);
  };
  
  return (
    <TouchableOpacity style={styles.container} onPress={handlePlay}>
      {track.album && track.album.images && track.album.images.length > 0 ? (
        <Image 
          source={{ uri: track.album.images[0].url }} 
          style={styles.albumArt} 
        />
      ) : (
        <View style={styles.placeholderArt}>
          <MaterialCommunityIcons name="music" size={24} color={Colors.textSecondary} />
        </View>
      )}
      
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {track.artists.map(artist => artist.name).join(', ')}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.favoriteButton} 
        onPress={handleToggleFavorite}
      >
        <MaterialCommunityIcons
          name={isFavorite(track.id) ? "check-circle" : "plus-circle-outline"}
          size={24}
          color={isFavorite(track.id) ? Colors.primary : Colors.text}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  placeholderArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  trackName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  artistName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  favoriteButton: {
    padding: 8,
  },
});

export default TrackItem;