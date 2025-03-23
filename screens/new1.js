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
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import RNFS from 'react-native-fs';

const getGoogleToken = async () => {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens;
  } catch (error) {
    console.error('Error getting Google token:', error);
    throw error;
  }
};

// Request storage permissions for Android
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
    outputRange: [120, 60],
    extrapolate: 'clamp',
  });

  // Skeleton animation
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
    outputRange: [-300, 300],
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
      // Handle height update
      setWebViewHeight(parseInt(data));
      setIsLoading(false);
    } else {
      // Handle attachment click
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
      // Request storage permissions
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) return;

      let filePath;

      // Determine file extension based on MIME type
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

      // Use TemporaryDirectoryPath for iOS and Android
      const tempDir = RNFS.TemporaryDirectoryPath;
      filePath = `${tempDir}/${tempFileName}`;

      if (base64Data) {
        // Write Base64 data to a temporary file
        await RNFS.writeFile(filePath, base64Data, 'base64');
      } else if (attachmentId && email.id) {
        // Fetch attachment from Gmail API
        const tokens = await getGoogleToken();
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}/attachments/${attachmentId}`,
          {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          }
        );
        const attachmentData = await response.json();
        const decodedData = attachmentData.data; // Base64url encoded
        const base64Content = decodedData.replace(/-/g, '+').replace(/_/g, '/');
        await RNFS.writeFile(filePath, base64Content, 'base64');
      } else {
        Alert.alert('Error', 'No attachment data available.');
        return;
      }

      console.log('File written to:', filePath);

      // Create file URI
      const fileUri = Platform.OS === 'android' ? `file://${filePath}` : filePath;

      // First, try Linking.openURL
      const supported = await Linking.canOpenURL(fileUri);
      if (supported) {
        console.log('Attempting to open URI:', fileUri);
        await Linking.openURL(fileUri);
      } else {
        console.log('Linking.openURL not supported, falling back to Share.share');
        // Fallback to Share.share
        await Share.share({
          url: fileUri,
          title: 'Open with',
          mimeType: mimeType,
        });
      }

      // Clean up the temporary file (optional)
      // await RNFS.unlink(filePath);
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

  // HTML template for WebView
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          body {
            font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #202124;
            margin: 0;
            padding: 0 16px;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: #1a73e8;
            text-decoration: underline;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
            background-color: #f8f9fa;
            padding: 16px;
            border-radius: 4px;
          }
          blockquote {
            border-left: 4px solid #e0e0e0;
            margin: 0;
            padding-left: 16px;
            color: #5f6368;
          }
          .attachment-container {
            margin-top: 20px;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
          .attachment-item {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 8px;
            margin: 5px 0;
            cursor: pointer;
          }
          .attachment-icon {
            font-size: 32px;
            margin-right: 10px;
          }
          .attachment-name {
            font-size: 14px;
            word-break: break-word;
          }
          .attachment-size {
            font-size: 12px;
            color: #666;
          }
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
          style={[
            styles.skeletonLine,
            styles.skeletonLongLine,
            { transform: [{ translateX }] },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.skeletonMediumLine,
            { transform: [{ translateX }] },
          ]}
        />
        <View style={styles.activityIndicatorContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.skeletonShortLine,
            { transform: [{ translateX }] },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.skeletonLongLine,
            { transform: [{ translateX }] },
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Modern Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleArchive}>
              <Ionicons name="archive-outline" size={22} color="#5f6368" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color="#5f6368" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="#5f6368" />
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
        <Text style={styles.subject}>{email.subject}</Text>

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
                <Ionicons name="person" size={24} color="white" />
              )}
            </View>
            <View style={styles.senderInfo}>
              <View style={styles.senderNameContainer}>
                <Text style={styles.senderName}>{email.sender}</Text>
                <TouchableOpacity onPress={handleToggleStar}>
                  <Ionicons
                    name={isStarred ? 'star' : 'star-outline'}
                    size={22}
                    color={isStarred ? '#f4b400' : '#5f6368'}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.recipientInfo}
                onPress={() => setShowFullHeader(!showFullHeader)}
              >
                <Text style={styles.recipientText}>to me</Text>
                <Ionicons
                  name={showFullHeader ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#5f6368"
                  style={styles.expandIcon}
                />
              </TouchableOpacity>
            </View>
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
              <Text style={styles.loadingText}>Loading email content...</Text>
              <SkeletonLoader />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.replyButton}>
          <Ionicons name="arrow-undo" size={22} color="white" />
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.forwardButton}>
          <Ionicons name="arrow-forward" size={22} color="#5f6368" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight + 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 12,
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  subject: {
    fontSize: 22,
    fontWeight: '400',
    color: '#202124',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  emailMetadata: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
    color: 'white',
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
  senderNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  recipientText: {
    fontSize: 14,
    color: '#5f6368',
  },
  expandIcon: {
    marginLeft: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 8,
  },
  expandedHeader: {
    backgroundColor: '#f1f3f4',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerLabel: {
    width: 60,
    fontSize: 14,
    color: '#5f6368',
  },
  headerValue: {
    flex: 1,
    fontSize: 14,
    color: '#202124',
  },
  emailBody: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'relative',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5f6368',
  },
  skeletonContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  skeletonLines: {
    width: '100%',
  },
  skeletonLine: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    height: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  skeletonLongLine: {
    width: '100%',
  },
  skeletonMediumLine: {
    width: '70%',
  },
  skeletonShortLine: {
    width: '40%',
  },
  activityIndicatorContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  replyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginRight: 16,
  },
  replyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  forwardButton: {
    padding: 12,
    backgroundColor: '#f1f3f4',
    borderRadius: 20,
  },
});

export default EmailDetail;