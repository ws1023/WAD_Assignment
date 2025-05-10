import AsyncStorage from '@react-native-async-storage/async-storage';
import {refresh} from 'react-native-app-auth';
import {refresh} from 'react-native-app-auth';

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

    // Check if token exists and is not empty
    if (!token || token.trim() === '') {
      console.log('No token found or token is empty');
      return null;
    }

    // Check if token exists and is still valid
    if (token && expirationDate) {
      const now = new Date().getTime();


      // If token is expired, refresh it
      if (now >= parseInt(expirationDate) && refreshToken) {
        console.log('Token expired, refreshing...');
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
const refreshAccessToken = async refreshToken => {
const refreshAccessToken = async refreshToken => {
  try {
    console.log('Attempting to refresh token');
    const result = await refresh(authConfig, {
      refreshToken: refreshToken,
    });


    // Calculate new expiration time
    const expirationDate = new Date().getTime() + result.expiresIn * 1000;
    
    // Save new tokens
    await AsyncStorage.setItem('@spotify_token', result.accessToken);
    if (result.refreshToken) {
      await AsyncStorage.setItem('@refresh_token', result.refreshToken);
    }
    await AsyncStorage.setItem('@token_expiration', expirationDate.toString());

    console.log('Token refreshed successfully');
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
    console.log('Auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Helper function to handle API responses
const handleApiResponse = async (response, endpoint) => {
  if (response.status === 204) {
    console.log(`${endpoint}: Operation successful (204 No Content)`);
    return {};
  } else if (response.status === 200) {
    console.log(`${endpoint}: Operation successful (200 OK)`);
    return await response.json();
  } else if (response.status === 401) {
    console.error(`${endpoint}: Authentication failed (401)`);
    // Clear tokens on auth failure
    await clearAuthData();
    return { error: 'Authentication failed', status: 401 };
  } else {
    console.error(`${endpoint}: Failed operation: ${response.status}`);
    const errorText = await response.text();
    console.error(`Error details: ${errorText}`);
    return { error: `Request failed with status ${response.status}`, status: response.status };
  }
};

// Get user profile information
export const getUserProfile = async () => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await handleApiResponse(response, 'getUserProfile');
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { error: error.message };
  }
};

// Get user's top tracks
export const getTopTracks = async (timeRange = 'medium_term', limit = 20) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getTopTracks');
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return { error: error.message };
  }
};

// Get user's top artists
export const getTopArtists = async (timeRange = 'medium_term', limit = 20) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/top/artists?time_range=${timeRange}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getTopArtists');
  } catch (error) {
    console.error('Error fetching top artists:', error);
    return { error: error.message };
  }
};

// Get user's playlists
export const getUserPlaylists = async (limit = 20, offset = 0) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/playlists?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getUserPlaylists');
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return { error: error.message };
  }
};

