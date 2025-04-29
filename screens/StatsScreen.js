// screens/LibraryScreen.js
import { StyleSheet, Text, View } from "react-native";
import React from "react";

const LibraryScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>LibraryScreen</Text>
        </View>
    );
}

export default LibraryScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
    }
})