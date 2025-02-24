import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Keyboard,
  BackHandler,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { dummyEmails } from '../constants/dummyData';
import { Searchbar } from 'react-native-paper';
import Fuse from 'fuse.js';
import { MotiView } from 'moti';
import * as Lucide from 'lucide-react-native';
import DrawerMenu from '../components/DrawerMenu';

const AnimatedFlatList = FlatList;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function MainEmailScreen({ navigation }) {
  const [selectedEmails, setSelectedEmails] = useState(() => new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastOffset = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewingEmailFromSearch, setViewingEmailFromSearch] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const buttonWidth = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [160, 56], // Full width to circle
    extrapolate: 'clamp',
  });

  const textWidth = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [100, 0],
    extrapolate: 'clamp',
  });

  // Enhanced Fuse.js configuration for deeper searching
  const fuseOptions = {
    keys: [
      // Primary search fields
      { name: 'subject', weight: 0.35 },
      { name: 'from', weight: 0.25 },
      { name: 'preview', weight: 0.15 },
      
      // Deep search fields
      { name: 'body', weight: 0.1 },
      { name: 'sender.email', weight: 0.1 },
      { name: 'sender.name', weight: 0.05 },
      { name: 'recipients', weight: 0.025 },
      { name: 'cc', weight: 0.025 },
      { name: 'attachments.name', weight: 0.025 },
      
      // Additional metadata
      { name: 'labels', weight: 0.025 },
      { name: 'timestamp', weight: 0.025 }
    ],
    threshold: 0.4, // Increased threshold for broader matches
    distance: 100, // Increased distance for better fuzzy matching
    includeScore: true,
    includeMatches: true, // Include match information
    minMatchCharLength: 2,
    shouldSort: true,
    findAllMatches: true,
    location: 0,
    ignoreLocation: true, // Ignore location for better partial matches
    useExtendedSearch: true
  };

  const fuse = new Fuse(dummyEmails, fuseOptions);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsSearching(!!query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Enhanced search logic
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      // Perform the search with multiple terms support
      let results = fuse.search(query)
        .filter(result => {
          // Check if all search terms are found somewhere in the email
          return searchTerms.every(term => {
            const email = result.item;
            const searchableContent = [
              email.subject,
              email.from,
              email.preview,
              email.body,
              email.sender?.email,
              email.sender?.name,
              ...(email.recipients || []),
              ...(email.cc || []),
              ...(email.attachments?.map(a => a.name) || []),
              ...(email.labels || []),
              email.timestamp
            ].join(' ').toLowerCase();
            
            return searchableContent.includes(term);
          });
        })
        .map(result => ({
          ...result.item,
          searchScore: result.score,
          matches: result.matches
        }))
        .sort((a, b) => {
          // Custom sorting based on multiple factors
          if (a.searchScore !== b.searchScore) {
            return a.searchScore - b.searchScore; // Lower score is better
          }
          
          // Secondary sort by date if scores are equal
          return new Date(b.timestamp) - new Date(a.timestamp);
        })
        .slice(0, 20); // Increased limit for more results

      // Highlight matching terms in the results
      results = results.map(email => ({
        ...email,
        highlightedPreview: highlightSearchTerms(email.preview, searchTerms),
        highlightedSubject: highlightSearchTerms(email.subject, searchTerms)
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  // Helper function to highlight matching terms
  const highlightSearchTerms = (text, searchTerms) => {
    if (!text) return '';
    let highlightedText = text;
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '**$1**');
    });
    return highlightedText;
  };

  const toggleEmailSelection = (emailId) => {
    if (!emailId) return;
    const newSelected = new Set(selectedEmails);
    if (selectedEmails.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    setSelectMode(newSelected.size > 0);
  };

  const selectAll = () => {
    if (!dummyEmails?.length) return;
    if (selectedEmails.size === dummyEmails.length) {
      setSelectedEmails(new Set());
      setSelectMode(false);
    } else {
      setSelectedEmails(new Set(dummyEmails.map(email => email.id)));
      setSelectMode(true);
    }
  };

  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset - lastOffset.current;
    
    if (direction > 10 && isExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(false);
    } else if (direction < -10 && !isExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(true);
    }
    
    lastOffset.current = currentOffset;
  };

  const renderSelectionHeader = () => (
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={() => setSelectMode(false)} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#202124" />
      </TouchableOpacity>
      <Text style={styles.selectionCount}>{selectedEmails.size}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="download" size={22} color="#202124" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#202124" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="email-outline" size={22} color="#202124" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color="#202124" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleOutsidePress = () => {
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {isSearching ? (
        <TouchableOpacity 
          onPress={() => {
            Keyboard.dismiss();
            setIsSearching(false);
            setSearchQuery('');
            setSearchResults([]);
          }} 
          style={styles.menuButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#5f6368" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          onPress={toggleDrawer} 
          style={styles.menuButton}
        >
          <MaterialCommunityIcons name="menu" size={24} color="#5f6368" />
        </TouchableOpacity>
      )}
      <Searchbar
        placeholder="Search in mail"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#5f6368"
        placeholderTextColor="#5f6368"
        elevation={0}
        onFocus={() => setIsSearching(true)}
        right={props => (
          isSearching && searchQuery ? (
            <TouchableOpacity
              {...props}
              onPress={() => {
                Keyboard.dismiss();
                setSearchQuery('');
                setSearchResults([]);
              }}
              style={[props.style, { marginRight: 8 }]}
            >
              <MaterialCommunityIcons name="close" size={24} color="#5f6368" />
            </TouchableOpacity>
          ) : null
        )}
      />
      {!isSearching && (
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>Y</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const getAvatarBackground = (sender) => {
    const colors = {
      'The Forage Team': '#4285f4',
      'Google Play': '#00C4B4',
      'British Airways': '#738ADB',
      'BCG': '#DB4437',
      'Forage': '#0F9D58'
    };
    return colors[sender] || '#9E9E9E';
  };

  const renderEmailItem = ({ item }) => (
    <Pressable 
      style={[styles.emailItem, selectedEmails.has(item.id) && styles.selectedEmailItem]}
      onPress={() => {
        if (selectMode) {
          toggleEmailSelection(item.id);
        } else {
          setViewingEmailFromSearch(isSearching);
          navigation.navigate('EmailDetail', {
            email: item,
            animation: 'slide',
          });
        }
      }}
      onLongPress={() => toggleEmailSelection(item.id)}
      android_ripple={{ color: '#e8eaed' }}
    >
      <View style={styles.avatarContainer}>
        {selectMode ? (
          <View style={[styles.checkbox, selectedEmails.has(item.id) && styles.checkedCheckbox]}>
            {selectedEmails.has(item.id) && (
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
            )}
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            <Text style={styles.avatarText}>{item.avatar}</Text>
          </View>
        )}
      </View>
      <View style={styles.emailContent}>
        <Text style={styles.senderName} numberOfLines={1}>
          {isSearching ? highlightSearchTerms(item.from, searchQuery.split(' ')) : item.from}
        </Text>
        <Text style={styles.subjectText} numberOfLines={1}>
          {isSearching ? item.highlightedSubject : item.subject}
        </Text>
        <Text style={styles.previewText} numberOfLines={1}>
          {isSearching ? item.highlightedPreview : item.preview}
        </Text>
      </View>
      <Text style={styles.dateText}>{item.timestamp}</Text>
    </Pressable>
  );

  // Add this useEffect hook to handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSearching) {
        Keyboard.dismiss();
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
        return true; // Prevents default back action
      } else if (viewingEmailFromSearch) {
        setViewingEmailFromSearch(false);
        setIsSearching(true);
        return true; // Prevents default back action
      }
      return false; // Lets the default back action happen
    });

    return () => backHandler.remove(); // Cleanup on unmount
  }, [isSearching, viewingEmailFromSearch]);

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove(); // Cleanup on unmount
  }, [isDrawerOpen]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {isDrawerOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={handleOutsidePress}
          activeOpacity={1}
        />
      )}
      <DrawerMenu 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
      />
      
      {selectMode ? renderSelectionHeader() : renderHeader()}
      {selectMode && (
        <TouchableOpacity style={styles.selectAllContainer} onPress={selectAll}>
          <View style={[
            styles.checkbox,
            selectedEmails.size === dummyEmails.length && styles.checkedCheckbox
          ]}>
            {selectedEmails.size === dummyEmails.length && (
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
            )}
          </View>
          <Text style={styles.selectAllText}>Select all</Text>
        </TouchableOpacity>
      )}
      <View style={styles.divider} />
      {!isSearching && <Text style={styles.primaryText}>Primary</Text>}
      {isSearching && searchQuery && searchResults.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <MaterialCommunityIcons name="email-search-outline" size={48} color="#5f6368" />
          <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
        </View>
      ) : (
        <AnimatedFlatList
          data={isSearching ? searchResults : dummyEmails}
          renderItem={renderEmailItem}
          keyExtractor={(item) => item?.id?.toString()}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}
      {!selectMode && (
        <Animated.View
          style={[
            styles.composeButton,
            {
              width: buttonWidth,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('Compose')}
            style={styles.composeContent}
          >
            <MaterialCommunityIcons name="pencil" size={24} color="#202124" />
            <Animated.View
              style={{
                width: textWidth,
                overflow: 'hidden',
              }}
            >
              <Text style={styles.composeText}>Write with AI</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 12,
  },
  selectionCount: {
    fontSize: 18,
    color: '#202124',
    marginLeft: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 12,
  },
  searchBar: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#f1f3f4',
    borderRadius: 24,
    height: 48,
    elevation: 0,
  },
  searchInput: {
    fontSize: 16,
    fontFamily: 'Roboto',
    color: '#202124',
  },
  profileButton: {
    padding: 8,
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#673AB7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#5f6368',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  selectAllText: {
    fontSize: 16,
    color: '#202124',
    fontFamily: 'Roboto',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eaed',
  },
  primaryText: {
    fontSize: 14,
    color: '#202124',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Roboto',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  selectedEmailItem: {
    backgroundColor: '#f2f8ff',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  emailContent: {
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 14,
    color: '#202124',
    fontWeight: '500',
    fontFamily: 'Roboto',
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#5f6368',
    fontFamily: 'Roboto',
  },
  subjectText: {
    fontSize: 14,
    color: '#202124',
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  previewText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  composeButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#c2e7ff',
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  composeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  composeText: {
    fontSize: 15,
    color: '#202124',
    fontWeight: '500',
    marginLeft: 12,
  },
  menuButton: {
    padding: 12,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  noResultsText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5f6368',
    fontFamily: 'Roboto',
  },
  highlightedText: {
    backgroundColor: '#fff9c4',
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
});