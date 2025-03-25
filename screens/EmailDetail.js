import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Share,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import RNFS from 'react-native-fs';
import * as Sharing from 'expo-sharing'; // Added for file sharing/opening

const getGoogleToken = async () => {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens;
  } catch (error) {
    console.error('Error getting Google token:', error);
    throw error;
  }
};

// Request storage permissions for Android (optional, may not be needed with expo-sharing)
const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);

    if (
      granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
    ) {
      return true;
    } else {
      Alert.alert('Permission Denied', 'Storage permission is required to save and open attachments.');
      return false;
    }
  } catch (err) {
    console.warn('Error requesting storage permission:', err);
    return false;
  }
};

const EmailDetail = ({ route, navigation }) => {
  const { email, avatarInfo } = route.params;
  const [isStarred, setIsStarred] = useState(email.isStarred);
  const [showFullHeader, setShowFullHeader] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Animation for header
  const scrollY = new Animated.Value(0);
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [140, 60],
    extrapolate: 'clamp',
  });

  // Enhanced skeleton animation
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
  }, [isLoading, shimmerAnimatedValue]);

  const translateX = shimmerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-Dimensions.get('window').width, Dimensions.get('window').width],
  });

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Email',
      'Are you sure you want to delete this email?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            navigation.navigate('MailBox', {
              action: 'delete',
              emailId: email.id,
            });
          },
        },
      ]
    );
  }, [email.id, navigation]);

  const handleArchive = useCallback(() => {
    Alert.alert(
      'Archive Email',
      'Archive this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [navigation]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${email.subject}\n\nFrom: ${email.sender}\n\n${email.preview}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share email');
    }
  }, [email]);

  const handleToggleStar = useCallback(() => {
    setIsStarred((prev) => !prev);
    navigation.navigate('MailBox', {
      action: 'toggleStar',
      emailId: email.id,
      isStarred: !isStarred,
    });
  }, [email.id, isStarred, navigation]);

  const handleWebViewMessage = useCallback((event) => {
    const data = event.nativeEvent.data;
    if (!isNaN(data)) {
      setWebViewHeight(parseInt(data));
      setIsLoading(false);
    } else {
      try {
        const message = JSON.parse(data);
        if (message.type === 'openAttachment') {
          const { mimeType, data, filename, attachmentId } = message;
          handleAttachmentClick(mimeType, data, filename, attachmentId);
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    }
  }, []);

  const handleAttachmentClick = async (mimeType, base64Data, filename, attachmentId) => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) return;

      let filePath;
      const extensionMap = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      };
      const extension = extensionMap[mimeType] || '.bin';
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_') || 'attachment';
      const tempFileName = `${sanitizedFilename}${extension}`;

      const tempDir = RNFS.TemporaryDirectoryPath;
      filePath = `${tempDir}/${tempFileName}`;

      if (base64Data) {
        await RNFS.writeFile(filePath, base64Data, 'base64');
      } else if (attachmentId && email.id) {
        const tokens = await getGoogleToken();
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}/attachments/${attachmentId}`,
          { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
        );
        const attachmentData = await response.json();
        const decodedData = attachmentData.data;
        const base64Content = decodedData.replace(/-/g, '+').replace(/_/g, '/');
        await RNFS.writeFile(filePath, base64Content, 'base64');
      } else {
        Alert.alert('Error', 'No attachment data available.');
        return;
      }

      const fileUri = Platform.OS === 'android' ? `file://${filePath}` : filePath;

      // Use expo-sharing to open/share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: 'Open with', // Android-specific
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error opening attachment:', error);
      Alert.alert('Error', 'Failed to open attachment: ' + error.message);
    }
  };

  const handleWebViewLoadStart = () => {
    setIsLoading(true);
  };

  const handleWebViewLoadEnd = () => {
    setIsLoading(false);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Roboto', -apple-system, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #202124;
            margin: 0;
            padding: 16px;
            background-color: #fef9f3;
          }
          img { max-width: 100%; height: auto; }
          a { color: #1a0dab; text-decoration: none; }
          a:hover { text-decoration: underline; }
          pre { white-space: pre-wrap; word-wrap: break-word; background: #f8e5d6; padding: 8px; border-radius: 4px; }
          blockquote { border-left: 2px solid #dadce0; margin: 0; padding-left: 12px; color: #5f6368; }
          .attachment-container { margin-top: 16px; border-top: 1px solid #dadce0; padding-top: 8px; }
          .attachment-item { display: flex; align-items: center; padding: 8px; border: 1px solid #dadce0; border-radius: 4px; margin-bottom: 8px; cursor: pointer; background: #fef9f3; }
          .attachment-icon { font-size: 24px; margin-right: 8px; }
          .attachment-name { font-size: 14px; color: #202124; }
          .attachment-size { font-size: 12px; color: #5f6368; margin-left: 8px; }
        </style>
      </head>
      <body>
        ${email.body || '<p>No content available</p>'}
        <script>
          window.onload = function() {
            window.ReactNativeWebView.postMessage(
              Math.max(
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              )
            );
          }
        </script>
      </body>
    </html>
  `;

  const SkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonLines}>
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonSubject, { transform: [{ translateX }] }]}
        >
          <View style={styles.shimmerOverlay} />
        </Animated.View>
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonSender, { transform: [{ translateX }] }]}
        >
          <View style={styles.shimmerOverlay} />
        </Animated.View>
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonLongLine, { transform: [{ translateX }] }]}
        >
          <View style={styles.shimmerOverlay} />
        </Animated.View>
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonMediumLine, { transform: [{ translateX }] }]}
        >
          <View style={styles.shimmerOverlay} />
        </Animated.View>
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonShortLine, { transform: [{ translateX }] }]}
        >
          <View style={styles.shimmerOverlay} />
        </Animated.View>
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonLongLine, { transform: [{ translateX }] }]}
        >
          <View style={styles.shimmerOverlay} />
        </Animated.View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fef9f3" />

      {/* Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#332b23" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleArchive}>
              <Ionicons name="archive-outline" size={24} color="#332b23" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#332b23" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#332b23" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Email Content */}
      <ScrollView
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } }}],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.subjectContainer}>
          <Text style={styles.subject} numberOfLines={2}>
            {email.subject}
          </Text>
          <TouchableOpacity onPress={handleToggleStar}>
            <Ionicons
              name={isStarred ? 'star' : 'star-outline'}
              size={24}
              color={isStarred ? '#f4b400' : '#332b23'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.emailMetadata}>
          <View style={styles.senderContainer}>
            <View style={[styles.avatar, { backgroundColor: avatarInfo.backgroundColor }]}>
              {avatarInfo.isLetter ? (
                <Text style={styles.avatarText}>{avatarInfo.avatarSource}</Text>
              ) : typeof avatarInfo.avatarSource === 'string' && avatarInfo.avatarSource.startsWith('http') ? (
                <Image
                  source={{ uri: avatarInfo.avatarSource }}
                  style={styles.avatarImage}
                  defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/36/36183.png' }}
                />
              ) : (
                <Ionicons name="person" size={24} color="#ffffff" />
              )}
            </View>
            <View style={styles.senderInfo}>
              <Text style={styles.senderName} numberOfLines={1}>
                {email.senderName || email.sender.split('<')[0].trim()}
              </Text>
              <TouchableOpacity onPress={() => setShowFullHeader(!showFullHeader)}>
                <Text style={styles.recipientText} numberOfLines={1}>
                  {email.sender.includes('<') ? email.sender.match(/<(.+?)>/)[1] : email.sender} • to me
                  <Ionicons
                    name={showFullHeader ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#332b23"
                    style={styles.expandIcon}
                  />
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
            onLoadStart={handleWebViewLoadStart}
            onLoadEnd={handleWebViewLoadEnd}
            scrollEnabled={false}
            injectedJavaScript={`
              window.ReactNativeWebView.postMessage(
                Math.max(
                  document.documentElement.scrollHeight,
                  document.documentElement.offsetHeight
                )
              );
              true;
            `}
            style={styles.webView}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <SkeletonLoader />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
          <Ionicons name="arrow-undo-outline" size={24} color="#ffdbc1" />
          <Text style={styles.actionButtonText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
          <Ionicons name="arrow-redo-outline" size={24} color="#ffdbc1" />
          <Text style={styles.actionButtonText}>Forward</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef9f3',
  },
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
    position: 'fixed',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'fixed',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#fef9f3',
  },
  subjectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subject: {
    fontSize: 20,
    fontWeight: '400',
    color: '#202124',
    flex: 1,
    marginRight: 8,
  },
  emailMetadata: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dadce0',
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
  },
  recipientText: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  expandIcon: {
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#5f6368',
    marginLeft: 8,
  },
  expandedHeader: {
    backgroundColor: '#f8e5d6', // Slightly darker for contrast
    padding: 12,
    marginTop: 8,
    borderRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerLabel: {
    width: 50,
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
  },
  headerValue: {
    flex: 1,
    fontSize: 12,
    color: '#202124',
  },
  emailBody: {
    width: '100%',
    backgroundColor: '#fef9f3',
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(254, 249, 243, 0.9)', // Adjusted for #fef9f3
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  skeletonLines: {
    width: '100%',
  },
  skeletonLine: {
    backgroundColor: '#e8eaed',
    borderRadius: 4,
    height: 10,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonSubject: {
    width: '80%',
    height: 20,
    marginBottom: 16,
  },
  skeletonSender: {
    width: '60%',
    height: 14,
    marginBottom: 16,
  },
  skeletonLongLine: {
    width: '90%',
  },
  skeletonMediumLine: {
    width: '70%',
  },
  skeletonShortLine: {
    width: '50%',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    opacity: 0.7,
  },
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#8b5014',
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#ffdbc1', // Light color for contrast on #8b5014
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default EmailDetail;