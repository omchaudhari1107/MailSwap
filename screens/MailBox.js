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

// Add this token management logic
let tokenPromise = null;

const getGoogleToken = async () => {
  if (!tokenPromise) {
    tokenPromise = GoogleSignin.getTokens()
      .finally(() => {
        tokenPromise = null;
      });
  }
  return tokenPromise;
};

// Helper function to decode base64 data
const decodeBase64 = (base64String) => {
  try {
    const decoded = atob(base64String.replace(/-/g, '+').replace(/_/g, '/'));
    return decoded;
  } catch (error) {
    console.error('Error decoding base64:', error);
    return '';
  }
};

// Helper function to extract HTML content from email payload
const getEmailBody = (payload) => {
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
      // Recursively check nested parts
      if (part.parts) {
        const nestedBody = getEmailBody(part);
        if (nestedBody) return nestedBody;
      }
    }
  }

  return ''; // Fallback if no HTML content is found
};

// Add this constant for letter-based avatar colors
const LETTER_COLORS = {
  'A': '#FF6B6B', // Coral Red
  'B': '#4ECDC4', // Turquoise
  'C': '#45B7D1', // Sky Blue
  'D': '#96CEB4', // Sage Green
  'E': '#FFEEAD', // Soft Yellow
  'F': '#D4A5A5', // Dusty Rose
  'G': '#FFD93D', // Bright Yellow
  'H': '#6C5B7B', // Purple
  'I': '#FF8C42', // Orange
  'J': '#2AB7CA', // Cyan
  'K': '#FE4A49', // Red
  'L': '#A3DE83', // Light Green
  'M': '#851E3E', // Burgundy
  'N': '#4A90E2', // Blue
  'O': '#F7A072', // Peach
  'P': '#B5838D', // Mauve
  'Q': '#E6B89C', // Tan
  'R': '#9B5DE5', // Purple
  'S': '#00BBF9', // Sky Blue
  'T': '#00F5D4', // Turquoise
  'U': '#FEE440', // Yellow
  'V': '#9B89B3', // Lavender
  'W': '#98C1D9', // Light Blue
  'X': '#E56B6F', // Salmon
  'Y': '#8860D0', // Purple
  'Z': '#5AB9EA', // Blue
};

