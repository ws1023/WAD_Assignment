import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorize, refresh, prefetchConfiguration } from 'react-native-app-auth';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingAuth, setProcessingAuth] = useState(false);

  // Configure Spotify auth settings
  const spotifyAuthConfig = {
    clientId: 'db35cca4e0d841f7bc77daa2c597c43d',
    clientSecret: '2b33de4bd024472ebe1d1ef6b03923e4',
    redirectUrl: 'com.wadassignment://oauthredirect',
    scopes: [
      'user-read-email',
      'user-read-private',
      'user-top-read',
      'user-library-read',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-follow-read',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played'  // Add this line
    ],
    serviceConfiguration: {
      authorizationEndpoint: 'https://accounts.spotify.com/authorize',
      tokenEndpoint: 'https://accounts.spotify.com/api/token',
    },
    additionalParameters: {
      show_dialog: 'true'
    },
    // Try disabling PKCE to see if it helps with the issue
    usePKCE: false,
    dangerouslyAllowInsecureHttpRequests: false,
  };

  // Handle deep link URLs
  const handleUrl = async (url) => {
    console.log('Handling URL:', url);
    if (!url || processingAuth) return;
    
    if (url.includes('oauthredirect') && url.includes('code=')) {
      try {
        setProcessingAuth(true);
        console.log('Received OAuth redirect URL with code:', url);
        
        // Parse the authorization code from the URL
        const code = url.match(/code=([^&]+)/)[1];
        console.log('Extracted auth code:', code);
        
        // Manually exchange the code for a token
        const tokenResponse = await getTokenFromCode(code);
        
        if (tokenResponse && tokenResponse.access_token) {
          console.log('Successfully retrieved access token');
          
          // Format the response to match what we'd get from react-native-app-auth
          const authResult = {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresIn: tokenResponse.expires_in,
            scopes: tokenResponse.scope ? tokenResponse.scope.split(' ') : []
          };
          
          // Save the authentication result
          await saveAuthData(authResult);
          
          // Navigate to the main app
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else {
          throw new Error('Failed to exchange code for token');
        }
      } catch (error) {
        console.error('Error processing auth redirect:', error);
        setError('Failed to complete authentication: ' + error.message);
        Alert.alert(
          'Authentication Failed',
          'Failed to complete authentication process: ' + error.message,
          [{ text: 'OK' }]
        );
      } finally {
        setProcessingAuth(false);
        setIsLoading(false);
      }
    }
  };

  // Get token from authorization code
  const getTokenFromCode = async (code) => {
    try {
      // Create form data for the token request
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('code', code);
      formData.append('redirect_uri', spotifyAuthConfig.redirectUrl);
      formData.append('client_id', spotifyAuthConfig.clientId);
      formData.append('client_secret', spotifyAuthConfig.clientSecret);
      
      // Make the token request
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token request failed:', response.status, errorText);
        throw new Error(`Token request failed: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting token from code:', error);
      throw error;
    }
  };

  // Prefetch the configuration on component mount
  useEffect(() => {
    prefetchConfiguration(spotifyAuthConfig).catch(error => {
      console.log('Prefetch error:', error);
    });
  }, []);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    checkExistingToken();
    
    // Handle deep linking
    const handleDeepLink = (event) => {
      let url;
      // Extract URL differently based on platform or event format
      if (typeof event === 'object' && event !== null) {
        url = event.url || (event.data && event.data.url);
      } else if (typeof event === 'string') {
        url = event;
      }
      
      console.log('Deep link event received:', url);
      if (url) handleUrl(url);
    };
    
    // Register event listener for deep links
    Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened from a deep link
    Linking.getInitialURL().then(url => {
      console.log('Initial URL checked:', url);
      if (url) handleUrl(url);
    }).catch(err => console.error('Error getting initial URL:', err));
    
    return () => {
      // Clean up
      Linking.removeAllListeners('url');
    };
  }, []);

  // Check for existing tokens in AsyncStorage
  const checkExistingToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@spotify_token');
      const expirationDate = await AsyncStorage.getItem('@token_expiration');
      
      if (token && expirationDate) {
        // Check if token is still valid
        const now = new Date().getTime();
        if (now < parseInt(expirationDate)) {
          // Token is still valid, navigate to main app
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else {
          console.log('Token expired, need to re-authenticate');
          // Try to refresh the token
          const refreshed = await refreshTokenIfNeeded();
          if (refreshed) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing token:', error);
    }
  };

  // Try to refresh the token if we have a refresh token
  const refreshTokenIfNeeded = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('@refresh_token');
      if (!refreshToken) return false;
      
      // Using the library's refresh function
      const refreshResult = await refresh(spotifyAuthConfig, {
        refreshToken: refreshToken
      });
      
      if (refreshResult && refreshResult.accessToken) {
        await saveAuthData(refreshResult);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // Try manual refresh as fallback
      try {
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        if (!refreshToken) return false;
        
        const formData = new URLSearchParams();
        formData.append('grant_type', 'refresh_token');
        formData.append('refresh_token', refreshToken);
        formData.append('client_id', spotifyAuthConfig.clientId);
        formData.append('client_secret', spotifyAuthConfig.clientSecret);
        
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });
        
        if (!response.ok) return false;
        
        const tokenData = await response.json();
        
        const authResult = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken,
          expiresIn: tokenData.expires_in
        };
        
        await saveAuthData(authResult);
        return true;
      } catch (error) {
        console.error('Manual refresh error:', error);
        return false;
      }
    }
  };

  // Start Spotify authentication
  async function authenticate() {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try the automated approach first
      console.log('Starting Spotify authentication...');
      console.log('Redirect URL:', spotifyAuthConfig.redirectUrl);
      
      // On Android, we'll try to open the authorization URL manually
      if (Platform.OS === 'android') {
        // Generate a random state for security
        const randomState = Math.random().toString(36).substring(2, 15);
        
        // Build the authorization URL
        const authUrl = new URL(spotifyAuthConfig.serviceConfiguration.authorizationEndpoint);
        authUrl.searchParams.append('client_id', spotifyAuthConfig.clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', spotifyAuthConfig.redirectUrl);
        authUrl.searchParams.append('state', randomState);
        authUrl.searchParams.append('scope', spotifyAuthConfig.scopes.join(' '));
        authUrl.searchParams.append('show_dialog', 'true');
        
        // Store the state for later verification
        await AsyncStorage.setItem('@auth_state', randomState);
        
        console.log('Opening authorization URL:', authUrl.toString());
        
        // Open the authorization URL
        const supported = await Linking.canOpenURL(authUrl.toString());
        if (supported) {
          await Linking.openURL(authUrl.toString());
        } else {
          throw new Error('Cannot open authorization URL');
        }
      } else {
        // On iOS, try the library approach
        const result = await authorize(spotifyAuthConfig);
        
        console.log('Auth successful, response:', JSON.stringify(result, null, 2));
        
        if (!result.accessToken) {
          throw new Error('No access token received from Spotify');
        }
        
        await saveAuthData(result);
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (error) {
      console.error('Authentication error details:', error);
      let errorMessage = 'Could not connect to Spotify. ' + error.message;
      
      setError(errorMessage);
      
      Alert.alert(
        'Authentication Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
      setIsLoading(false);
    }
  }

  // Save authentication data to AsyncStorage
  const saveAuthData = async (authResult) => {
    try {
      console.log('Saving authentication data...');
      
      // Handle different date formats or calculate expiration
      let expirationDate;
      if (typeof authResult.accessTokenExpirationDate === 'string') {
        expirationDate = new Date(authResult.accessTokenExpirationDate).getTime();
      } else if (authResult.expiresIn) {
        expirationDate = new Date().getTime() + authResult.expiresIn * 1000;
      } else {
        // Default expiration: 1 hour
        expirationDate = new Date().getTime() + 3600 * 1000;
      }
      
      await AsyncStorage.setItem('@spotify_token', authResult.accessToken);
      if (authResult.refreshToken) {
        await AsyncStorage.setItem('@refresh_token', authResult.refreshToken);
      }
      await AsyncStorage.setItem('@token_expiration', expirationDate.toString());
      
      // Save additional user data if needed
      if (authResult.additionalParameters) {
        await AsyncStorage.setItem('@spotify_user_data', JSON.stringify(authResult.additionalParameters));
      }
      
      console.log('Authentication data saved successfully');
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error; // Re-throw to handle in the calling function
    }
  };

  // Handle alternative login methods (placeholders)
  const handleAlternativeLogin = (method) => {
    Alert.alert(
      'Not Implemented',
      `${method} login is not implemented in this demo.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.logoContainer}>
        <MaterialCommunityIcons
          name="spotify"
          color={"white"}
          size={130}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.headerText}>Millions of Songs</Text>
        <Text style={styles.headerText}>Free on Spotify!</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.spotifyButton}
          onPress={authenticate}
          disabled={isLoading || processingAuth}
        >
          {isLoading || processingAuth ? (
            <ActivityIndicator color="black" />
          ) : (
            <Text style={styles.spotifyButtonText}>Sign In with Spotify</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: Authentication failed</Text>
            <Text style={styles.errorDetails}>{error}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => handleAlternativeLogin('Phone')}
        >
          <MaterialCommunityIcons name="cellphone" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.authButtonText}>Continue With phone number</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => handleAlternativeLogin('Google')}
        >
          <FontAwesome name="google" size={24} color="#DB4437" style={styles.buttonIcon} />
          <Text style={styles.authButtonText}>Sign In with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => handleAlternativeLogin('Facebook')}
        >
          <FontAwesome name="facebook" size={24} color="#3b5998" style={styles.buttonIcon} />
          <Text style={styles.authButtonText}>Sign In with Facebook</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  textContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  spotifyButton: {
    backgroundColor: '#1DB954',
    borderRadius: 30,
    paddingVertical: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  spotifyButtonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 5,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorDetails: {
    color: '#ff5252',
    fontSize: 14,
    marginTop: 5,
  },
  authButton: {
    backgroundColor: '#121212',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;