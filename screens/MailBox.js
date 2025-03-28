import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Keyboard,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Fuse from 'fuse.js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

let tokenCache = { accessToken: null, expiresAt: 0 };
const TOKEN_REFRESH_BUFFER = 300000;

const getGoogleToken = async () => {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + TOKEN_REFRESH_BUFFER) {
    return tokenCache;
  }

  const tokens = await GoogleSignin.getTokens();
  tokenCache = {
    accessToken: tokens.accessToken,
    expiresAt: now + (tokens.expiresIn * 1000),
  };
  return tokenCache;
};

const decodeBase64 = (base64String) => {
  try {
    const normalized = base64String.replace(/-/g, '+').replace(/_/g, '/');
    let padded = normalized;
    while (padded.length % 4) padded += '=';
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.error('Error decoding base64:', error);
    return '';
  }
};

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

const LETTER_COLORS = {
  A: '#FF6B6B', B: '#4ECDC4', C: '#45B7D1', D: '#96CEB4', E: '#FFEEAD',
  F: '#D4A5A5', G: '#FFD93D', H: '#6C5B7B', I: '#FF8C42', J: '#2AB7CA',
  K: '#FE4A49', L: '#A3DE83', M: '#851E3E', N: '#4A90E2', O: '#F7A072',
  P: '#B5838D', Q: '#E6B89C', R: '#9B5DE5', S: '#00BBF9', T: '#00F5D4',
  U: '#FEE440', V: '#9B89B3', W: '#98C1D9', X: '#E56B6F', Y: '#8860D0',
  Z: '#5AB9EA',
};