// Search for tracks, artists, albums, etc.
export const search = async (
  query,
  types = ['track', 'artist', 'album'],
  limit = 20,
) => {
export const search = async (
  query,
  types = ['track', 'artist', 'album'],
  limit = 20,
) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const typeString = types.join(',');
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
        query,
      )}&type=${typeString}&limit=${limit}`,
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
        query,
      )}&type=${typeString}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'search');
  } catch (error) {
    console.error('Error searching:', error);
    return { error: error.message };
  }
};

// Get user's followed artists
export const getUserFollowing = async (type = 'artist', limit = 1) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/following?type=${type}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getUserFollowing');
  } catch (error) {
    console.error('Error fetching user following:', error);
    return { error: error.message };
  }
};

// Get recently played tracks
export const getRecentlyPlayed = async (limit = 50) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/player/recently-played?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      },
    );
    
    return await handleApiResponse(response, 'getRecentlyPlayed');
  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    return { error: error.message };
  }
};

// Get recently played items with context
export const getRecentlyPlayedItems = async (limit = 50) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/player/recently-played?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await handleApiResponse(response, 'getRecentlyPlayedItems');
    if (data.error) return data;

    // Extract context info from each item
    const recentContexts = new Map();

    // Process each recently played track
    data.items.forEach(item => {
      // Track info
      const trackId = item.track.id;
      const playedAt = new Date(item.played_at).getTime();

      // Context type (playlist, album, artist)
      if (item.context) {
        const contextUri = item.context.uri;
        const contextType = contextUri.split(':')[1]; // spotify:TYPE:ID
        const contextId = contextUri.split(':')[2];

        // Only store the most recent play for each context
        if (
          !recentContexts.has(contextUri) ||
          playedAt > recentContexts.get(contextUri).playedAt
        ) {
          recentContexts.set(contextUri, {
            type: contextType,
            id: contextId,
            playedAt,
            track: item.track,
          });
        }
      }

      // Also track individual items (albums and artists) from tracks without context
      if (!item.context) {
        // Add album
        const albumUri = `spotify:album:${item.track.album.id}`;
        if (
          !recentContexts.has(albumUri) ||
          playedAt > recentContexts.get(albumUri).playedAt
        ) {
          recentContexts.set(albumUri, {
            type: 'album',
            id: item.track.album.id,
            playedAt,
            track: item.track,
          });
        }

        // Add primary artist
        if (item.track.artists.length > 0) {
          const artistUri = `spotify:artist:${item.track.artists[0].id}`;
          if (
            !recentContexts.has(artistUri) ||
            playedAt > recentContexts.get(artistUri).playedAt
          ) {
            recentContexts.set(artistUri, {
              type: 'artist',
              id: item.track.artists[0].id,
              playedAt,
              track: item.track,
            });
          }
        }
      }
    });

    return {
      items: data.items,
      contexts: Array.from(recentContexts.values()),
    };
  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    return { error: error.message };
  }
};

// Get user stats
export const getUserStats = async (timeRange = 'medium_term') => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    // This is where we would combine data from multiple API calls to estimate stats
    // In a real implementation, you would need a backend service to track this data over time

    // Get user's top tracks
    const topTracks = await getTopTracks(timeRange, 50);
    if (topTracks.error) return { error: 'Failed to get top tracks' };

    const topArtists = await getTopArtists(timeRange, 50);
    if (topArtists.error) return { error: 'Failed to get top artists' };

    const recentlyPlayed = await getRecentlyPlayed(50);
    if (recentlyPlayed.error) return { error: 'Failed to get recently played' };

    // Calculate estimated statistics
    // Note: These are very rough estimates and would not match real Spotify stats


    // Get unique tracks, artists, and albums from top tracks
    const uniqueTracks = new Set(topTracks.items.map(item => item.id));
    const uniqueArtists = new Set(
      topTracks.items.flatMap(item => item.artists.map(artist => artist.id)),
    );
    const uniqueArtists = new Set(
      topTracks.items.flatMap(item => item.artists.map(artist => artist.id)),
    );
    const uniqueAlbums = new Set(topTracks.items.map(item => item.album.id));


    // Estimate streaming count based on popularity of top tracks
    // This is just a rough approximation
    const estimatedStreams = topTracks.items.reduce(
      (sum, track) => sum + track.popularity / 2,
      0,
    );

    const estimatedStreams = topTracks.items.reduce(
      (sum, track) => sum + track.popularity / 2,
      0,
    );

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
        daysStreamed: -Math.floor(Math.random() * 50),
        daysStreamed: -Math.floor(Math.random() * 50),
      },
      // For the daily stats visualization
      dailyStats: {
        streams: Math.floor(Math.random() * 100) + 20,
        minutes: Math.floor(Math.random() * 300) + 100,
      },
        minutes: Math.floor(Math.random() * 300) + 100,
      },
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return { error: error.message };
  }
};

// Get top albums
export const getTopAlbums = async (timeRange = 'medium_term', limit = 20) => {
  try {
    const topTracks = await getTopTracks(timeRange, 50);
    if (topTracks.error) return [];

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
          popularity: track.popularity,
          popularity: track.popularity,
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

// Get album details 
export const getAlbumDetails = async albumId => {
  try {
    const token = await getValidToken();
    if (!token) return { error: 'No valid token' };

    const response = await fetch(`${SPOTIFY_API_BASE}/albums/${albumId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await handleApiResponse(response, 'getAlbumDetails');
  } catch (error) {
    console.error('Error fetching album details:', error);
    return { error: error.message };
  }
};

