// screens/StatsScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, FlatList, Dimensions } from 'react-native';
import { getTopTracks, getTopArtists, getValidToken } from '../spotifyAPI';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';

const { width } = Dimensions.get('window');

// Circular chart component for listening clocks (from previous implementation)
const CircularChart = ({ data, type }) => {
    return (
      <View style={styles.clockContainer}>
        <View style={styles.clock}>
          {Array(24).fill(0).map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.clockSegment, 
                {
                  transform: [{ rotate: `${i * 15}deg` }],
                  backgroundColor: Math.random() > 0.3 ? Colors.primary : Colors.border // 使用已定义的颜色
                }
              ]} 
            />
          ))}
          <View style={styles.clockCenter}>
            {/* 修改时钟中心文本定位 */}
            <Text style={[styles.clockCenterText, { top: 5 }]}>0</Text>
            <Text style={[styles.clockCenterText, { bottom: 5 }]}>6</Text>
            <Text style={[styles.clockCenterText, { left: 5 }]}>9</Text>
            <Text style={[styles.clockCenterText, { right: 5 }]}>3</Text>
          </View>
        </View>
        <Text style={styles.clockLabel}>{type}</Text>
      </View>
    );
  };

const StatsScreen = () => {
  // Stats-related state
  const [currentView, setCurrentView] = useState('stats'); // 'stats' or 'top'
  const [statsTimeRange, setStatsTimeRange] = useState('year'); // day, week, month, year, lifetime
  
  // Top items related state
  const [activeTab, setActiveTab] = useState('tracks'); // tracks, artists, albums, genres
  const [topTimeRange, setTopTimeRange] = useState('medium_term'); // short_term (4 weeks), medium_term (6 months), long_term (lifetime)
  const [isGridView, setIsGridView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [topGenres, setTopGenres] = useState([]);
  
  // Stats data (using the same mock data as before)
  const [stats, setStats] = useState({
    streams: 7573,
    differentTracks: 1659,
    minutesStreamed: 26781,
    differentArtists: 1171,
    hoursStreamed: 446,
    differentAlbums: 1056,
    daysStreamed: 18,
    changes: {
      streams: -45,
      differentTracks: 1,
      minutesStreamed: -43,
      differentArtists: -10,
      hoursStreamed: -43,
      differentAlbums: -10,
      daysStreamed: -44
    },
    dailyStats: {
      streams: 50,
      minutes: 231
    }
  });

  useEffect(() => {
    if (currentView === 'stats') {
      fetchStats(statsTimeRange);
    } else {
      fetchTopItems(topTimeRange);
    }
  }, [currentView, statsTimeRange, topTimeRange, activeTab]);

  // Fetch stats data (same as before)
  const fetchStats = async (period) => {
    // Same implementation as before
    setLoading(true);
    
    try {
      // Check if we have a valid token
      const token = await getValidToken();
      if (!token) {
        console.error('No valid token available');
        setLoading(false);
        return;
      }
      
      // Simulate different stats for different time periods
      setTimeout(() => {
        let newStats = { ...stats };
        
        switch(period) {
          case 'day':
            newStats = {
              ...newStats,
              streams: 120,
              differentTracks: 42,
              minutesStreamed: 420,
              differentArtists: 28,
              hoursStreamed: 7,
              differentAlbums: 35,
              daysStreamed: 1,
            };
            break;
          case 'week':
            newStats = {
              ...newStats,
              streams: 845,
              differentTracks: 210,
              minutesStreamed: 3200,
              differentArtists: 150,
              hoursStreamed: 53,
              differentAlbums: 180,
              daysStreamed: 7,
            };
            break;
          case 'month':
            newStats = {
              ...newStats,
              streams: 3210,
              differentTracks: 680,
              minutesStreamed: 11400,
              differentArtists: 415,
              hoursStreamed: 190,
              differentAlbums: 520,
              daysStreamed: 15,
            };
            break;
          // Year and lifetime would use the default values
        }
        
        setStats(newStats);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };
  
  // Fetch top items data
  const fetchTopItems = async (timeRange) => {
    setLoading(true);
    
    try {
      const token = await getValidToken();
      if (!token) {
        console.error('No valid token available');
        setLoading(false);
        return;
      }
      
      if (activeTab === 'tracks' || activeTab === 'all') {
        const tracks = await getTopTracks(timeRange, 50);
        if (tracks && tracks.items) {
          // Add mock stream and duration data since Spotify API doesn't provide this
          const tracksWithStats = tracks.items.map((track, index) => ({
            ...track,
            rank: index + 1,
            streams: Math.floor(Math.random() * 300) + 200 - (index * 10),
            minutes: Math.floor(Math.random() * 1000) + 500 - (index * 20)
          }));
          setTopTracks(tracksWithStats);
        }
      }
      
      if (activeTab === 'artists' || activeTab === 'all') {
        const artists = await getTopArtists(timeRange, 50);
        if (artists && artists.items) {
          setTopArtists(artists.items);
        }
      }
      
      if (activeTab === 'albums' || activeTab === 'all') {
        // The Spotify API doesn't have a direct endpoint for top albums
        // We'll extract album data from top tracks as a workaround
        const tracks = await getTopTracks(timeRange, 50);
        if (tracks && tracks.items) {
          const albums = {};
          tracks.items.forEach(track => {
            const albumId = track.album.id;
            if (!albums[albumId]) {
              albums[albumId] = {
                ...track.album,
                tracks: [track],
                streams: Math.floor(Math.random() * 200) + 100,
                minutes: Math.floor(Math.random() * 800) + 300
              };
            } else {
              albums[albumId].tracks.push(track);
              albums[albumId].streams += Math.floor(Math.random() * 50);
              albums[albumId].minutes += Math.floor(Math.random() * 100);
            }
          });
          const albumsList = Object.values(albums).map((album, index) => ({
            ...album,
            rank: index + 1
          }));
          setTopAlbums(albumsList);
        }
      }
      
      if (activeTab === 'genres' || activeTab === 'all') {
        // Extract genres from top artists
        const artists = await getTopArtists(timeRange, 50);
        if (artists && artists.items) {
          const genreCount = {};
          artists.items.forEach(artist => {
            artist.genres.forEach(genre => {
              if (!genreCount[genre]) {
                genreCount[genre] = {
                  name: genre,
                  count: 1,
                  artists: [artist],
                  streams: Math.floor(Math.random() * 200) + 100,
                  minutes: Math.floor(Math.random() * 800) + 300
                };
              } else {
                genreCount[genre].count += 1;
                genreCount[genre].artists.push(artist);
                genreCount[genre].streams += Math.floor(Math.random() * 50);
                genreCount[genre].minutes += Math.floor(Math.random() * 100);
              }
            });
          });
          
          const genresList = Object.values(genreCount)
            .sort((a, b) => b.count - a.count)
            .map((genre, index) => ({
              ...genre,
              rank: index + 1
            }))
            .slice(0, 20); // Limit to top 20 genres
          
          setTopGenres(genresList);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching top items:', error);
      setLoading(false);
    }
  };
  
  // Convert time ranges
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
  
  // Render a stat tile (from previous implementation)
  const renderStatTile = (value, change, label) => (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={[
        styles.statChange, 
        { color: change >= 0 ? Colors.primary : Colors.error }
      ]}>
        {change >= 0 ? '+' : ''}{change}%
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
  
  // Render track item in top tracks list
  const renderTrackItem = ({ item, index }) => (
    <View style={styles.trackItem}>
      <View style={styles.trackRank}>
        <Text style={styles.rankText}>{item.rank}.</Text>
      </View>
      <Image 
        source={{ uri: item.album.images[0]?.url }} 
        style={styles.trackImage} 
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artists.map(artist => artist.name).join(', ')}
        </Text>
        <View style={styles.trackStats}>
          <Text style={styles.trackStreams}>{item.streams} streams</Text>
          <Text style={styles.trackDot}>•</Text>
          <Text style={styles.trackMinutes}>{item.minutes} minutes</Text>
        </View>
      </View>
    </View>
  );
  
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
          {item.genres.slice(0, 2).join(', ')}
        </Text>
        <View style={styles.trackStats}>
          <Text style={styles.trackStreams}>{Math.floor(Math.random() * 300) + 200} streams</Text>
          <Text style={styles.trackDot}>•</Text>
          <Text style={styles.trackMinutes}>{Math.floor(Math.random() * 1000) + 500} minutes</Text>
        </View>
      </View>
    </View>
  );
  
  // Render album item in top albums list
  const renderAlbumItem = ({ item, index }) => (
    <View style={styles.trackItem}>
      <View style={styles.trackRank}>
        <Text style={styles.rankText}>{item.rank}.</Text>
      </View>
      <Image 
        source={{ uri: item.images[0]?.url }} 
        style={styles.trackImage} 
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artists.map(artist => artist.name).join(', ')}
        </Text>
        <View style={styles.trackStats}>
          <Text style={styles.trackStreams}>{item.streams} streams</Text>
          <Text style={styles.trackDot}>•</Text>
          <Text style={styles.trackMinutes}>{item.minutes} minutes</Text>
        </View>
      </View>
    </View>
  );
  
  // Render genre item in top genres list
  const renderGenreItem = ({ item, index }) => (
    <View style={styles.trackItem}>
      <View style={styles.trackRank}>
        <Text style={styles.rankText}>{item.rank}.</Text>
      </View>
      <View style={[styles.genreImage, { backgroundColor: `hsl(${index * 20}, 70%, 50%)` }]}>
        <Text style={styles.genreImageText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artists.slice(0, 2).map(artist => artist.name).join(', ')}
        </Text>
        <View style={styles.trackStats}>
          <Text style={styles.trackStreams}>{item.streams} streams</Text>
          <Text style={styles.trackDot}>•</Text>
          <Text style={styles.trackMinutes}>{item.minutes} minutes</Text>
        </View>
      </View>
    </View>
  );
  
  // Render the appropriate content based on current tab
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }
    
    if (currentView === 'stats') {
      return (
        <>
          <View style={styles.statsGrid}>
            {renderStatTile(stats.streams, stats.changes.streams, 'streams')}
            {renderStatTile(stats.differentTracks, stats.changes.differentTracks, 'different tracks')}
            {renderStatTile(stats.minutesStreamed, stats.changes.minutesStreamed, 'minutes streamed')}
            {renderStatTile(stats.differentArtists, stats.changes.differentArtists, 'different artists')}
            {renderStatTile(stats.hoursStreamed, stats.changes.hoursStreamed, 'hours streamed')}
            {renderStatTile(stats.differentAlbums, stats.changes.differentAlbums, 'different albums')}
            {renderStatTile(stats.daysStreamed, stats.changes.daysStreamed, 'days streamed')}
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Listening clocks</Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaText}>BETA</Text>
              </View>
            </View>
            
            <View style={styles.listeningClocks}>
              <CircularChart data={stats} type="streams" />
              <CircularChart data={stats} type="minutes streamed" />
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Streams and minutes streamed per day</Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaText}>BETA</Text>
              </View>
            </View>
            
            <View style={styles.dailyStatsContainer}>
              <View style={styles.yearNavigation}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.primary} />
                <Text style={styles.yearText}>2025</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.primary} />
              </View>
              
              <View style={styles.dailyStats}>
                <View style={styles.dailyStatItem}>
                  <Text style={styles.dailyStatValue}>{stats.dailyStats.streams}</Text>
                </View>
                <View style={styles.dailyStatItem}>
                  <Text style={styles.dailyStatValue}>{stats.dailyStats.minutes}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'day' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('day')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'day' && styles.activeTimeRangeText]}>day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'week' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('week')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'week' && styles.activeTimeRangeText]}>week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'month' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('month')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'month' && styles.activeTimeRangeText]}>month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'year' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('year')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'year' && styles.activeTimeRangeText]}>year</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'lifetime' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('lifetime')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'lifetime' && styles.activeTimeRangeText]}>lifetime</Text>
            </TouchableOpacity>
            <MaterialCommunityIcons name="chevron-up" size={24} color={Colors.secondary} />
          </View>
        </>
      );
    } else {
      // Top content view
      return (
        <>
          {/* Tabs for tracks, artists, albums, genres */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'tracks' && styles.activeTab]}
              onPress={() => setActiveTab('tracks')}
            >
              <Text style={[styles.tabText, activeTab === 'tracks' && styles.activeTabText]}>Tracks</Text>
              {activeTab === 'tracks' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'artists' && styles.activeTab]}
              onPress={() => setActiveTab('artists')}
            >
              <Text style={[styles.tabText, activeTab === 'artists' && styles.activeTabText]}>Artists</Text>
              {activeTab === 'artists' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'albums' && styles.activeTab]}
              onPress={() => setActiveTab('albums')}
            >
              <Text style={[styles.tabText, activeTab === 'albums' && styles.activeTabText]}>Albums</Text>
              {activeTab === 'albums' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'genres' && styles.activeTab]}
              onPress={() => setActiveTab('genres')}
            >
              <Text style={[styles.tabText, activeTab === 'genres' && styles.activeTabText]}>Genres</Text>
              {activeTab === 'genres' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>
          
          {/* Content based on active tab */}
          <View style={styles.topItemsContainer}>
            {activeTab === 'tracks' && (
              <FlatList
                data={topTracks}
                renderItem={renderTrackItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
            
            {activeTab === 'artists' && (
              <FlatList
                data={topArtists}
                renderItem={renderArtistItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
            
            {activeTab === 'albums' && (
              <FlatList
                data={topAlbums}
                renderItem={renderAlbumItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
            
            {activeTab === 'genres' && (
              <FlatList
                data={topGenres}
                renderItem={renderGenreItem}
                keyExtractor={(item) => item.name}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
          
          {/* Time range selector for top items */}
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity
              style={[styles.timeRangeButton, topTimeRange === 'short_term' && styles.activeTimeRange]}
              onPress={() => setTopTimeRange('short_term')}
            >
              <Text style={[styles.timeRangeText, topTimeRange === 'short_term' && styles.activeTimeRangeText]}>4 weeks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, topTimeRange === 'medium_term' && styles.activeTimeRange]}
              onPress={() => setTopTimeRange('medium_term')}
            >
              <Text style={[styles.timeRangeText, topTimeRange === 'medium_term' && styles.activeTimeRangeText]}>6 months</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, topTimeRange === 'long_term' && styles.activeTimeRange]}
              onPress={() => setTopTimeRange('long_term')}
            >
              <Text style={[styles.timeRangeText, topTimeRange === 'long_term' && styles.activeTimeRangeText]}>lifetime</Text>
            </TouchableOpacity>
            <MaterialCommunityIcons name="chevron-up" size={24} color={Colors.secondary} />
          </View>
        </>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {currentView === 'stats' ? (
            <>
              <Text style={styles.headerTitle}>Stats</Text>
              <TouchableOpacity onPress={() => setCurrentView('top')}>
                <MaterialCommunityIcons name="chart-bar" size={24} color={Colors.text} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => setCurrentView('stats')}>
                  <MaterialCommunityIcons name="menu" size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.topTitleContainer}>
                  <Text style={styles.topTitle}>Top</Text>
                  <Text style={styles.topSubtitle}>
                    past {convertDisplayTimeRange(topTimeRange)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
        
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContentContainer}
        >
          {renderContent()}
          <View style={{ height: 70 }} />
        </ScrollView>
        
        {currentView === 'stats' ? (
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'day' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('day')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'day' && styles.activeTimeRangeText]}>day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'week' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('week')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'week' && styles.activeTimeRangeText]}>week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'month' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('month')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'month' && styles.activeTimeRangeText]}>month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'year' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('year')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'year' && styles.activeTimeRangeText]}>year</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, statsTimeRange === 'lifetime' && styles.activeTimeRange]}
              onPress={() => setStatsTimeRange('lifetime')}
            >
              <Text style={[styles.timeRangeText, statsTimeRange === 'lifetime' && styles.activeTimeRangeText]}>lifetime</Text>
            </TouchableOpacity>
            <MaterialCommunityIcons name="chevron-up" size={24} color={Colors.secondary} />
          </View>
        ) : (
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity
              style={[styles.timeRangeButton, topTimeRange === 'short_term' && styles.activeTimeRange]}
              onPress={() => setTopTimeRange('short_term')}
            >
              <Text style={[styles.timeRangeText, topTimeRange === 'short_term' && styles.activeTimeRangeText]}>4 weeks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, topTimeRange === 'medium_term' && styles.activeTimeRange]}
              onPress={() => setTopTimeRange('medium_term')}
            >
              <Text style={[styles.timeRangeText, topTimeRange === 'medium_term' && styles.activeTimeRangeText]}>6 months</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, topTimeRange === 'long_term' && styles.activeTimeRange]}
              onPress={() => setTopTimeRange('long_term')}
            >
              <Text style={[styles.timeRangeText, topTimeRange === 'long_term' && styles.activeTimeRangeText]}>lifetime</Text>
            </TouchableOpacity>
            <MaterialCommunityIcons name="chevron-up" size={24} color={Colors.secondary} />
          </View>
        )}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  topTitleContainer: {
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  topSubtitle: {
    fontSize: 12,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  statTile: {
    width: '48%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statChange: {
    fontSize: 14,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  section: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  betaBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 10,
  },
  betaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
  },
  listeningClocks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  clockContainer: {
    alignItems: 'center',
    width: '48%',
  },
  clock: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  clockSegment: {
    position: 'absolute',
    width: 5,
    height: 40,
    borderRadius: 2,
    top: 8,
    left: '50%',
    marginLeft: -2.5,
    transformOrigin: 'bottom', // 确保这个属性正确设置
  },
  clockCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.cardBackground, // 使用已定义的颜色
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // 添加这个以便正确定位子元素
  },
  clockCenterText: {
    color: Colors.text,
    fontSize: 10,
    position: 'absolute', // 确保文本是绝对定位的
  },
  clockLabel: {
    color: Colors.text,
    marginTop: 10,
    fontSize: 14,
  },
  dailyStatsContainer: {
    marginBottom: 15,
  },
  yearNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  yearText: {
    color: Colors.text,
    fontSize: 16,
  },
  dailyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dailyStatItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 15,
    width: '48%',
    alignItems: 'center',
  },
  dailyStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.text,
    fontSize: 16,
  },
  activeTabText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '100%',
    backgroundColor: Colors.primary,
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
  genreImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreImageText: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
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
  trackStreams: {
    color: Colors.text,
    fontSize: 12,
  },
  trackDot: {
    color: Colors.text,
    fontSize: 12,
    marginHorizontal: 4,
  },
  trackMinutes: {
    color: Colors.text,
    fontSize: 12,
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
  activeTimeRange: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  timeRangeText: {
    color: Colors.text,
    fontSize: 14,
  },
  activeTimeRangeText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 70,
  },
});

export default StatsScreen;