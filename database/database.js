import SQLite from 'react-native-sqlite-storage';

// Enable Promise API
SQLite.enablePromise(true);

let dbConnection = null;

export const initDatabase = async () => {
  try {
    if (!dbConnection) {
      dbConnection = await SQLite.openDatabase({
        name: 'playlists.db',
        location: 'default'
      });
      
      // Create tables
      await dbConnection.executeSql(`
        CREATE TABLE IF NOT EXISTS playlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          created_at TEXT NOT NULL
        );
      `);
      
      await dbConnection.executeSql(`
        CREATE TABLE IF NOT EXISTS tracks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          spotify_id TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          artist TEXT NOT NULL,
          album TEXT,
          image_url TEXT,
          uri TEXT NOT NULL
        );
      `);
      
      await dbConnection.executeSql(`
        CREATE TABLE IF NOT EXISTS playlist_tracks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playlist_id INTEGER,
          track_id INTEGER,
          added_at TEXT NOT NULL,
          position INTEGER,
          FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
          FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
        );
      `);
    }
    return dbConnection;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Playlist CRUD operations
export const getPlaylists = async () => {
  try {
    if (!dbConnection) await initDatabase();
    const [results] = await dbConnection.executeSql('SELECT * FROM playlists ORDER BY created_at DESC');
    
    const playlists = [];
    for (let i = 0; i < results.rows.length; i++) {
      playlists.push(results.rows.item(i));
    }
    return playlists;
  } catch (error) {
    console.error('Error getting playlists:', error);
    throw error;
  }
};

export const createPlaylist = async (name, description = '', imageUrl = null) => {
  try {
    if (!dbConnection) await initDatabase();
    const createdAt = new Date().toISOString();
    
    const [results] = await dbConnection.executeSql(
      'INSERT INTO playlists (name, description, image_url, created_at) VALUES (?, ?, ?, ?)',
      [name, description, imageUrl, createdAt]
    );
    
    return results.insertId;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

export const updatePlaylist = async (id, name, description = '', imageUrl = null) => {
  try {
    if (!dbConnection) await initDatabase();
    await dbConnection.executeSql(
      'UPDATE playlists SET name = ?, description = ?, image_url = ? WHERE id = ?',
      [name, description, imageUrl, id]
    );
    return true;
  } catch (error) {
    console.error('Error updating playlist:', error);
    throw error;
  }
};

export const deletePlaylist = async (id) => {
  try {
    if (!dbConnection) await initDatabase();
    await dbConnection.executeSql('DELETE FROM playlists WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
};

// Track operations
export const addTrackToPlaylist = async (playlistId, track) => {
  try {
    if (!dbConnection) await initDatabase();
    
    // First check if track already exists
    const [trackResults] = await dbConnection.executeSql(
      'SELECT id FROM tracks WHERE spotify_id = ?',
      [track.id]
    );
    
    let trackId;
    
    if (trackResults.rows.length > 0) {
      // Track exists, get its ID
      trackId = trackResults.rows.item(0).id;
    } else {
      // Track doesn't exist, insert it first
      const [insertResults] = await dbConnection.executeSql(
        'INSERT INTO tracks (spotify_id, name, artist, album, image_url, uri) VALUES (?, ?, ?, ?, ?, ?)',
        [
          track.id,
          track.name,
          track.artists.map(a => a.name).join(', '),
          track.album?.name || '',
          track.album?.images?.[0]?.url || null,
          track.uri
        ]
      );
      trackId = insertResults.insertId;
    }
    
    // Get current max position
    const [posResults] = await dbConnection.executeSql(
      'SELECT IFNULL(MAX(position), -1) as maxPos FROM playlist_tracks WHERE playlist_id = ?',
      [playlistId]
    );
    
    const newPosition = posResults.rows.item(0).maxPos + 1;
    const addedAt = new Date().toISOString();
    
    // Insert playlist track with next position
    await dbConnection.executeSql(
      'INSERT INTO playlist_tracks (playlist_id, track_id, added_at, position) VALUES (?, ?, ?, ?)',
      [playlistId, trackId, addedAt, newPosition]
    );
    
    return true;
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    throw error;
  }
};

export const removeTrackFromPlaylist = async (playlistId, trackId) => {
  try {
    if (!dbConnection) await initDatabase();
    
    await dbConnection.executeSql(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
      [playlistId, trackId]
    );
    
    // Reorder remaining tracks
    await dbConnection.executeSql(
      `UPDATE playlist_tracks
       SET position = (
         SELECT COUNT(*) FROM (
           SELECT * FROM playlist_tracks
           WHERE playlist_id = ? AND added_at <= playlist_tracks.added_at AND id != playlist_tracks.id
         ) as pt2
       )
       WHERE playlist_id = ?`,
      [playlistId, playlistId]
    );
    
    return true;
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    throw error;
  }
};

export const getPlaylistTracks = async (playlistId) => {
  try {
    if (!dbConnection) await initDatabase();
    
    const [results] = await dbConnection.executeSql(
      `SELECT t.*, pt.position, pt.added_at
       FROM tracks t
       JOIN playlist_tracks pt ON t.id = pt.track_id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position ASC`,
      [playlistId]
    );
    
    const tracks = [];
    for (let i = 0; i < results.rows.length; i++) {
      tracks.push(results.rows.item(i));
    }
    return tracks;
  } catch (error) {
    console.error('Error getting playlist tracks:', error);
    throw error;
  }
};

export const reorderPlaylistTracks = async (playlistId, oldPosition, newPosition) => {
  try {
    if (!dbConnection) await initDatabase();
    
    if (oldPosition < newPosition) {
      // Moving down: shift tracks between oldPosition+1 and newPosition up by 1
      await dbConnection.executeSql(
        `UPDATE playlist_tracks
         SET position = position - 1
         WHERE playlist_id = ? AND position > ? AND position <= ?`,
        [playlistId, oldPosition, newPosition]
      );
    } else if (oldPosition > newPosition) {
      // Moving up: shift tracks between newPosition and oldPosition-1 down by 1
      await dbConnection.executeSql(
        `UPDATE playlist_tracks
         SET position = position + 1
         WHERE playlist_id = ? AND position >= ? AND position < ?`,
        [playlistId, newPosition, oldPosition]
      );
    } else {
      // No change needed
      return true;
    }
    
    // Update the moved track's position
    await dbConnection.executeSql(
      `UPDATE playlist_tracks
       SET position = ?
       WHERE playlist_id = ? AND position = ?`,
      [newPosition, playlistId, oldPosition]
    );
    
    return true;
  } catch (error) {
    console.error('Error reordering tracks:', error);
    throw error;
  }
};

// For search functionality
export const searchTracks = async (query) => {
  try {
    const token = await getValidToken();
    if (!token) {
      console.error('No valid token available');
      return null;
    }
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching tracks:', error);
    return null;
  }
};

// This is just placeholder code - replace with your actual implementation
const queryLocalPlaylists = async () => {
    // Example function to query SQLite
    // Replace with your actual database query
    try {
        // Example:
        // const db = await openDatabase();
        // const results = await db.executeSql('SELECT * FROM playlists');
        // return results.rows.raw();
        
        // Placeholder return:
        return [];
    } catch (error) {
        console.error("SQLite query error:", error);
        return [];
    }
};

export default {
  initDatabase,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getPlaylistTracks,
  reorderPlaylistTracks
};