const COMPANY_STYLES = {
  'google.com': { backgroundColor: '#fef7e0', avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png' },
  'netflix.com': { backgroundColor: 'black', avatar: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico' },
  'amazon.com': { backgroundColor: '#ff9900', avatar: 'https://www.amazon.com/favicon.ico' },
  'paypal.com': { backgroundColor: 'white', avatar: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png' },
  'apple.com': { backgroundColor: '#000000', avatar: 'https://www.apple.com/favicon.ico' },
  'microsoft.com': { backgroundColor: '#00a4ef', avatar: 'https://www.microsoft.com/favicon.ico' },
  'facebook.com': { backgroundColor: '#1877f2', avatar: 'https://www.facebook.com/favicon.ico' },
  'twitter.com': { backgroundColor: '#1da1f2', avatar: 'https://www.twitter.com/favicon.ico' },
  'linkedin.com': { backgroundColor: '#0a66c2', avatar: 'https://www.linkedin.com/favicon.ico' },
};

const MailBox = ({ route, navigation }) => {
  const [user] = useState(route.params?.user || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [emailCategory, setEmailCategory] = useState('primary');
  const { emails: initialEmails } = route.params || {};
  const [emails, setEmails] = useState(initialEmails || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const currentCategoryRef = useRef('primary');
  const fetchControllerRef = useRef(null);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.05, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ])
    );
    if (isRefreshing || isInitialLoading) pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, scaleAnim, isRefreshing, isInitialLoading]);

  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });
  const pulseScale = scaleAnim.interpolate({ inputRange: [1, 1.05], outputRange: [1, 1.05] });

  const debounce = useCallback((func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  const searchCategories = useMemo(() => [
    { key: 'all', label: 'All', icon: 'search' },
    { key: 'subject', label: 'Subject', icon: 'document-text' },
    { key: 'from', label: 'From', icon: 'person' },
    { key: 'body', label: 'Content', icon: 'chatbox' },
    { key: 'attachments', label: 'Attachments', icon: 'attach' },
  ], []);

  const emailCategories = useMemo(() => [
    { key: 'primary', label: 'Primary', icon: 'mail' },
    { key: 'sent', label: 'Sent', icon: 'send' },
    { key: 'starred', label: 'Starred', icon: 'star' },
    { key: 'spam', label: 'Spam', icon: 'alert-circle' },
    // { key: 'archive' ,label: 'Archive', icon: 'archive' },
  ], []);

  // <Ionicons name={category.icon} size={16} color={emailCategory === category.key ? '#291609' : '#5f6368'} /> for tags icon


  const preprocessedEmails = useMemo(() => {
    return emails.map(email => ({
      ...email,
      subject: email.subject || '',
      from: email.from || email.sender || '',
      preview: email.preview || '',
      body: email.body || '',
      time: email.time || '',
      sender: { email: email.from || '', name: email.senderName || '' },
      attachments: email.attachments || [],
      searchableContent: [
        email.subject || '',
        email.from || email.sender || '',
        email.preview || '',
        email.body || '',
        email.time || '',
        email.senderName || '',
        email.attachments?.map(att => att.name).join(' ') || '',
      ].filter(Boolean).join(' ').toLowerCase(),
    }));
  }, [emails]);

  const fuseOptions = useMemo(() => ({
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
  }), [selectedCategory]);

  const fetchEmails = useCallback(async (category) => {
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    fetchControllerRef.current = new AbortController();
    const signal = fetchControllerRef.current.signal;

    setEmails([]); // Clear emails before fetching to avoid overlap
    currentCategoryRef.current = category;

    try {
      const tokens = await getGoogleToken();
      let query = '';
      if (category === 'spam') query = 'in:spam';
      else if (category === 'starred') query = 'is:starred';
      else if (category === 'sent') query = 'in:sent';
      // else if (category === 'archive') query = '-in:inbox -in:spam -in:trash';
      else query = 'in:inbox -in:spam';

      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${query}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        signal,
      });
      const data = await response.json();

      const emailPromises = data.messages.map(async message => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          { headers: { Authorization: `Bearer ${tokens.accessToken}` }, signal }
        );
        const emailData = await detailResponse.json();

        const getHeader = name => emailData.payload.headers.find(h => h.name === name)?.value || '';
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
          attachments: emailData.payload.parts?.filter(part => 
            part.filename || part.mimeType.match(/^(application|audio|video|image)/)
          ).map(part => ({
            filename: part.filename || 'unnamed-attachment',
            mimeType: part.mimeType,
            attachmentId: part.body.attachmentId,
            size: part.body.size,
            data: part.body.data,
          })) || [],
        };
      });

      const formattedEmails = await Promise.all(emailPromises);
      if (currentCategoryRef.current === category) {
        setEmails(formattedEmails);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // console.error('Fetch emails error:', error);
      }
    } finally {
      if (currentCategoryRef.current === category) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const debouncedFetchEmails = useMemo(() => debounce((category) => fetchEmails(category), 300), [fetchEmails]);

  const handleCategoryChange = useCallback((category) => {
    setEmailCategory(category);
    setIsInitialLoading(true);
    debouncedFetchEmails(category);
  }, [debouncedFetchEmails]);

  const batchModifyEmails = async (emailIds, modifications) => {
    try {
      const { accessToken } = await getGoogleToken();
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: emailIds,
            ...modifications,
          }),
        }
      );

      if (!response.ok) throw new Error('Batch modify failed');
      return true;
    } catch (error) {
      console.error('Batch modify error:', error);
      return false;
    }
  };

  const deleteEmails = useCallback(async (emailIds) => {
    try {
      const success = await batchModifyEmails(emailIds, { addLabelIds: ['TRASH'] });
      if (success) {
        setEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
        setSelectedEmails(new Set());
        setIsSelectionMode(false);
        Alert.alert('Success', `${emailIds.length} email${emailIds.length > 1 ? 's' : ''} moved to Trash`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete emails');
    }
  }, []);

  useEffect(() => {
    const loadEmails = async () => {
      setIsInitialLoading(true);
      await fetchEmails('primary');
    };
    loadEmails();
    GoogleSignin.configure({
      webClientId: '798624486063-vm81209jpdbncait5o4nis8ifup2cjmq.apps.googleusercontent.com',
      offlineAccess: true,
    });
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [fetchEmails]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchEmails(emailCategory);
  }, [fetchEmails, emailCategory]);

  const parseSearchQuery = useCallback(query => {
    const terms = [];
    const excludeTerms = [];
    let fieldSpecific = null;

    const fieldMatch = query.match(/^(from|subject|body|attachments):(.+)/i);
    if (fieldMatch) return { terms, excludeTerms, fieldSpecific: { field: fieldMatch[1].toLowerCase(), value: fieldMatch[2].trim() } };

    const parts = query.match(/"[^"]*"|[^\s"]+/g) || [];
    parts.forEach(part => {
      part = part.replace(/^"|"$/g, '').trim();
      if (part.startsWith('-')) excludeTerms.push(part.slice(1).toLowerCase());
      else terms.push(part.toLowerCase());
    });

    return { terms, excludeTerms, fieldSpecific };
  }, []);

  const handleSearch = useCallback(query => {
    setSearchQuery(query);
    setIsSearching(!!query.trim());
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchLoading(false);
    } else {
      setIsSearchLoading(true);
      debouncedSearch(query);
    }
  }, []);

  const performSearch = useCallback(query => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }

    const { terms, excludeTerms, fieldSpecific } = parseSearchQuery(query);
    const fuse = new Fuse(preprocessedEmails, fuseOptions);
    let results = fieldSpecific 
      ? fuse.search(fieldSpecific.value) 
      : fuse.search(terms.join(' '));

    if (excludeTerms.length) {
      results = results.filter(result => !excludeTerms.some(term => result.item.searchableContent.includes(term)));
    }

    if (!results.length && !fieldSpecific) {
      const lenientFuse = new Fuse(preprocessedEmails, { ...fuseOptions, threshold: 0.6 });
      results = lenientFuse.search(query);
    }

    setSearchResults(results.slice(0, 20).map(r => ({ ...r.item, searchScore: r.score, matches: r.matches })));
    setIsSearchLoading(false);
  }, [preprocessedEmails, fuseOptions]);

  const debouncedSearch = useMemo(() => debounce(performSearch, 300), [performSearch]);

  const handleSearchSubmit = useCallback(async () => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      const newSearches = [searchQuery, ...recentSearches.slice(0, 9)];
      setRecentSearches(newSearches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(newSearches));
    }
  }, [searchQuery, recentSearches]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSelectionMode) {
        clearSelection();
        return true;
      }
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
  }, [isSearchFocused, isSearching, searchQuery, isSelectionMode]);

  const handleToggleStar = useCallback(emailId => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, isStarred: !email.isStarred } : email
    ));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEmails(new Set());
    setIsSelectionMode(false);
  }, []);

