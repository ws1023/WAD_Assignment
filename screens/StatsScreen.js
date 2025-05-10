import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Image, FlatList, Dimensions } from 'react-native';
import { getTopArtists, getValidToken } from '../spotifyAPI';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
  // Top items related state
  const [topTimeRange, setTopTimeRange] = useState('medium_term'); // short_term (4 weeks), medium_term (6 months), long_term (lifetime)
  const [loading, setLoading] = useState(true);
  const [topArtists, setTopArtists] = useState([]);

  useEffect(() => {
    fetchTopArtists(topTimeRange);
  }, [topTimeRange]);

  // Fetch top artists data
  const fetchTopArtists = async (timeRange) => {
    setLoading(true);

    try {
      const token = await getValidToken();
      if (!token) {
        console.error('No valid token available');
        setLoading(false);
        return;
      }

      const artists = await getTopArtists(timeRange, 50);
      if (artists && artists.items) {
        setTopArtists(artists.items);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching top artists:', error);
      setLoading(false);
    }
  };

  // Convert time ranges
  const convertDisplayTimeRange = (range) => {
    switch (range) {
      case 'short_term':
        return '4 weeks';
      case 'medium_term':
        return '6 months';
      case 'long_term':
        return 'lifetime';
      default:
        return '6 months';
    }
  };

  // Render artist item in top artists list
  const renderArtistItem = ({ item, index }) => (
    <View style={styles.trackItem}>
      <View style={styles.trackRank}>
        <Text style={styles.rankText}>{index + 1}.</Text>
      </View>
      <Image source={{ uri: item.images[0]?.url }} style={styles.trackImage} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.genres.slice(0, 2).join(', ')}
        </Text>
        <View style={styles.trackStats}></View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.topHeader}>
            <View style={styles.topTitleContainer}>
              <Text style={styles.topTitle}>Top Artists</Text>
              <Text style={styles.topSubtitle}>
                past {convertDisplayTimeRange(topTimeRange)}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.topItemsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={topArtists}
                renderItem={renderArtistItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  ...styles.listContent,
                  paddingBottom: 100,
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.timeRangeSelector}>
          <TouchableOpacity
            style={styles.timeRangeButton}
            onPress={() => setTopTimeRange('short_term')}
          >
            <Text
              style={[
                styles.timeRangeText,
                topTimeRange === 'short_term' && styles.activeTimeRangeText,
              ]}
            >
              4 weeks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeRangeButton}
            onPress={() => setTopTimeRange('medium_term')}
          >
            <Text
              style={[
                styles.timeRangeText,
                topTimeRange === 'medium_term' && styles.activeTimeRangeText,
              ]}
            >
              6 months
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeRangeButton}
            onPress={() => setTopTimeRange('long_term')}
          >
            <Text
              style={[
                styles.timeRangeText,
                topTimeRange === 'long_term' && styles.activeTimeRangeText,
              ]}
            >
              lifetime
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  topTitleContainer: {
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  topSubtitle: {
    fontSize: 14,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  topItemsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 70,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackRank: {
    width: 30,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  rankText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  trackArtist: {
    color: Colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingVertical: 15,
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  timeRangeButton: {
    paddingHorizontal: 5,
  },
  timeRangeText: {
    color: Colors.text,
    fontSize: 14,
  },
  activeTimeRangeText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});

export default StatsScreen;