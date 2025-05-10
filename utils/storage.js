import AsyncStorage from '@react-native-async-storage/async-storage';

// Key for storing playlists
const LOCAL_PLAYLISTS_KEY = 'localPlaylists';

/**
 * Get all local playlists
 */
export const queryLocalPlaylists = async () => {
  try {
    const playlistsJson = await AsyncStorage.getItem(LOCAL_PLAYLISTS_KEY);
    return playlistsJson ? JSON.parse(playlistsJson) : [];
  } catch (error) {
    console.error('Error retrieving local playlists:', error);
    return [];
  }
};

/**
 * Insert a new local playlist
 */
export const insertLocalPlaylist = async (playlist) => {
  try {
    const playlists = await queryLocalPlaylists();
    const now = new Date().toISOString();
    
    const newPlaylist = {
      id: playlist.id || Math.random().toString(36).substring(2, 15),
      name: playlist.name,
      description: playlist.description || '',
      image: playlist.image || null,
      type: 'localPlaylist',
      owner: 'Local Storage',
      created_at: playlist.createdAt || now,
      updated_at: now
    };
    
    playlists.unshift(newPlaylist); // Add to beginning of array
    await AsyncStorage.setItem(LOCAL_PLAYLISTS_KEY, JSON.stringify(playlists));
    return newPlaylist;
  } catch (error) {
    console.error('Error adding local playlist:', error);
    return null;
  }
};

// For sample data
export const insertSampleData = async () => {
  try {
    await insertLocalPlaylist({
      name: 'My Offline Favorites',
      description: 'Songs for offline listening'
    });
    
    await insertLocalPlaylist({
      name: 'Road Trip Mix',
      description: 'Best songs for driving'
    });
    
    console.log('Sample playlists added successfully');
    return true;
  } catch (error) {
    console.error('Error adding sample data:', error);
    return false;
  }
};

export default {
  queryLocalPlaylists,
  insertLocalPlaylist,
  insertSampleData
};