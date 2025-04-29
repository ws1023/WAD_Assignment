// screens/SearchScreen.js
import { StyleSheet, Text, View } from "react-native";
import React from "react";

const SearchScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>SearchScreen</Text>
        </View>
    );
}

export default SearchScreen;

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