// Get the current playback state
export const getPlaybackState = async () => {
  try {
    const token = await getValidToken();
    if (!token) return { error: 'No valid token' };

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await handleApiResponse(response, 'getPlaybackState');
  } catch (error) {
    console.error('Error fetching playback state:', error);
    return { error: error.message };
  }
};

// Get detailed information about an artist
export const getArtistDetails = async artistId => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/artists/${artistId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await handleApiResponse(response, 'getArtistDetails');
  } catch (error) {
    console.error('Error fetching artist details:', error);
    return { error: error.message };
  }
};

// Get an artist's albums
export const getArtistAlbums = async (artistId, limit = 20, offset = 0) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/albums?include_groups=album,single,compilation&limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getArtistAlbums');
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    return { error: error.message };
  }
};

// Get an artist's top tracks
export const getArtistTopTracks = async (artistId, market = 'US') => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=${market}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getArtistTopTracks');
  } catch (error) {
    console.error('Error fetching artist top tracks:', error);
    return { error: error.message };
  }
};

// Get user's saved albums
export const getUserSavedAlbums = async (limit = 50) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/albums?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getUserSavedAlbums');
  } catch (error) {
    console.error('Error fetching saved albums:', error);
    return { error: error.message };
  }
};

// Get followed artists
export const getFollowedArtists = async (limit = 50) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/following?type=artist&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await handleApiResponse(response, 'getFollowedArtists');
    if (data.error) return data;
    
    return data.artists; // Return the artists object directly
  } catch (error) {
    console.error('Error fetching followed artists:', error);
    return { error: error.message };
  }
};

// Search for tracks
export const searchTracks = async (query, limit = 20) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
        query,
      )}&type=track&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'searchTracks');
  } catch (error) {
    console.error('Error searching tracks:', error);
    return { error: error.message };
  }
};

// Get playlist details
export const getPlaylistDetails = async playlistId => {
  try {
    const token = await getValidToken();
    if (!token) return { error: 'No valid token' };

    const response = await fetch(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'getPlaylistDetails');
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    return { error: error.message };
  }
};

// Start or resume playback
export const startPlayback = async (
  deviceId = null,
  uris = null,
  positionMs = 0,
  contextUri = null,
  offset = null,
) => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const endpoint = `${SPOTIFY_API_BASE}/me/player/play${
      deviceId ? `?device_id=${deviceId}` : ''
    }`;

    // Build the request body based on available parameters
    const body = {};

    if (contextUri) {
      body.context_uri = contextUri;
      if (typeof offset === 'number') {
        body.offset = {position: offset};
      }
    } else if (uris && Array.isArray(uris)) {
      body.uris = uris;
    }

    if (positionMs > 0) {
      body.position_ms = positionMs;
    }

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return await handleApiResponse(response, 'startPlayback');
  } catch (error) {
    console.error('Error starting playback:', error);
    return { error: error.message };
  }
};

// Pause playback
export const pausePlayback = async () => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me/player/pause`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await handleApiResponse(response, 'pausePlayback');
  } catch (error) {
    console.error('Error pausing playback:', error);
    return { error: error.message };
  }
};

// Skip to next track
export const skipToNext = async () => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me/player/next`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await handleApiResponse(response, 'skipToNext');
  } catch (error) {
    console.error('Error skipping to next track:', error);
    return { error: error.message };
  }
};

// Skip to previous track
export const skipToPrevious = async () => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me/player/previous`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await handleApiResponse(response, 'skipToPrevious');
  } catch (error) {
    console.error('Error skipping to previous track:', error);
    return { error: error.message };
  }
};

// Seek to position in the current track
export const seekToPosition = async positionMs => {
  const token = await getValidToken();
  if (!token) return { error: 'No valid token' };

  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/player/seek?position_ms=${positionMs}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await handleApiResponse(response, 'seekToPosition');
  } catch (error) {
    console.error('Error seeking:', error);
    return { error: error.message };
  }
};

// Helper function to handle API errors at component level
export const handleApiError = async (error, navigation) => {
  if (error && error.status === 401) {
    console.log('Authentication error detected, redirecting to login');
    await clearAuthData();
    if (navigation) {
      navigation.navigate('Login');
    }
    return true; // Error was handled
  }
  return false; // Error wasn't handled
};