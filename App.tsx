import { StyleSheet, Text, View } from "react-native";
import Navigation from "./StackNavigator";
import { Colors } from './theme';

export default function App() {
  return (
    <View style={styles.container}>
      <Navigation />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});