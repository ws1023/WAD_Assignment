import React, {useEffect} from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView,StatusBar,Alert} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorize } from 'react-native-app-auth';

const LoginScreen = () => {
    const navigation = useNavigation();

    useEffect(() => {
      const checkTokenValidity = async () => {
        const accessToken = await AsyncStorage.getItem("token");
        const expirationDate = await AsyncStorage.getItem("expirationDate");
        console.log("acess token",accessToken);
        console.log("expiration date",expirationDate);
  
        if(accessToken && expirationDate){
          const currentTime = Date.now();
          if(currentTime < parseInt(expirationDate)){
            navigation.replace("Main");
          } else {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("expirationDate");
          }
        }
      }
  
      checkTokenValidity();
    },[navigation])

    async function authenticate () {
    const config = {
        issuer:"https://accounts.spotify.com",
      clientId: 'db35cca4e0d841f7bc77daa2c597c43d',
      redirectUrl: 'WAD_Assignment_Spotify:/callback',
      scopes: [
        'user-read-email',
        'user-read-private',
        'playlist-read-private',
        'playlist-modify-public',
        'user-library-read',
        'user-recently-played',
        'user-top-read',
      ],
      serviceConfiguration: {
        authorizationEndpoint: 'https://accounts.spotify.com/authorize',
        tokenEndpoint: 'https://accounts.spotify.com/api/token',
      }
    }
    const result = await authorize(config);
    console.log(result);
    if(result.accessToken){
      const expirationDate = new Date(result.accessTokenExpirationDate).getTime();
      await AsyncStorage.setItem("token", result.accessToken);
      await AsyncStorage.setItem("expirationDate", expirationDate.toString());
      navigation.navigate("Main")
    }
  }


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
        >
          <Text style={styles.spotifyButtonText}>Sign In with Spotify</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.authButton}>
          <MaterialCommunityIcons name="cellphone" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.authButtonText}>Continue With phone number</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.authButton}>
          <FontAwesome name="google" size={24} color="#DB4437" style={styles.buttonIcon} />
          <Text style={styles.authButtonText}>Sign In with Google</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.authButton}>
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
    marginBottom: 60,
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
