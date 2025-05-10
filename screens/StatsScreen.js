import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Image, FlatList, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import SQLite from 'react-native-sqlite-storage';

// Enable Promises for SQLite
SQLite.enablePromise(true);

const { width } = Dimensions.get('window');

const StatsScreen = () => {
  // Top artists related state
  const [topTimeRange, setTopTimeRange] = useState('medium_term'); // short_term (4 weeks), medium_term (6 months), long_term (lifetime)
  const [loading, setLoading] = useState(true);
  const [topArtists, setTopArtists] = useState([]);
  const [db, setDb] = useState(null);
  
  // Initialize database
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const database = await SQLite.openDatabase({
          name: 'playlists.db',
        location: 'default'
        });
        
        setDb(database);
        console.log('Database initialized in StatsScreen');
      } catch (error) {
        console.error('Error initializing database:', error);
        Alert.alert('Database Error', 'Could not connect to the local database.');
      }
    };

    initializeDatabase();
    
    // Cleanup
    return () => {
      if (db) {
        db.close()
          .then(() => console.log('Database closed'))
          .catch(error => console.error('Error closing database:', error));
      }
    };
  }, []);
  
  // Fetch top artists when database is ready or time range changes
  useEffect(() => {
    if (db) {
      fetchTopArtists(topTimeRange);
    }
  }, [db, topTimeRange]);

  // Fetch top artists from local database
  const fetchTopArtists = async (timeRange) => {
    if (!db) return;
    
    setLoading(true);
    
    try {
      // Calculate date threshold based on time range
      const now = Math.floor(Date.now() / 1000);
      let timeThreshold;
      
      switch (timeRange) {
        case 'short_term': // 4 weeks
          timeThreshold = now - (60 * 60 * 24 * 28); // 28 days ago
          break;
        case 'medium_term': // 6 months
          timeThreshold = now - (60 * 60 * 24 * 180); // 180 days ago
          break;
        case 'long_term': // all time / lifetime
          timeThreshold = 0; // no threshold
          break;
        default:
          timeThreshold = now - (60 * 60 * 24 * 180); // default to 6 months
      }
      
      // Query to get artists ranked by how many of their songs are in playlists
      const [results] = await db.executeSql(`
        SELECT 
          artist, 
          COUNT(*) as song_count,
          GROUP_CONCAT(DISTINCT albumArt) as images 
        FROM 
          songs s
        JOIN 
          playlist_songs ps ON s.id = ps.songId
        WHERE 
          ps.addedAt >= ?
        GROUP BY 
          artist
        ORDER BY 
          song_count DESC, artist ASC
        LIMIT 50
      `, [timeThreshold]);
      
      const artists = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        
        // Process the concatenated images
        let images = [];
        if (row.images) {
          // Split the images string and take unique values
          const imageUrls = [...new Set(row.images.split(','))];
          images = imageUrls.filter(url => url).map(url => ({ url }));
        }
        
        // If no images available, add placeholder
        if (images.length === 0) {
          images.push({ url: 'https://community.spotify.com/t5/image/serverpage/image-id/55829iC2AD64ADB887E2A5' });
        }
        
        artists.push({
          id: `local-artist-${i}`,
          name: row.artist,
          genres: [], // We don't have genres in local DB
          images,
          song_count: row.song_count,
        });
      }
      
      setTopArtists(artists);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching top artists from database:', error);
      setTopArtists([]);
      setLoading(false);
      Alert.alert('Error', 'Failed to fetch top artists from your library');
    }
  };
  
  // Convert time ranges for display
  const convertDisplayTimeRange = (range) => {
    switch(range) {
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
      <Image 
        source={{ uri: item.images[0]?.url }} 
        style={styles.trackImage} 
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {`${item.song_count} songs in your playlists`}
        </Text>
        <View style={styles.trackStats}>
        </View>
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
        
        <View style={styles.topItemsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : topArtists.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                No artists found. Add songs to your playlists to see your top artists here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={topArtists}
              renderItem={renderArtistItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{...styles.listContent, paddingBottom: 100}}
            />
          )}
        </View>

        <View style={styles.timeRangeSelector}>
          <TouchableOpacity
            style={styles.timeRangeButton}
            onPress={() => setTopTimeRange('short_term')}
          >
            <Text style={[styles.timeRangeText, topTimeRange === 'short_term' && styles.activeTimeRangeText]}>4 weeks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeRangeButton}
            onPress={() => setTopTimeRange('medium_term')}
          >
            <Text style={[styles.timeRangeText, topTimeRange === 'medium_term' && styles.activeTimeRangeText]}>6 months</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeRangeButton}
            onPress={() => setTopTimeRange('long_term')}
          >
            <Text style={[styles.timeRangeText, topTimeRange === 'long_term' && styles.activeTimeRangeText]}>lifetime</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  topTitleContainer: {
    alignItems: 'center',
    width: '100%',
  },
  topTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  topSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
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
    justifyContent: 'space-around',
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  }
});

export default StatsScreen;