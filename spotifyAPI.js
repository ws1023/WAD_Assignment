import AsyncStorage from '@react-native-async-storage/async-storage';
import { refresh } from 'react-native-app-auth';

// Base URL for Spotify API
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Configuration for token refresh
const authConfig = {
  clientId: 'db35cca4e0d841f7bc77daa2c597c43d',
  redirectUrl: 'com.wadassignment://oauthredirect',
  serviceConfiguration: {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  },
};

// Get current valid token (refreshes if expired)
export const getValidToken = async () => {
  try {
    const token = await AsyncStorage.getItem('@spotify_token');
    const expirationDate = await AsyncStorage.getItem('@token_expiration');
    const refreshToken = await AsyncStorage.getItem('@refresh_token');
    
    // Check if token exists and is still valid
    if (token && expirationDate) {
      const now = new Date().getTime();
      
      // If token is expired, refresh it
      if (now >= parseInt(expirationDate) && refreshToken) {
        return await refreshAccessToken(refreshToken);
      }
      
      // If token is still valid, return it
      return token;
    }
    
    // No valid token found
    return null;
  } catch (error) {
    console.error('Error getting valid token:', error);
    return null;
  }
};

// Refresh the access token using the refresh token
const refreshAccessToken = async (refreshToken) => {
  try {
    const result = await refresh(authConfig, {
      refreshToken: refreshToken,
    });
    
    // Calculate new expiration time
    const expirationDate = new Date().getTime() + result.accessTokenExpirationDate * 1000;
    
    // Save new tokens
    await AsyncStorage.setItem('@spotify_token', result.accessToken);
    if (result.refreshToken) {
      await AsyncStorage.setItem('@refresh_token', result.refreshToken);
    }
    await AsyncStorage.setItem('@token_expiration', expirationDate.toString());
    
    return result.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Clear stored tokens if refresh fails
    await clearAuthData();
    return null;
  }
};

// Clear all authentication data
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem('@spotify_token');
    await AsyncStorage.removeItem('@refresh_token');
    await AsyncStorage.removeItem('@token_expiration');
    await AsyncStorage.removeItem('@spotify_user_data');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Get user profile information
export const getUserProfile = async () => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.status === 200) {
      return await response.json();
    } else {
      console.error('Failed to get user profile:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Get user's top tracks
export const getTopTracks = async (timeRange = 'medium_term', limit = 20) => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.status === 200) {
      return await response.json();
    } else {
      console.error('Failed to get top tracks:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return null;
  }
};

// Get user's top artists
export const getTopArtists = async (timeRange = 'medium_term', limit = 20) => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/top/artists?time_range=${timeRange}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.status === 200) {
      return await response.json();
    } else {
      console.error('Failed to get top artists:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching top artists:', error);
    return null;
  }
};

// Get user's playlists
export const getUserPlaylists = async (limit = 20, offset = 0) => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/playlists?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.status === 200) {
      return await response.json();
    } else {
      console.error('Failed to get playlists:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return null;
  }
};

// Search for tracks, artists, albums, etc.
export const search = async (query, types = ['track', 'artist', 'album'], limit = 20) => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const typeString = types.join(',');
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=${typeString}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.status === 200) {
      return await response.json();
    } else {
      console.error('Failed to search:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error searching:', error);
    return null;
  }
};

// 获取用户关注的艺术家
export const getUserFollowing = async (type = 'artist', limit = 1) => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/following?type=${type}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.status === 200) {
      return await response.json();
    } else {
      console.error('Failed to get user following:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user following:', error);
    return null;
  }
};

export const getRecentlyPlayed = async (limit = 50) => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/player/recently-played?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.status === 200) {
      return await response.json();
    } else {
      console.error('Failed to get recently played tracks:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    return null;
  }
};

export const getUserStats = async (timeRange = 'medium_term') => {
  const token = await getValidToken();
  if (!token) return null;
  
  try {
    const topTracks = await getTopTracks(timeRange, 50);
    
    const topArtists = await getTopArtists(timeRange, 50);
    
    const recentlyPlayed = await getRecentlyPlayed(50);
    
    if (!topTracks || !topArtists || !recentlyPlayed) {
      return null;
    }
    
    // Calculate estimated statistics
    // Note: These are very rough estimates and would not match real Spotify stats
    
    // Get unique tracks, artists, and albums from top tracks
    const uniqueTracks = new Set(topTracks.items.map(item => item.id));
    const uniqueArtists = new Set(topTracks.items.flatMap(item => item.artists.map(artist => artist.id)));
    const uniqueAlbums = new Set(topTracks.items.map(item => item.album.id));
    
    // Estimate streaming count based on popularity of top tracks
    // This is just a rough approximation
    const estimatedStreams = topTracks.items.reduce((sum, track) => sum + (track.popularity / 2), 0);
    
    // Estimate minutes streamed (average track is ~3.5 minutes)
    const estimatedMinutes = estimatedStreams * 3.5;
    
    // Convert to hours and days
    const estimatedHours = Math.floor(estimatedMinutes / 60);
    const estimatedDays = Math.floor(estimatedHours / 24);
    
    // Return estimated stats
    return {
      streams: Math.round(estimatedStreams),
      differentTracks: uniqueTracks.size,
      minutesStreamed: Math.round(estimatedMinutes),
      differentArtists: uniqueArtists.size,
      hoursStreamed: estimatedHours,
      differentAlbums: uniqueAlbums.size,
      daysStreamed: estimatedDays,
      // In a real implementation, you would calculate these from historical data
      changes: {
        streams: -Math.floor(Math.random() * 50),
        differentTracks: Math.floor(Math.random() * 10) - 5,
        minutesStreamed: -Math.floor(Math.random() * 50),
        differentArtists: -Math.floor(Math.random() * 15),
        hoursStreamed: -Math.floor(Math.random() * 50),
        differentAlbums: -Math.floor(Math.random() * 15),
        daysStreamed: -Math.floor(Math.random() * 50)
      },
      // For the daily stats visualization
      dailyStats: {
        streams: Math.floor(Math.random() * 100) + 20,
        minutes: Math.floor(Math.random() * 300) + 100
      }
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return null;
  }
};

export const getTopAlbums = async (timeRange = 'medium_term', limit = 20) => {
  try {
    const topTracks = await getTopTracks(timeRange, 50);
    if (!topTracks || !topTracks.items) return [];
    
    // Create a map to store unique albums
    const albumsMap = new Map();
    
    // Process each track to extract album info
    topTracks.items.forEach(track => {
      const albumId = track.album.id;
      
      if (!albumsMap.has(albumId)) {
        // Create new album entry
        albumsMap.set(albumId, {
          ...track.album,
          tracks: [track],
          popularity: track.popularity
        });
      } else {
        // Update existing album entry
        const album = albumsMap.get(albumId);
        album.tracks.push(track);
        album.popularity += track.popularity;
        albumsMap.set(albumId, album);
      }
    });
    
    // Convert map to array and sort by popularity
    const albums = Array.from(albumsMap.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
    
    return albums;
  } catch (error) {
    console.error('Error extracting top albums:', error);
    return [];
  }
};