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
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Fuse from 'fuse.js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token management logic
let tokenPromise = null;

const getGoogleToken = async () => {
  if (!tokenPromise) {
    tokenPromise = GoogleSignin.getTokens().finally(() => {
      tokenPromise = null;
    });
  }
  return tokenPromise;
};

// Helper function to decode base64 data
const decodeBase64 = (base64String) => {
  try {
    const normalized = base64String.replace(/-/g, '+').replace(/_/g, '/');
    let padded = normalized;
    while (padded.length % 4) {
      padded += '=';
    }
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.error('Error decoding base64:', error);
    return '';
  }
};

// Helper function to extract HTML content from email payload
const getEmailBody = (payload) => {
  try {
    const getAttachmentInfo = (part) => {
      const filename =
        part.filename ||
        part.headers?.find((h) => h.name.toLowerCase() === 'content-disposition')?.value?.match(/filename="([^"]+)"/)?.[1] ||
        'unnamed-attachment';
      return {
        filename,
        mimeType: part.mimeType,
        attachmentId: part.body.attachmentId,
        size: part.body.size,
        data: part.body.data,
      };
    };

    if (payload.body?.data) {
      if (payload.mimeType.startsWith('image/')) {
        return `<img src="data:${payload.mimeType};base64,${payload.body.data}" style="max-width: 100%; height: auto;" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'openAttachment', mimeType: '${payload.mimeType}', data: '${payload.body.data}', filename: '${payload.filename || "image"}'}))"/>`;
      }
      return decodeBase64(payload.body.data);
    }

    switch (payload.mimeType) {
      case 'text/html':
      case 'text/plain':
        return payload.body?.data ? decodeBase64(payload.body.data) : '';
      case 'multipart/alternative':
      case 'multipart/mixed':
      case 'multipart/related':
      case 'multipart/report':
        if (!payload.parts) return '';
        let mainContent = '';
        let attachments = [];
        for (const part of payload.parts) {
          if (part.mimeType === 'text/html') {
            mainContent = getEmailBody(part);
            break;
          }
        }
        if (!mainContent) {
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain') {
              mainContent = getEmailBody(part);
              break;
            }
          }
        }
        for (const part of payload.parts) {
          if (
            part.filename ||
            part.mimeType.startsWith('application/') ||
            part.mimeType.startsWith('audio/') ||
            part.mimeType.startsWith('video/') ||
            part.mimeType.startsWith('image/')
          ) {
            attachments.push(getAttachmentInfo(part));
          }
        }
        if (attachments.length > 0) {
          mainContent += '<div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">';
          mainContent += '<h3>Attachments:</h3>';
          mainContent += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
          attachments.forEach((attachment) => {
            const icon = (() => {
              if (attachment.mimeType.startsWith('image/')) {
                return attachment.data
                  ? `<img src="data:${attachment.mimeType};base64,${attachment.data}" style="width: 100px; height: 100px; object-fit: cover;" />`
                  : '📷';
              }
              switch (true) {
                case /pdf/.test(attachment.mimeType): return '📄';
                case /word|docx?/.test(attachment.mimeType): return '📝';
                case /powerpoint|pptx?/.test(attachment.mimeType): return '📊';
                case /excel|xlsx?/.test(attachment.mimeType): return '📈';
                case /video/.test(attachment.mimeType): return '🎥';
                case /audio/.test(attachment.mimeType): return '🎵';
                case /zip|rar|7z/.test(attachment.mimeType): return '🗜️';
                default: return '📎';
              }
            })();
            const size = (() => {
              const bytes = attachment.size;
              if (bytes < 1024) return `${bytes} B`;
              if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
              return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            })();
            mainContent += `
              <div 
                style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; width: 150px; text-align: center; cursor: pointer;"
                onclick="window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'openAttachment',
                  mimeType: '${attachment.mimeType}',
                  attachmentId: '${attachment.attachmentId}',
                  filename: '${attachment.filename}',
                  data: '${attachment.data || ''}'
                }))"
              >
                <div style="font-size: 32px; margin-bottom: 5px;">${icon}</div>
                <div style="font-size: 12px; word-break: break-word;">${attachment.filename}</div>
                <div style="font-size: 10px; color: #666;">${size}</div>
              </div>
            `;
          });
          mainContent += '</div></div>';
        }
        return mainContent;
      case 'message/rfc822':
        return payload.parts ? getEmailBody(payload.parts[0]) : '';
      case 'application/pdf':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '[Document Attachment]';
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        return '[Image Attachment]';
      case 'video/mp4':
      case 'video/quicktime':
        return '[Video Attachment]';
      case 'audio/mpeg':
      case 'audio/wav':
        return '[Audio Attachment]';
      case 'text/calendar':
        return '[Calendar Invitation]';
      case 'text/enriched':
        return payload.body?.data
          ? decodeBase64(payload.body.data)
              .replace(/\n/g, '<br>')
              .replace(/<</g, '<')
              .replace(/>>/g, '>')
          : '';
      default:
        if (payload.parts) {
          for (const part of payload.parts) {
            const content = getEmailBody(part);
            if (content) return content;
          }
        }
        return `[${payload.mimeType} content]`;
    }
  } catch (error) {
    console.error('Error getting email body:', error, 'Payload:', payload);
    return '[Error: Could not decode email content]';
  }
};