// Add this constant at the top of the file for company-specific styling
const COMPANY_STYLES = {
  'google.com': {
    backgroundColor: '#fef7e0',
    avatar: 'https://www.google.com/favicon.ico'
  },
  'gmail.com': {
    backgroundColor: '#fef7e0',
    avatar: 'https://www.gmail.com/favicon.ico'
  },
  'netflix.com': {
    backgroundColor: '#e50914',
    avatar: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico'
  },
  'amazon.com': {
    backgroundColor: '#ff9900',
    avatar: 'https://www.amazon.com/favicon.ico'
  },
  'paypal.com': {
    backgroundColor: '#003087',
    avatar: 'https://www.paypal.com/favicon.ico'
  },
  'apple.com': {
    backgroundColor: '#000000',
    avatar: 'https://www.apple.com/favicon.ico'
  },
  'microsoft.com': {
    backgroundColor: '#00a4ef',
    avatar: 'https://www.microsoft.com/favicon.ico'
  },
  'facebook.com': {
    backgroundColor: '#1877f2',
    avatar: 'https://www.facebook.com/favicon.ico'
  },
  'twitter.com': {
    backgroundColor: '#1da1f2',
    avatar: 'https://www.twitter.com/favicon.ico'
  },
  'linkedin.com': {
    backgroundColor: '#0a66c2',
    avatar: 'https://www.linkedin.com/favicon.ico'
  }
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  const fetchGoogleProfile = async (emailAddress) => {
    try {
      const tokens = await getGoogleToken();
      const response = await fetch(
        `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(emailAddress)}&readMask=photos`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const photo = data.results[0].person?.photos?.[0]?.url;
        return photo || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching Google profile:', error);
      return null;
    }
  };

  const fetchEmails = useCallback(async () => {
    try {
      const tokens = await getGoogleToken();
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
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );
        const emailData = await detailResponse.json();
        const fromHeader = emailData.payload.headers.find(h => h.name === 'From')?.value || 'Unknown';
        const senderEmail = fromHeader.match(/<(.+?)>/)?.[1] || fromHeader;

        // Fetch Google profile avatar
        const avatar = await fetchGoogleProfile(senderEmail);

        // Extract HTML body
        const htmlBody = getEmailBody(emailData.payload);

        return {
          id: emailData.id,
          sender: fromHeader,
          senderName: fromHeader.match(/^([^<]+)/)?.pop()?.trim() || fromHeader.split('@')[0],
          from: senderEmail,
          subject: emailData.payload.headers.find(h => h.name === 'Subject')?.value || '(no subject)',
          preview: emailData.snippet || '',
          body: htmlBody, // Add HTML body
          time: new Date(parseInt(emailData.internalDate)).toLocaleTimeString(),
          isStarred: emailData.labelIds?.includes('STARRED') || false,
          isRead: !emailData.labelIds?.includes('UNREAD'),
        };
      });

      const formattedEmails = await Promise.all(emailPromises);
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

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '798624486063-vm81209jpdbncait5o4nis8ifup2cjmq.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

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
              email.body || '',
              email.time || '',
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

  // Move the updateEmailReadStatus function inside MailBox component
  const updateEmailReadStatus = async (emailId, markAsRead = true) => {
    try {
      const { accessToken } = await getGoogleToken();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            removeLabelIds: markAsRead ? ['UNREAD'] : [],
            addLabelIds: markAsRead ? [] : ['UNREAD'],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error?.message || 'Failed to update email status');
      }

      // Now setEmails is accessible
      setEmails(currentEmails =>
        currentEmails.map(email =>
          email.id === emailId
            ? { ...email, isRead: markAsRead }
            : email
        )
      );

      return true;
    } catch (error) {
      console.error('Error updating email read status:', error);
      if (error.message.includes('401') || error.message.includes('invalid_token')) {
        try {
          await GoogleSignin.signInSilently();
          return updateEmailReadStatus(emailId, markAsRead);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
        }
      }
      return false;
    }
  };

  // Pass updateEmailReadStatus to EmailItem through props
  const renderEmailItem = ({ item }) => {
    const getAvatarAndColor = () => {
      // Get the sender email and ensure it's a string
      const senderEmail = String(item.from || item.sender || '');
      const senderName = item.senderName || '';
      
      // Extract domain for company check
      const domain = senderEmail.split('@')[1];
      
      // Check for company first
      if (domain) {
        const domainBase = domain.split('.').slice(-2).join('.');
        const companyStyle = COMPANY_STYLES[domainBase];
        if (companyStyle) {
          return {
            avatarSource: companyStyle.avatar,
            backgroundColor: companyStyle.backgroundColor,
            isLetter: false
          };
        }
      }

      // Get first word of sender's name and use its first letter
      const firstWord = senderName.split(' ')[0];
      const firstLetter = firstWord ? firstWord.charAt(0).toUpperCase() : '';

      // If we have a valid letter, use it
      if (firstLetter && firstLetter.match(/[A-Z]/)) {
        return {
          avatarSource: firstLetter,
          backgroundColor: LETTER_COLORS[firstLetter],
          isLetter: true
        };
      }

      // Fallback case
      return {
        avatarSource: 'https://cdn-icons-png.flaticon.com/512/36/36183.png',
        backgroundColor: '#e8eaed',
        isLetter: false
      };
    };

    const { avatarSource, backgroundColor, isLetter } = getAvatarAndColor();

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

    const handlePress = async () => {
      if (!item.isRead) {
        const success = await updateEmailReadStatus(item.id, true);
        if (!success) {
          console.log('Failed to mark email as read');
        }
      }
      navigation.navigate('EmailDetail', {
        email: item,
        onDelete: handleDeleteEmail,
        onToggleStar: handleToggleStar,
        avatarInfo: getAvatarAndColor()
      });
    };

    return (
      <TouchableOpacity 
        style={[
          styles.emailItem,
          !item.isRead && styles.unreadEmail,
        ]}
        onPress={handlePress}
      >
        <View style={styles.emailLeftSection}>
          {!item.isRead && <View style={styles.unreadDot} />}
          <View style={[styles.senderIcon, { backgroundColor }]}>
            {isLetter ? (
              <Text style={styles.avatarLetter}>{avatarSource}</Text>
            ) : typeof avatarSource === 'string' && avatarSource.startsWith('http') ? (
              <Image 
                source={{ uri: avatarSource }} 
                style={styles.avatarImage}
                defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/36/36183.png' }}
              />
            ) : (
              <Ionicons name="person" size={24} color="white" />
            )}
          </View>
        </View>
        <View style={styles.emailContent}>
          <Text style={[styles.senderName, !item.isRead && styles.unreadText]} numberOfLines={1}>
            {highlightText(item.senderName || item.from, searchQuery)}
          </Text>
          <View style={styles.subjectContainer}>
            <Text style={[styles.subject, !item.isRead && styles.unreadText]} numberOfLines={1}>
              {highlightText(item.subject, searchQuery)}
            </Text>
            <Text style={styles.preview} numberOfLines={1}>
              · {highlightText(item.preview, searchQuery)}
            </Text>
          </View>
        </View>
        <View style={styles.emailRight}>
          <Text style={[styles.time, !item.isRead && styles.unreadText]}>{item.time}</Text>
          {item.isStarred && (
            <Ionicons name="star" size={20} color="#f4b400" style={styles.starIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
                renderItem={renderEmailItem}
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
          renderItem={renderEmailItem}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0,
    elevation: 0,
    zIndex: 1001,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 28,
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 0,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '400',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: '#ffffff',
  },
  unreadEmail: {
    backgroundColor: '#f8fafd', // Lighter blue tint for unread emails
  },
  emailLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a73e8',
    marginRight: 8,
  },
  senderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 15,
    marginBottom: 4,
    color: '#1f2937',
  },
  unreadText: {
    color: '#202124',
    fontWeight: '600', // Make unread text slightly bolder
  },
  subject: {
    fontSize: 14,
    color: '#4b5563',
  },
  preview: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  time: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#2563eb',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  selectedCategoryChip: {
    backgroundColor: '#e0e7ff',
  },
  starIcon: {
    marginTop: 4,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  selectedCategoryChip: {
    backgroundColor: '#e0e7ff',
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
  avatarLetter: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'cover'
  }
});

export default MailBox;