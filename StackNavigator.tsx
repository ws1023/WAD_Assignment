// StackNavigator.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./screens/HomeScreen";
import SearchScreen from "./screens/SearchScreen";
import LibraryScreen from "./screens/LibraryScreen";
import StatsScreen from "./screens/StatsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import PlaybackScreen from './screens/PlaybackScreen';
import SongDetailScreen from './screens/SongDetailScreen'; 
import AlbumDetailsScreen from './screens/AlbumDetailsScreen'; 
import PlaylistDetailScreen from './screens/PlaylistDetailScreen'; 
import ArtistDetailScreen from './screens/ArtistDetailScreen'; 
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer, useNavigation, useRoute, getFocusedRouteNameFromRoute } from "@react-navigation/native";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { TouchableOpacity, Image, View, StyleSheet } from "react-native";
import { Colors } from './theme';
import { useEffect } from 'react';
import PlaybackBar from './components/PlaybackBar';
import { usePlayback } from './contexts/PlaybackContext';

const Tab = createBottomTabNavigator();

function ProfileAvatar({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={styles.avatarContainer}
    >
      <Image
        source={require('./assets/images/UCS_logo.png')}
        style={styles.avatar}
      />
    </TouchableOpacity>
  );
}

// Common header setup for all screens
const screenOptions = ({ navigation }) => ({
  headerStyle: {
    backgroundColor: Colors.background, 
    elevation: 0,
  },
  headerTintColor: Colors.text,
  headerLeft: () => <ProfileAvatar navigation={navigation} />,
  headerTitle: "",
});

function BottomTabs() {
  const { startPolling, stopPolling } = usePlayback();
  const route = useRoute();
  const navigation = useNavigation(); 
  
  // Start polling for playback state when component mounts
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  // Get the currently focused tab name
  const currentRouteName = getFocusedRouteNameFromRoute(route) || 'Home';
  
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopColor: Colors.background,
            height: 60,
            paddingBottom: 10,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: {
            marginTop: -15,
            textAlign: 'center'
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            ...screenOptions({ navigation }),
            tabBarIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name="home"
                size={focused ? 28 : 24}
                color={color}
              />
            ),
          })}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={({ navigation, route }) => ({
            ...screenOptions({ navigation }),
            // Tab bar visibility is controlled by the searchFocused state
            tabBarStyle:
              route.params?.searchFocused === true
                ? { display: 'none' }
                : {
                    backgroundColor: Colors.background,
                    borderTopColor: Colors.background,
                    height: 60,
                    paddingBottom: 10,
                  },
            tabBarIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name="magnify"
                size={focused ? 28 : 24}
                color={color}
              />
            ),
          })}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={({ navigation }) => ({
            ...screenOptions({ navigation }),
            tabBarIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name="bookshelf"
                size={focused ? 28 : 24}
                color={color}
              />
            ),
          })}
        />
        <Tab.Screen
          name="Stats"
          component={StatsScreen}
          options={({ navigation }) => ({
            ...screenOptions({ navigation }),
            tabBarIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name="chart-bar"
                size={focused ? 28 : 24}
                color={color}
              />
            ),
          })}
        />
      </Tab.Navigator>
      
      {/* Only show PlaybackBar on Home, Search, and Library screens */}
      {currentRouteName !== "Stats" && (
        <PlaybackBar onPress={() => navigation.navigate('Playback')} />
      )}
    </View>
  );
}

const Stack = createStackNavigator();

function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={BottomTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            headerStyle: {
              backgroundColor: Colors.cardBackground,
              elevation: 0,
            },
            headerTintColor: Colors.text,
          }}
        />
        <Stack.Screen
          name="Playback"
          component={PlaybackScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SongDetail"
          component={SongDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen  
          name="AlbumDetails" 
          component={AlbumDetailsScreen}
          options={{ headerShown: false }} 
        />
        <Stack.Screen  
          name="PlaylistDetail" 
          component={PlaylistDetailScreen}
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="ArtistDetails"
          component={ArtistDetailScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  avatarContainer: {
    marginLeft: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.elevatedBackground, 
  }
});

export default Navigation;