// Constants for letter-based avatar colors
const LETTER_COLORS = {
  A: '#FF6B6B', B: '#4ECDC4', C: '#45B7D1', D: '#96CEB4', E: '#FFEEAD',
  F: '#D4A5A5', G: '#FFD93D', H: '#6C5B7B', I: '#FF8C42', J: '#2AB7CA',
  K: '#FE4A49', L: '#A3DE83', M: '#851E3E', N: '#4A90E2', O: '#F7A072',
  P: '#B5838D', Q: '#E6B89C', R: '#9B5DE5', S: '#00BBF9', T: '#00F5D4',
  U: '#FEE440', V: '#9B89B3', W: '#98C1D9', X: '#E56B6F', Y: '#8860D0',
  Z: '#5AB9EA',
};

// Constants for company-specific styling
const COMPANY_STYLES = {
  'google.com': { backgroundColor: '#fef7e0', avatar: 'https://www.google.com/favicon.ico' },
  'gmail.com': { backgroundColor: '#fef7e0', avatar: 'https://www.gmail.com/favicon.ico' },
  'netflix.com': { backgroundColor: '#e50914', avatar: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico' },
  'amazon.com': { backgroundColor: '#ff9900', avatar: 'https://www.amazon.com/favicon.ico' },
  'paypal.com': { backgroundColor: '#003087', avatar: 'https://www.paypal.com/favicon.ico' },
  'apple.com': { backgroundColor: '#000000', avatar: 'https://www.apple.com/favicon.ico' },
  'microsoft.com': { backgroundColor: '#00a4ef', avatar: 'https://www.microsoft.com/favicon.ico' },
  'facebook.com': { backgroundColor: '#1877f2', avatar: 'https://www.facebook.com/favicon.ico' },
  'twitter.com': { backgroundColor: '#1da1f2', avatar: 'https://www.twitter.com/favicon.ico' },
  'linkedin.com': { backgroundColor: '#0a66c2', avatar: 'https://www.linkedin.com/favicon.ico' },
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

  // Debounce function for search
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  // Search categories
  const searchCategories = [
    { key: 'all', label: 'All', icon: 'search' },
    { key: 'subject', label: 'Subject', icon: 'document-text' },
    { key: 'from', label: 'From', icon: 'person' },
    { key: 'body', label: 'Content', icon: 'chatbox' },
    { key: 'attachments', label: 'Attachments', icon: 'attach' },
  ];

  // Pre-process emails for search optimization
  const preprocessedEmails = useMemo(() => {
    return emails.map((email) => ({
      ...email,
      subject: email.subject || '',
      from: email.from || email.sender || '',
      preview: email.preview || '',
      body: email.body || '',
      time: email.time || '',
      sender: {
        email: email.from || '',
        name: email.senderName || '',
      },
      attachments: email.attachments || [],
      searchableContent: [
        email.subject || '',
        email.from || email.sender || '',
        email.preview || '',
        email.body || '',
        email.time || '',
        email.senderName || '',
        email.attachments?.map((att) => att.name).join(' ') || '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));
  }, [emails]);

  // Fuse.js configuration
  const fuseOptions = {
    keys: selectedCategory === 'all' ? [
      { name: 'subject', weight: 0.4 },
      { name: 'from', weight: 0.3 },
      { name: 'preview', weight: 0.2 },
      { name: 'body', weight: 0.1 },
      { name: 'sender.name', weight: 0.1 },
      { name: 'attachments.name', weight: 0.05 },
      { name: 'time', weight: 0.05 },
    ] : [{ name: selectedCategory === 'from' ? 'from' : selectedCategory, weight: 1.0 }],
    threshold: 0.3,
    distance: 200,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    shouldSort: true,
  };

  const fetchGoogleProfile = async (emailAddress) => {
    try {
      const tokens = await getGoogleToken();
      const response = await fetch(
        `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(emailAddress)}&readMask=photos`,
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].person?.photos?.[0]?.url || null;
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
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const data = await response.json();

      const emailPromises = data.messages.map(async (message) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
        );
        const emailData = await detailResponse.json();

        const getHeader = (name) => emailData.payload.headers.find((h) => h.name === name)?.value || '';
        const fromHeader = getHeader('From');
        const senderMatch = fromHeader.match(/^(.*?)\s*(?:<(.+?)>)?$/);
        const senderName = (senderMatch?.[1] || '').trim();
        const senderEmail = (senderMatch?.[2] || senderMatch?.[1] || '').trim();

        return {
          id: emailData.id,
          sender: fromHeader,
          senderName: senderName || senderEmail.split('@')[0],
          from: senderEmail,
          subject: getHeader('Subject'),
          preview: emailData.snippet || '',
          body: getEmailBody(emailData.payload),
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

  // Parse search query for advanced syntax
  const parseSearchQuery = (query) => {
    const terms = [];
    const excludeTerms = [];
    let fieldSpecific = null;

    const fieldMatch = query.match(/^(from|subject|body|attachments):(.+)/i);
    if (fieldMatch) {
      fieldSpecific = { field: fieldMatch[1].toLowerCase(), value: fieldMatch[2].trim() };
      return { terms, excludeTerms, fieldSpecific };
    }

    const parts = query.match(/"[^"]*"|[^\s"]+/g) || [];
    parts.forEach((part) => {
      part = part.replace(/^"|"$/g, '').trim();
      if (part.startsWith('-')) {
        excludeTerms.push(part.slice(1).toLowerCase());
      } else {
        terms.push(part.toLowerCase());
      }
    });

    return { terms, excludeTerms, fieldSpecific };
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsSearching(!!query.trim());

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
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearchLoading(false);
        return;
      }

      const { terms, excludeTerms, fieldSpecific } = parseSearchQuery(query);
      const fuse = new Fuse(preprocessedEmails, fuseOptions);
      let results = [];

      if (fieldSpecific) {
        results = fuse.search(fieldSpecific.value).map(result => ({
          ...result.item,
          searchScore: result.score,
          matches: result.matches,
        }));
      } else {
        const searchQuery = terms.join(' ');
        results = fuse.search(searchQuery).map(result => ({
          ...result.item,
          searchScore: result.score,
          matches: result.matches,
        }));
      }

      if (excludeTerms.length > 0) {
        results = results.filter((result) => {
          const content = result.searchableContent;
          return !excludeTerms.some(term => content.includes(term));
        });
      }

      if (results.length === 0 && !fieldSpecific) {
        const lenientFuse = new Fuse(preprocessedEmails, {
          ...fuseOptions,
          threshold: 0.6,
          minMatchCharLength: 1,
        });
        results = lenientFuse.search(query).map(result => ({
          ...result.item,
          searchScore: result.score,
          matches: result.matches,
        }));
      }

      setSearchResults(results.slice(0, 20));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      Alert.alert('Search Error', 'Failed to perform search. Please try again.');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const debouncedSearch = useMemo(() => debounce(performSearch, 300), [preprocessedEmails, selectedCategory]);

  const handleSearchSubmit = async () => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      const newSearches = [searchQuery, ...recentSearches.slice(0, 9)];
      setRecentSearches(newSearches);
      await saveRecentSearches(newSearches);
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
    setEmails((currentEmails) => currentEmails.filter((email) => email.id !== emailId));
  };

  const handleToggleStar = (emailId) => {
    setEmails((currentEmails) =>
      currentEmails.map((email) =>
        email.id === emailId ? { ...email, isStarred: !email.isStarred } : email
      )
    );
  };

  const clearRecentSearch = async (searchToRemove) => {
    const newSearches = recentSearches.filter((search) => search !== searchToRemove);
    setRecentSearches(newSearches);
    await saveRecentSearches(newSearches);
  };

  const clearAllRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('recentSearches');
  };

  const displayedEmails = isSearching ? searchResults : emails;

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
            Authorization: `Bearer ${accessToken}`,
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

      setEmails((currentEmails) =>
        currentEmails.map((email) =>
          email.id === emailId ? { ...email, isRead: markAsRead } : email
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

  const renderEmailItem = ({ item }) => {
    const getAvatarAndColor = () => {
      const senderEmail = String(item.from || item.sender || '');
      const senderName = item.senderName || '';
      const domain = senderEmail.split('@')[1];
      if (domain) {
        const domainBase = domain.split('.').slice(-2).join('.');
        const companyStyle = COMPANY_STYLES[domainBase];
        if (companyStyle) {
          return {
            avatarSource: companyStyle.avatar,
            backgroundColor: companyStyle.backgroundColor,
            isLetter: false,
          };
        }
      }

      const firstWord = senderName.split(' ')[0];
      const firstLetter = firstWord ? firstWord.charAt(0).toUpperCase() : '';
      if (firstLetter && firstLetter.match(/[a-zA-Z]/)) {
        return {
          avatarSource: firstLetter,
          backgroundColor: LETTER_COLORS[firstLetter],
          isLetter: true,
        };
      }

      return {
        avatarSource: 'https://cdn.pixabay.com/photo/2016/11/14/17/39/person-1824147_640.png',
        isLetter: false,
      };
    };

    const highlightText = (text, query) => {
      if (!query || !text) return <Text>{text}</Text>;
      const { terms } = parseSearchQuery(query);
      if (!terms.length) return <Text>{text}</Text>;

      let highlighted = text;
      terms.forEach((term) => {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        highlighted = highlighted.replace(regex, `<HIGHLIGHT>$1</HIGHLIGHT>`);
      });

      const parts = highlighted.split(/<HIGHLIGHT>(.*?)<\/HIGHLIGHT>/);
      return (
        <Text>
          {parts.map((part, index) =>
            index % 2 === 0 ? (
              part
            ) : (
              <Text key={index} style={styles.highlightedText}>
                {part}
              </Text>
            )
          )}
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
        avatarInfo: getAvatarAndColor(),
      });
    };

    const { avatarSource, backgroundColor, isLetter } = getAvatarAndColor();

    return (
      <TouchableOpacity
        style={[styles.emailItem, !item.isRead && styles.unreadEmail]}
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
          <Text
            style={[styles.senderName, !item.isRead && styles.unreadText]}
            numberOfLines={1}
          >
            {highlightText(item.senderName || item.from, searchQuery)}
          </Text>
          <View style={styles.subjectContainer}>
            <Text
              style={[styles.subject, !item.isRead && styles.unreadText]}
              numberOfLines={1}
            >
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

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const savedSearches = await AsyncStorage.getItem('recentSearches');
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearches = async (searches) => {
    try {
      await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={isSearchFocused ? '#f1f3f4' : '#fff'}
        barStyle="dark-content"
      />
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
            accessibilityLabel="Search emails"
            accessibilityRole="search"
          />
          {(searchQuery.length > 0 || isSearchFocused) && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setIsSearching(false);
                setIsSearchFocused(false);
                Keyboard.dismiss();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#5f6368" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {isSearchFocused && (
        <View style={styles.searchOverlay}>
          <View style={styles.categoryContainer}>
            {searchCategories.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.key && styles.selectedCategoryChip,
                ]}
                onPress={() => {
                  setSelectedCategory(category.key);
                  if (searchQuery) handleSearch(searchQuery);
                }}
                accessibilityLabel={`Search by ${category.label}`}
                accessibilityRole="button"
              >
                <Ionicons
                  name={category.icon}
                  size={16}
                  color={selectedCategory === category.key ? '#1a73e8' : '#5f6368'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category.key && styles.selectedCategoryChipText,
                  ]}
                >
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
                    accessibilityLabel={`Recent search: ${search}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="time-outline" size={16} color="#5f6368" />
                    <Text style={styles.recentSearchText}>{search}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#5f6368"
                      style={styles.recentSearchArrow}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => clearRecentSearch(search)}
                    style={styles.clearSearchButton}
                    accessibilityLabel={`Clear recent search: ${search}`}
                    accessibilityRole="button"
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
                keyExtractor={(item) => item.id}
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
          keyExtractor={(item) => item.id}
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
    backgroundColor: '#f8fafd',
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
    fontWeight: '600',
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
    resizeMode: 'cover',
  },
});

export default MailBox;