const handleSelectAll = useCallback(() => {
  setSelectedEmails(prev => {
    const currentEmails = isSearching ? searchResults : emails; // Use the currently displayed emails based on search or category
    if (prev.size === currentEmails.length && currentEmails.length > 0) {
      setIsSelectionMode(false); // Exit selection mode if all are deselected
      return new Set(); // Deselect all if already all selected
    }
    setIsSelectionMode(true); // Enter selection mode when selecting all
    return new Set(currentEmails.map(email => email.id)); // Select all emails in the current category
  });
}, [isSearching, searchResults, emails]);

  const updateEmailReadStatus = useCallback(async (emailIds, markAsRead = true) => {
    const success = await batchModifyEmails(emailIds, {
      removeLabelIds: markAsRead ? ['UNREAD'] : [],
      addLabelIds: markAsRead ? [] : ['UNREAD'],
    });
    
    if (success) {
      setEmails(prev => prev.map(email => 
        emailIds.includes(email.id) ? { ...email, isRead: markAsRead } : email
      ));
    }
    return success;
  }, []);

  const displayedEmails = isSearching ? searchResults : emails;

  const renderSkeletonItem = () => (
    <Animated.View style={[styles.emailItem, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}>
      <View style={styles.emailLeftSection}>
        <Animated.View style={[styles.senderIcon, { backgroundColor: '#e0e0e0', opacity: pulseOpacity }]} />
      </View>
      <View style={styles.emailContent}>
        <Animated.View style={[styles.skeletonText, { width: `${Math.random() * 30 + 50}%`, height: 16, marginBottom: 4, opacity: pulseOpacity }]} />
        <Animated.View style={[styles.skeletonText, { width: `${Math.random() * 40 + 40}%`, height: 14, opacity: pulseOpacity }]} />
      </View>
      <View style={styles.emailRight}>
        <Animated.View style={[styles.skeletonText, { width: 40, height: 13, opacity: pulseOpacity }]} />
      </View>
    </Animated.View>
  );

  const renderEmailItem = useCallback(({ item }) => {
    const getAvatarAndColor = () => {
      const senderEmail = String(item.from || item.sender || '');
      const senderName = item.senderName || senderEmail.split('@')[0] || '';
      const domain = senderEmail.split('@')[1]?.split('.').slice(-2).join('.');
      const companyStyle = COMPANY_STYLES[domain];
      if (companyStyle) return { avatarSource: companyStyle.avatar, backgroundColor: companyStyle.backgroundColor, isLetter: false };

      const firstLetter = senderName[0]?.toUpperCase();
      return firstLetter && /[a-zA-Z]/.test(firstLetter)
        ? { avatarSource: firstLetter, backgroundColor: LETTER_COLORS[firstLetter] || '#D3D3D3', isLetter: true }
        : { avatarSource: 'https://cdn.pixabay.com/photo/2016/11/14/17/39/person-1824147_640.png', backgroundColor: '#ffdbc1', isLetter: false };
    };

    const highlightText = (text, query) => {
      if (!query || !text) return <Text>{text}</Text>;
      const { terms } = parseSearchQuery(query);
      if (!terms.length) return <Text>{text}</Text>;

      const parts = text.split(new RegExp(`(${terms.join('|')})`, 'gi'));
      return (
        <Text>
          {parts.map((part, i) => 
            terms.some(t => t.toLowerCase() === part.toLowerCase()) 
              ? <Text key={i} style={styles.highlightedText}>{part}</Text> 
              : part
          )}
        </Text>
      );
    };

    const handlePress = async () => {
      if (isSelectionMode) {
        handleAvatarPress(item.id);
      } else {
        if (!item.isRead) await updateEmailReadStatus([item.id], true);
        navigation.navigate('EmailDetail', {
          email: { ...item, attachments: item.attachments || [] },
          onDelete: () => setEmails(prev => prev.filter(e => e.id !== item.id)),
          onToggleStar: handleToggleStar,
          avatarInfo: getAvatarAndColor(),
          user: user,
        });
      }
    };

    const { avatarSource, backgroundColor, isLetter } = getAvatarAndColor();
    const isSelected = selectedEmails.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.emailItem, !item.isRead && styles.unreadEmail]}
        onPress={handlePress}
        onLongPress={() => !isSelectionMode && (setIsSelectionMode(true), setSelectedEmails(new Set([item.id])))}
        activeOpacity={0.8}
      >
        <View style={styles.emailLeftSection}>
          <TouchableOpacity onPress={() => handleAvatarPress(item.id)} style={styles.avatarContainer}>
            {isSelected ? (
              <View style={[styles.checkbox, styles.checkboxSelected]}>
                <Ionicons name="checkmark" size={18} color="#fff" style={styles.boldIcon} />
              </View>
            ) : (
              <View style={[styles.senderIcon, { backgroundColor }]}>
                {isLetter ? (
                  <Text style={styles.avatarLetter}>{avatarSource}</Text>
                ) : avatarSource.startsWith('http') ? (
                  <Image source={{ uri: avatarSource }} style={styles.avatarImage} defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/36/36183.png' }} />
                ) : (
                  <Ionicons name="person" size={24} color="#000000" style={styles.boldIcon} />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.emailContent}>
          <Text style={[styles.senderName, !item.isRead && styles.unreadText]} numberOfLines={1}>
            {highlightText(item.senderName || item.from, searchQuery)}
          </Text>
          <View style={styles.subjectContainer}>
            <Text style={[styles.subject, !item.isRead && styles.unreadText]} numberOfLines={1}>
              {highlightText(item.subject, searchQuery)}
            </Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {highlightText(item.preview, searchQuery)}
          </Text>
        </View>
        <View style={styles.emailRight}>
          <Text style={[styles.time, !item.isRead && styles.unreadText]}>{item.time}</Text>
          {item.isStarred && <Ionicons name="star" size={20} color="#f4b400" style={styles.starIcon} />}
        </View>
      </TouchableOpacity>
    );
  }, [isSelectionMode, selectedEmails, searchQuery, handleToggleStar, navigation]);

  const renderHeader = () => isSelectionMode && (
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={clearSelection}>
        <Ionicons name="close" size={26} color="#000000" style={styles.boldIcon} />
      </TouchableOpacity>
      <Text style={styles.selectionCount}>{selectedEmails.size} Selected</Text>
      <TouchableOpacity onPress={() => deleteEmails([...selectedEmails])} disabled={!selectedEmails.size}>
        <Ionicons name="trash-outline" size={26} color={selectedEmails.size ? "#1c1a17" : "#000000"} style={styles.boldIcon} />
      </TouchableOpacity>
    </View>
  );

  const handleAvatarPress = useCallback(emailId => {
    setSelectedEmails(prev => {
      const newSelected = new Set(prev);
      newSelected.has(emailId) ? newSelected.delete(emailId) : newSelected.add(emailId);
      setIsSelectionMode(newSelected.size > 0);
      return newSelected;
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('recentSearches').then(saved => saved && setRecentSearches(JSON.parse(saved)));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={'#fef9f3'} barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {renderHeader() || (
            <TouchableOpacity style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#000000" style={styles.boldIcon} />
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
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setIsSearching(false); setIsSearchFocused(false); Keyboard.dismiss(); }}>
                  <Ionicons name="close-circle" size={20} color="#000000" style={styles.boldIcon} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.profileHeader} onPress={() => navigation.navigate('Profile', { user })}>
          <Image source={{ uri: user.photo || user.photoURL }} style={styles.profileImage} />
        </TouchableOpacity>
      </View>

      {!isSearchFocused && !isSelectionMode && (
        <View style={styles.emailCategoryContainer}>
          {emailCategories.map(category => (
            <TouchableOpacity
              key={category.key}
              style={[styles.emailCategoryChip, emailCategory === category.key && styles.selectedEmailCategoryChip]}
              onPress={() => handleCategoryChange(category.key)}
            >
              <Text style={[styles.emailCategoryChipText, emailCategory === category.key && styles.selectedEmailCategoryChipText]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isSelectionMode && (
        <View style={styles.fixedSelectAll}>
          <TouchableOpacity style={styles.selectAllRow} onPress={handleSelectAll}>
            <Ionicons
              name={selectedEmails.size === displayedEmails.length && displayedEmails.length > 0 ? "checkbox" : "square-outline"}
              size={24}
              color="#000000"
              style={styles.boldIcon}
            />
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSearchFocused ? (
        <View style={styles.searchOverlay}>
          <View style={styles.categoryContainer}>
            {searchCategories.map(category => (
              <TouchableOpacity
                key={category.key}
                style={[styles.categoryChip, selectedCategory === category.key && styles.selectedCategoryChip]}
                onPress={() => { setSelectedCategory(category.key); if (searchQuery) handleSearch(searchQuery); }}
              >
                <Ionicons name={category.icon} size={16} color={selectedCategory === category.key ? '#1a73e8' : '#5f6368'} />
                <Text style={[styles.categoryChipText, selectedCategory === category.key && styles.selectedCategoryChipText]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!searchQuery && recentSearches.length > 0 && (
            <View style={styles.recentSearchesContainer}>
              <View style={styles.recentSearchesHeader}>
                <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => { setRecentSearches([]); AsyncStorage.removeItem('recentSearches'); }}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((search, index) => (
                <View key={index} style={styles.recentSearchItem}>
                  <TouchableOpacity style={styles.recentSearchContent} onPress={() => { setSearchQuery(search); handleSearch(search); }}>
                    <Ionicons name="time-outline" size={16} color="#5f6368" />
                    <Text style={styles.recentSearchText}>{search}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#5f6368" style={styles.recentSearchArrow} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setRecentSearches(prev => prev.filter(s => s !== search)); AsyncStorage.setItem('recentSearches', JSON.stringify(recentSearches.filter(s => s !== search))); }}>
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
                <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
              </View>
            )
          )}

          {(isSearchLoading || isInitialLoading) && (
            <FlatList
              data={[1, 2, 3, 4, 5]}
              renderItem={renderSkeletonItem}
              keyExtractor={item => item.toString()}
              style={styles.searchResultsList}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={(isInitialLoading || isRefreshing) ? Array(8).fill({}) : displayedEmails}
          renderItem={(isInitialLoading || isRefreshing) ? renderSkeletonItem : renderEmailItem}
          keyExtractor={(item, index) => (isInitialLoading || isRefreshing) ? index.toString() : item.id}
          contentContainerStyle={isSelectionMode ? styles.listWithFixedHeader : null}
          ListEmptyComponent={!isSearchLoading && !isInitialLoading && !isRefreshing && (
            // import { Ionicons } from '@expo/vector-icons';

            // import { Ionicons } from '@expo/vector-icons';

            <View style={styles.noEmailsContainer}>
             <Ionicons 
    name="mail-outline"    // Represents shredding/cutting
    size={140}           // Larger size for a logo-like feel
    color="#8b5014"      // Blue color to match the shredded paper in the image
    style={styles.noEmailsIcon}
  />
  <Text style={styles.noEmailsText}>Nothing herein</Text>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#1a73e8']} tintColor="#1a73e8" />}
        />
      )}

      {!isSearchFocused && !isInitialLoading && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ComposeWithAI', { user })} >
          <Ionicons name="sparkles" size={24} color="#ffdbc1" style={styles.aiicon} />
          <Text style={styles.fabText}>Compose with AI</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef9f3',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef9f3',
    borderBottomWidth: 0,
    elevation: 0,
    zIndex: 1001,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8e5d6',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 0,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: 'black',
    fontWeight: '400',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: '#fef9f3',
  },
  unreadEmail: {},
  emailLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
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
    backgroundColor: '#8b5014',
    borderRadius: 15,
    paddingVertical: 17,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: {
    color: '#ffdbc1',
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
    right: 0,
    bottom: 0,
    marginTop: 15,
  },
  emailRight:{
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  noEmailsText: {
    fontSize: 16,
    color: '#5f6368',
  },
  highlightedText: {
    backgroundColor: '#fff3cd',
    color: '#202124',
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fef9f3',
    zIndex: 1000,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#fef9f3',
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
  emailCategoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  emailCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#f8e5d6',
  },
  selectedEmailCategoryChip: {
    backgroundColor: '#ffdbc1',
  },
  emailCategoryChipText: {
    // marginLeft: 6,
    fontSize: 14,
    color: '#5f6368',
  },
  selectedEmailCategoryChipText: {
    color: '#291609',
    fontWeight: '500',
  },
  recentSearchesContainer: {
    backgroundColor: '#fef9f3',
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
    borderBottomColor: '#fef9f3',
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
    backgroundColor: '#fef9f3',
    marginTop: 10,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef9f3',
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
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fef9f3',
  },
  selectionCount: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  selectAllRow: {
    flexDirection: 'row',
    marginTop:20,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  selectAllText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
    fontWeight: '400',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  checkbox: {
    width: 50,
    height: 50,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1,
  },
  checkboxSelected: {
    backgroundColor: '#8b5014',
    borderColor: '#8b5014',
  },
  boldIcon: {
    fontWeight: 'bold',
  },
  skeletonText: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  subjectContainer: {
    flexDirection: 'row',
  },
  profileHeader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 43,
    height: 43,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#8b5014',
  },
  aiicon: {
    paddingRight: 10,
  },
  fixedSelectAll: {
    position: 'absolute',
    top: 80,
    left: 14,
    right: 0,
    zIndex: 10,
    marginTop: 10,
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  listWithFixedHeader: {
    paddingTop: 60,
  },
  noEmailsContainer: {
    minHeight: '100%',
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#f9f5e7',
  },
  noEmailsText: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '500',
  },
});

export default MailBox;