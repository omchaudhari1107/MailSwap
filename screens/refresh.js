import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  StatusBar, 
  Platform, 
  Image, 
  BackHandler, 
  ActivityIndicator, 
  Keyboard,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Fuse from 'fuse.js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const EmailItem = ({ email, onPress, searchQuery }) => {
  let avatarSource = email.avatar;
  if (email.avatar === "'" || email.avatar === '"') {
    avatarSource = "https://media.istockphoto.com/id/1345388323/vector/human-silhouette-isolated-vector-icon.jpg?s=612x612&w=0&k=20&c=a1wg9LYywdqDUGt9rifrf16XEdWZbWe7ajuYxJTxEI=";
  }

  const highlightText = (text, query) => {
    if (!query || !text) return <Text>{text}</Text>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <Text>
        {parts.map((part, index) => (
          part.toLowerCase() === query.toLowerCase() ? 
            <Text key={index} style={styles.highlightedText}>{part}</Text> : 
            part
        ))}
      </Text>
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.emailItem, !email.isRead && styles.unreadEmail]}
      onPress={onPress}
    >
      <View style={[styles.senderIcon, { backgroundColor: email.color }]}>
        {(typeof avatarSource === 'string') && avatarSource.startsWith('http') ? (
          <Image 
            source={{ uri: avatarSource }} 
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
        ) : (
          <Text style={styles.senderInitial}>{avatarSource}</Text>
        )}
      </View>
      <View style={styles.emailContent}>
        <Text style={[styles.senderName, !email.isRead && styles.unreadText]} numberOfLines={1}>
          {highlightText(email.from || email.sender, searchQuery)}
        </Text>
        <View style={styles.subjectContainer}>
          <Text style={[styles.subject, !email.isRead && styles.unreadText]} numberOfLines={1}>
            {highlightText(email.subject, searchQuery)}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            - {highlightText(email.preview, searchQuery)}
          </Text>
        </View>
      </View>
      <View style={styles.emailRight}>
        <Text style={styles.time}>{email.time}</Text>
        {email.isStarred && (
          <Ionicons name="star" size={20} color="#f4b400" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const MailBox = ({ route, navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { emails: initialEmails } = route.params || {};
  const [emails, setEmails] = useState(initialEmails || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // New state for initial loading

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  const searchCategories = [
    { key: 'all', label: 'All', icon: 'search' },
    { key: 'subject', label: 'Subject', icon: 'document-text' },
    { key: 'from', label: 'From', icon: 'person' },
    { key: 'body', label: 'Content', icon: 'chatbox' },
    { key: 'attachments', label: 'Attachments', icon: 'attach' },
  ];

  const fuseOptions = {
    keys: selectedCategory === 'all' ? [
      { name: 'subject', weight: 0.35 },
      { name: 'from', weight: 0.25 },
      { name: 'preview', weight: 0.15 },
      { name: 'body', weight: 0.1 },
      { name: 'sender.email', weight: 0.1 },
      { name: 'sender.name', weight: 0.05 },
      { name: 'recipients', weight: 0.025 },
      { name: 'cc', weight: 0.025 },
      { name: 'attachments.name', weight: 0.025 },
      { name: 'labels', weight: 0.025 },
      { name: 'timestamp', weight: 0.025 },
      { name: 'time', weight: 0.05 },
    ] : [{ name: selectedCategory === 'from' ? 'from' : selectedCategory, weight: 1.0 }],
    threshold: 0.4,
    distance: 100,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    shouldSort: true,
    findAllMatches: true,
    ignoreLocation: true,
    useExtendedSearch: true
  };

  const fuse = useMemo(() => new Fuse(emails, fuseOptions), [emails, selectedCategory]);

  const fetchEmails = useCallback(async () => {
    try {
      const tokens = await GoogleSignin.getTokens();
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages',
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );
      const data = await response.json();
      
      const emailPromises = data.messages.map(async (message) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );
        return detailResponse.json();
      });

      const emailDetails = await Promise.all(emailPromises);
      const formattedEmails = emailDetails.map((email) => ({
        id: email.id,
        sender: email.payload.headers.find(h => h.name === 'From')?.value || 'Unknown',
        subject: email.payload.headers.find(h => h.name === 'Subject')?.value || '(no subject)',
        preview: email.snippet || '',
        time: new Date(parseInt(email.internalDate)).toLocaleTimeString(),
        isStarred: email.labelIds?.includes('STARRED') || false,
        isRead: !email.labelIds?.includes('UNREAD'),
        avatar: email.payload.headers.find(h => h.name === 'From')?.value.charAt(0) || '?',
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      }));
      
      setEmails(formattedEmails);
      return formattedEmails;
    } catch (error) {
      console.error('Error fetching emails:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    const loadEmails = async () => {
      setIsInitialLoading(true);
      await fetchEmails();
      setIsInitialLoading(false);
    };
    loadEmails();
  }, [fetchEmails]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchEmails();
    setIsRefreshing(false);
  }, [fetchEmails]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsSearching(!!query);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    debouncedSearch(query);
  };

  const performSearch = (query) => {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      let results = fuse.search(query)
        .filter(result => {
          return searchTerms.every(term => {
            const email = result.item;
            const searchableContent = selectedCategory === 'all' ? [
              email.subject || '',
              email.from || email.sender || '',
              email.preview || '',
              email.time || '',
              email.body || '',
              email.sender?.email || '',
              email.sender?.name || '',
              email.recipients?.join(' ') || '',
              email.cc?.join(' ') || '',
              email.attachments?.map(att => att.name).join(' ') || '',
              email.labels?.join(' ') || '',
              email.timestamp || ''
            ].join(' ') : (email[selectedCategory] || email.from || '').toString();
            return searchableContent.toLowerCase().includes(term);
          });
        })
        .map(result => ({
          ...result.item,
          searchScore: result.score,
          matches: result.matches
        }))
        .sort((a, b) => {
          if (a.searchScore !== b.searchScore) {
            return a.searchScore - b.searchScore;
          }
          return 0;
        })
        .slice(0, 20);

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const debouncedSearch = useMemo(() => debounce(performSearch, 300), [selectedCategory]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches(prev => [searchQuery, ...prev.slice(0, 10)]);
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSearchFocused || isSearching || searchQuery.length > 0) {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
        setIsSearchFocused(false);
        Keyboard.dismiss();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isSearchFocused, isSearching, searchQuery]);

  const handleDeleteEmail = (emailId) => {
    setEmails(currentEmails => 
      currentEmails.filter(email => email.id !== emailId)
    );
  };

  const handleToggleStar = (emailId) => {
    setEmails(currentEmails =>
      currentEmails.map(email =>
        email.id === emailId
          ? { ...email, isStarred: !email.isStarred }
          : email
      )
    );
  };

  const clearRecentSearch = (searchToRemove) => {
    setRecentSearches(prev => prev.filter(search => search !== searchToRemove));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
  };

  const displayedEmails = isSearching ? searchResults : emails;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isSearchFocused ? '#f1f3f4' : '#fff'} barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#5f6368" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in mail"
            value={searchQuery}
            onChangeText={handleSearch}
            onSubmitEditing={handleSearchSubmit}
            onFocus={() => setIsSearchFocused(true)}
            placeholderTextColor="#5f6368"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {(searchQuery.length > 0 || isSearchFocused) && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setIsSearching(false);
              setIsSearchFocused(false);
              Keyboard.dismiss();
            }}>
              <Ionicons name="close-circle" size={20} color="#5f6368" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {isSearchFocused && (
        <View style={styles.searchOverlay}>
          <View style={styles.categoryContainer}>
            {searchCategories.map(category => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.key && styles.selectedCategoryChip
                ]}
                onPress={() => {
                  setSelectedCategory(category.key);
                  if (searchQuery) handleSearch(searchQuery);
                }}
              >
                <Ionicons name={category.icon} size={16} color={selectedCategory === category.key ? '#1a73e8' : '#5f6368'} />
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category.key && styles.selectedCategoryChipText
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!searchQuery && recentSearches.length > 0 && (
            <View style={styles.recentSearchesContainer}>
              <View style={styles.recentSearchesHeader}>
                <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearAllRecentSearches}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((search, index) => (
                <View key={index} style={styles.recentSearchItem}>
                  <TouchableOpacity
                    style={styles.recentSearchContent}
                    onPress={() => {
                      setSearchQuery(search);
                      handleSearch(search);
                    }}
                  >
                    <Ionicons name="time-outline" size={16} color="#5f6368" />
                    <Text style={styles.recentSearchText}>{search}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#5f6368" style={styles.recentSearchArrow} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => clearRecentSearch(search)}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close" size={16} color="#5f6368" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {isSearching && !isSearchLoading && (
            displayedEmails.length > 0 ? (
              <FlatList
                data={displayedEmails}
                renderItem={({ item }) => (
                  <EmailItem
                    email={item}
                    searchQuery={searchQuery}
                    onPress={() => {
                      setIsSearchFocused(false);
                      navigation.navigate('EmailDetail', {
                        email: item,
                        onDelete: handleDeleteEmail,
                        onToggleStar: handleToggleStar,
                      });
                    }}
                  />
                )}
                keyExtractor={item => item.id}
                style={styles.searchResultsList}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#5f6368" />
                <Text style={styles.noResultsText}>
                  No results found for "{searchQuery}"
                </Text>
              </View>
            )
          )}
        </View>
      )}

      {(isSearchLoading || isInitialLoading) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a73e8" />
        </View>
      )}

      {!isSearchFocused && !isInitialLoading && (
        <FlatList
          data={displayedEmails}
          renderItem={({ item }) => (
            <EmailItem
              email={item}
              searchQuery={searchQuery}
              onPress={() => navigation.navigate('EmailDetail', {
                email: item,
                onDelete: handleDeleteEmail,
                onToggleStar: handleToggleStar,
              })}
            />
          )}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            !isSearchLoading && (
              <View style={styles.noEmailsContainer}>
                <Text style={styles.noEmailsText}>No emails to display</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#1a73e8']}
              tintColor="#1a73e8"
            />
          }
        />
      )}

      {!isSearchFocused && !isInitialLoading && (
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="sparkles" size={24} color="white" style={styles.aiIcon} />
          <Text style={styles.fabText}>Compose with AI</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    backgroundColor: '#fff',
    elevation: 2,
    zIndex: 1001,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 24,
    marginHorizontal: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#202124',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  senderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  senderInitial: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emailContent: {
    flex: 1,
    marginRight: 16,
  },
  senderName: {
    fontSize: 14,
    marginBottom: 4,
    color: '#202124',
  },
  subjectContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  subject: {
    fontSize: 14,
    color: '#5f6368',
  },
  preview: {
    fontSize: 14,
    color: '#5f6368',
    flex: 1,
  },
  emailRight: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: '#5f6368',
    marginBottom: 4,
  },
  unreadEmail: {
    backgroundColor: '#f2f6fc',
  },
  unreadText: {
    color: '#202124',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1a73e8',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  aiIcon: {
    marginRight: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  noEmailsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEmailsText: {
    fontSize: 16,
    color: '#5f6368',
  },
  highlightedText: {
    backgroundColor: '#fff3cd',
    color: '#202124',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
  },
  selectedCategoryChip: {
    backgroundColor: '#e8f0fe',
  },
  categoryChipText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#5f6368',
  },
  selectedCategoryChipText: {
    color: '#1a73e8',
    fontWeight: '500',
  },
  recentSearchesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 10,
    marginTop: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  recentSearchesTitle: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
  },
  clearAllText: {
    fontSize: 14,
    color: '#1a73e8',
    fontWeight: '500',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  recentSearchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentSearchText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#202124',
  },
  recentSearchArrow: {
    marginLeft: 8,
  },
  clearSearchButton: {
    padding: 4,
  },
  searchResultsList: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 10,
  },
  noResultsText: {
    fontSize: 16,
    color: '#5f6368',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default MailBox;