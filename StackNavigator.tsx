// StackNavigator.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./screens/HomeScreen";
import SearchScreen from "./screens/SearchScreen";
import LibraryScreen from "./screens/LibraryScreen";
import StatsScreen from "./screens/StatsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { TouchableOpacity, Image, View, StyleSheet } from "react-native";

const Tab = createBottomTabNavigator();

function ProfileAvatar({ navigation }) {
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Profile')}
      style={styles.avatarContainer}
    >
      <Image 
        source={require('./assets/images/UCS_logo.png')} // Replace with your actual avatar image
        style={styles.avatar}
        // If you don't have an image yet, use a placeholder icon instead:
        // fallback={<MaterialCommunityIcons name="account-circle" size={32} color="#FFFFFF" />}
      />
    </TouchableOpacity>
  );
}

// Common header setup for all screens
const screenOptions = ({ navigation }) => ({
  headerStyle: {
    backgroundColor: '#121212',
    elevation: 0, // for Android
    shadowOpacity: 0, // for iOS
  },
  headerTintColor: '#FFFFFF',
  headerLeft: () => <ProfileAvatar navigation={navigation} />,
  headerTitle: "",
});

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#333333',
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#1DB954', // Spotify green
        tabBarInactiveTintColor: '#B3B3B3', // Spotify inactive color
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
        options={({ navigation }) => ({
          ...screenOptions({ navigation }),
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
  );
}

const Stack = createStackNavigator();

function Navigation(){
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen} 
                  options={{headerShown: false}}
                />
                <Stack.Screen 
                  name="Main" 
                  component={BottomTabs} 
                  options={{headerShown: false}}
                />
                <Stack.Screen 
                  name="Profile" 
                  component={ProfileScreen} 
                  options={{
                    headerStyle: {
                      backgroundColor: '#121212',
                    },
                    headerTintColor: '#FFFFFF',
                  }}
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
    backgroundColor: '#333333', 
  }
});

export default Navigation;