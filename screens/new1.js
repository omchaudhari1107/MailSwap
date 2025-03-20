// this is code without any recommended addWhitelistedNativeProps 

import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, StatusBar, Platform, Image, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Fuse from 'fuse.js';

const EmailItem = ({ email, onPress }) => {
  let avatarSource = email.avatar;
  if (email.avatar === "'" || email.avatar === '"') {
    avatarSource = "https://media.istockphoto.com/id/1345388323/vector/human-silhouette-isolated-vector-icon.jpg?s=612x612&w=0&k=20&c=a1wg9LYywdqDUGt9rifrf16XEdWZbWe7ajuYxJTxEI=";
  }

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
          {email.sender}
        </Text>
        <View style={styles.subjectContainer}>
          <Text style={[styles.subject, !email.isRead && styles.unreadText]} numberOfLines={1}>
            {email.subject}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            - {email.preview}
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
  const { emails: initialEmails } = route.params || {};
  const [emails, setEmails] = useState(initialEmails || []);

  // Fuse.js configuration with deep search fields
  const fuseOptions = {
    keys: [
      // Primary search fields
      { name: 'subject', weight: 0.35 },
      { name: 'from', weight: 0.25 },  // Changed 'sender' to 'from' to match new config
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
      { name: 'timestamp', weight: 0.025 },
      
      // Previous field for backward compatibility
      { name: 'time', weight: 0.05 },
    ],
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

  // Create Fuse instance with memoization
  const fuse = useMemo(() => new Fuse(emails, fuseOptions), [emails]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsSearching(!!query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      let results = fuse.search(query)
        .filter(result => {
          return searchTerms.every(term => {
            const email = result.item;
            const searchableContent = [
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
    }
  };

  // Handle hardware back press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSearching || searchQuery.length > 0) {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isSearching, searchQuery]);

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

  const displayedEmails = isSearching ? searchResults : emails;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#5f6368" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in mail"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#5f6368"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setIsSearching(false);
            }}>
              <Ionicons name="close-circle" size={20} color="#5f6368" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {displayedEmails.length > 0 ? (
        <FlatList
          data={displayedEmails}
          renderItem={({ item }) => (
            <EmailItem
              email={item}
              onPress={() => navigation.navigate('EmailDetail', {
                email: item,
                onDelete: handleDeleteEmail,
                onToggleStar: handleToggleStar,
              })}
            />
          )}
          keyExtractor={item => item.id}
        />
      ) : (
        <View style={styles.noEmailsContainer}>
          <Text style={styles.noEmailsText}>
            {isSearching ? 'No search results' : 'No emails to display'}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="sparkles" size={24} color="white" style={styles.aiIcon} />
        <Text style={styles.fabText}>Compose with AI</Text>
      </TouchableOpacity>
    </View>
  );
};

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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
});

export default MailBox;