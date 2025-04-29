// HomeScreen.js
import { StyleSheet, Text, View } from "react-native";
import React from "react";

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>HomeScreen</Text>
        </View>
    );
}

export default HomeScreen;

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