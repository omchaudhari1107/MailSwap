import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing'; // For opening files with local apps

// Utility Functions
const getGoogleToken = async () => {
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    return accessToken;
  } catch (error) {
    console.error('Error getting Google token:', error);
    throw error;
  }
};

const deleteEmail = async (emailId, accessToken) => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/trash`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) throw new Error('Failed to delete email');
    return await response.json();
  } catch (error) {
    console.error('Error deleting email:', error);
    throw error;
  }
};

const modifyEmailLabels = async (emailId, accessToken, addLabelIds = [], removeLabelIds = []) => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds,
          removeLabelIds,
        }),
      }
    );
    if (!response.ok) throw new Error('Failed to modify email labels');
    return await response.json();
  } catch (error) {
    console.error('Error modifying email labels:', error);
    throw error;
  }
};

const toggleEmailStar = async (emailId, isStarred, accessToken) => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: isStarred ? ['STARRED'] : [],
          removeLabelIds: isStarred ? [] : ['STARRED'],
        }),
      }
    );
    if (!response.ok) throw new Error('Failed to update star status');
    return await response.json();
  } catch (error) {
    console.error('Error toggling email star:', error);
    throw error;
  }
};

// Fetch attachment from Gmail API
const getAttachment = async (emailId, attachmentId, accessToken) => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/attachments/${attachmentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) throw new Error('Failed to fetch attachment');
    const data = await response.json();
    return data; // Contains { data: "base64-encoded-string", size: number }
  } catch (error) {
    console.error('Error fetching attachment:', error);
    throw error;
  }
};

// Configure Google Sign-In
GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/gmail.modify'],
  webClientId: 'YOUR_WEB_CLIENT_ID', // Replace with your actual Web Client ID
});

const EmailDetail = ({ route, navigation }) => {
  const { email, avatarInfo, user } = route.params;
  // console.log('EmailDetail', email);
  const [isStarred, setIsStarred] = useState(email.isStarred || false);
  const [isArchived, setIsArchived] = useState(!email.labelIds?.includes('INBOX') || false);
  const [showFullHeader, setShowFullHeader] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const scrollY = new Animated.Value(0);
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [140, 60],
    extrapolate: 'clamp',
  });

  const shimmerAnimatedValue = new Animated.Value(0);
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(shimmerAnimatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isLoading]);

  const translateX = shimmerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-Dimensions.get('window').width, Dimensions.get('window').width],
  });

  // Handlers
  const handleDelete = useCallback(async () => {
    Alert.alert('Delete Email', 'Are you sure you want to delete this email?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const accessToken = await getGoogleToken();
            await deleteEmail(email.id, accessToken);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete email');
          }
        },
      },
    ]);
  }, [email.id, navigation]);

  const handleArchive = useCallback(async () => {
    const action = isArchived ? 'Unarchive' : 'Archive';
    Alert.alert(`${action} Email`, `Are you sure you want to ${action.toLowerCase()} this email?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        onPress: async () => {
          try {
            const accessToken = await getGoogleToken();
            if (isArchived) {
              await modifyEmailLabels(email.id, accessToken, ['INBOX'], []);
              setIsArchived(false);
            } else {
              await modifyEmailLabels(email.id, accessToken, [], ['INBOX']);
              setIsArchived(true);
            }
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', `Failed to ${action.toLowerCase()} email`);
          }
        },
      },
    ]);
  }, [email.id, isArchived, navigation]);

  const handleToggleStar = useCallback(async () => {
    try {
      const newStarredState = !isStarred;
      const accessToken = await getGoogleToken();
      await toggleEmailStar(email.id, newStarredState, accessToken);
      setIsStarred(newStarredState);
    } catch (error) {
      Alert.alert('Error', 'Failed to update star status');
    }
  }, [email.id, isStarred]);

  const handleDownloadAndOpenAttachment = useCallback(async (attachment) => {
    try {
      const accessToken = await getGoogleToken();
      let base64Data;

      if (attachment.data) {
        base64Data = attachment.data;
      } else if (attachment.attachmentId) {
        const attachmentData = await getAttachment(email.id, attachment.attachmentId, accessToken);
        base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/'); // Convert URL-safe base64
      } else {
        throw new Error('No attachment data available');
      }

      // Create a downloads subdirectory if it doesn't exist
      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });

      // Define file path in the downloads subdirectory
      let fileUri = `${downloadDir}${attachment.filename}`;

      // Ensure the filename is unique
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        const extension = attachment.filename.split('.').pop();
        const nameWithoutExt = attachment.filename.replace(`.${extension}`, '');
        fileUri = `${downloadDir}${nameWithoutExt}_${Date.now()}.${extension}`;
      }

      // Write file to filesystem
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Check if sharing is available and open the file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: attachment.mimeType, // Pass the MIME type for better app selection
          dialogTitle: `Open ${attachment.filename} with`,
        });
      } else {
        Alert.alert('Success', `${attachment.filename} downloaded to app storage, but opening is not supported on this device`);
      }
    } catch (error) {
      console.error('Error downloading or opening attachment:', error);
      Alert.alert('Error', 'Failed to download or open attachment');
    }
  }, [email.id]);

  const handleWebViewMessage = useCallback((event) => {
    const data = event.nativeEvent.data;
    if (!isNaN(data)) {
      setWebViewHeight(parseInt(data));
      setIsLoading(false);
    } else {
      try {
        const message = JSON.parse(data);
        if (message.type === 'openAttachment') {
          handleDownloadAndOpenAttachment({
            filename: message.filename,
            mimeType: message.mimeType,
            attachmentId: message.attachmentId,
            data: message.data,
          });
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    }
  }, [handleDownloadAndOpenAttachment]);

  // Skeleton Loader Component
  const SkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonLines}>
        {[styles.skeletonSubject, styles.skeletonSender, styles.skeletonLongLine, styles.skeletonMediumLine, styles.skeletonShortLine, styles.skeletonLongLine].map(
          (style, index) => (
            <Animated.View key={index} style={[styles.skeletonLine, style, { transform: [{ translateX }] }]}>
              <View style={styles.shimmerOverlay} />
            </Animated.View>
          )
        )}
      </View>
    </View>
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Roboto', sans-serif; font-size: 14px; line-height: 1.5; color: #202124; margin: 0; padding: 16px; background-color: #fef9f3; }
          img { max-width: 100%; height: auto; }
          a { color: #1a0dab; text-decoration: none; }
          a:hover { text-decoration: underline; }
          pre { white-space: pre-wrap; word-wrap: break-word; background: #f8e5d6; padding: 8px; border-radius: 4px; }
          blockquote { border-left: 2px solid #dadce0; margin: 0; padding-left: 12px; color: #5f6368; }
        </style>
      </head>
      <body>
        ${email.body || '<p>No content available</p>'}
        <script>
          window.onload = () => window.ReactNativeWebView.postMessage(
            Math.max(document.documentElement.scrollHeight, document.documentElement.offsetHeight)
          );
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fef9f3" />
      <Animated.View style={[styles.header]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#332b23" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#332b23" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleToggleStar}>
              <Ionicons name={isStarred ? 'star' : 'star-outline'} size={24} color={isStarred ? '#f4b400' : '#332b23'} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={styles.subjectContainer}>
          <Text style={styles.subject} numberOfLines={2}>
            {email.subject}
          </Text>
        </View>

        <View style={styles.emailMetadata}>
          <View style={styles.senderContainer}>
            <View style={[styles.avatar, { backgroundColor: avatarInfo.backgroundColor }]}>
              {avatarInfo.isLetter ? (
                <Text style={styles.avatarText}>{avatarInfo.avatarSource}</Text>
              ) : typeof avatarInfo.avatarSource === 'string' && avatarInfo.avatarSource.startsWith('http') ? (
                <Image source={{ uri: avatarInfo.avatarSource }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#ffffff" />
              )}
            </View>
            <View style={styles.senderInfo}>
              <Text style={styles.senderName} numberOfLines={1}>
                {email.senderName || email.sender.split('<')[0].trim()}
              </Text>
              <TouchableOpacity onPress={() => setShowFullHeader((prev) => !prev)}>
                <Text style={styles.recipientText} numberOfLines={1}>
                  {email.sender.includes('<') ? email.sender.match(/<(.+?)>/)[1] : email.sender} • to {email.reciver}
                  <Ionicons name={showFullHeader ? 'chevron-up' : 'chevron-down'} size={16} color="#332b23" style={styles.expandIcon} />
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.timeText}>{email.time}</Text>
          </View>
          {showFullHeader && (
            <View style={styles.expandedHeader}>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>From:</Text>
                <Text style={styles.headerValue}>{email.sender}</Text>
              </View>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>To:</Text>
                <Text style={styles.headerValue}>me</Text>
              </View>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>Date:</Text>
                <Text style={styles.headerValue}>{email.time}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.emailBody, { height: webViewHeight || 'auto' }]}>
          <WebView
            source={{ html: htmlContent }}
            onMessage={handleWebViewMessage}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            scrollEnabled={false}
            
   
style={styles.webView}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <SkeletonLoader />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {navigation.navigate('ComposeWithAI', { email, user })}}>
          <Ionicons name="arrow-undo-outline" size={24} color="#ffdbc1" />
          <Text style={styles.actionButtonText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ForwardEmail', { email, user })}
        >
          <Ionicons name="arrow-redo-outline" size={24} color="#ffdbc1" />
          <Text style={styles.actionButtonText}>Forward</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fef9f3' },
  header: {
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#dadce0',
    paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight + 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  backButton: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8 },
  content: { flex: 1, backgroundColor: '#fef9f3', marginTop: 10 },
  subjectContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  subject: { fontSize: 20, fontWeight: '400', color: '#202124', flex: 1, marginRight: 8 },
  emailMetadata: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#dadce0' },
  senderContainer: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '500' },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  senderInfo: { flex: 1 },
  senderName: { fontSize: 16, fontWeight: '500', color: '#202124' },
  recipientText: { fontSize: 12, color: '#5f6368', marginTop: 2 },
  expandIcon: { marginLeft: 4 },
  timeText: { fontSize: 12, color: '#5f6368', marginLeft: 8 },
  expandedHeader: { backgroundColor: '#f8e5d6', padding: 12, marginTop: 8, borderRadius: 4 },
  headerRow: { flexDirection: 'row', marginBottom: 4 },
  headerLabel: { width: 50, fontSize: 12, color: '#5f6368', fontWeight: '500' },
  headerValue: { flex: 1, fontSize: 12, color: '#202124' },
  emailBody: { width: '100%', backgroundColor: '#fef9f3' },
  webView: { backgroundColor: 'transparent', width: '100%' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(254, 249, 243, 0.9)', justifyContent: 'center', alignItems: 'center' },
  skeletonContainer: { width: '100%', paddingHorizontal: 16 },
  skeletonLines: { width: '100%' },
  skeletonLine: { backgroundColor: '#e8eaed', borderRadius: 4, height: 10, marginBottom: 12, overflow: 'hidden', position: 'relative' },
  skeletonSubject: { width: '80%', height: 20, marginBottom: 16 },
  skeletonSender: { width: '60%', height: 14, marginBottom: 16 },
  skeletonLongLine: { width: '90%' },
  skeletonMediumLine: { width: '70%' },
  skeletonShortLine: { width: '50%' },
  shimmerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.5)', opacity: 0.7 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#dadce0',
    backgroundColor: '#fef9f3',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#8b5014', borderRadius: 20 },
  actionButtonText: { fontSize: 14, color: '#ffdbc1', marginLeft: 8, fontWeight: '500' },
});

export default EmailDetail;
