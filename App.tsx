import { StyleSheet, Text, View } from "react-native";
import Navigation from "./StackNavigator";
import { Colors } from './theme';
import { PlaybackProvider } from './contexts/PlaybackContext';

export default function App() {
  return (
    <PlaybackProvider>
      <View style={styles.container}>
        <Navigation />
      </View>
    </PlaybackProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});