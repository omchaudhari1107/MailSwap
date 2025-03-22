import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';

const EmailDetail = ({ route, navigation }) => {
  const { email, emailId, avatarInfo } = route.params;
  const [isStarred, setIsStarred] = useState(email.isStarred);
  const [showFullHeader, setShowFullHeader] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(0);

  // Animation for header
  const scrollY = new Animated.Value(0);
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 60],
    extrapolate: 'clamp',
  });

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Email",
      "Are you sure you want to delete this email?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            navigation.navigate('MailBox', { 
              action: 'delete',
              emailId: emailId
            });
          },
        },
      ]
    );
  }, [emailId, navigation]);

  const handleArchive = useCallback(() => {
    Alert.alert(
      "Archive Email",
      "Archive this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
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
    setIsStarred(prev => !prev);
    navigation.navigate('MailBox', {
      action: 'toggleStar',
      emailId: emailId,
      isStarred: !isStarred
    });
  }, [emailId, isStarred, navigation]);

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
        </style>
      </head>
      <body>
        ${email.body || '<p>No content available</p>'}
        <script>
          // Send height to React Native
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

  const onWebViewMessage = (event) => {
    setWebViewHeight(parseInt(event.nativeEvent.data));
  };

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
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
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
                    name={isStarred ? "star" : "star-outline"}
                    size={22}
                    color={isStarred ? "#f4b400" : "#5f6368"}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.recipientInfo}
                onPress={() => setShowFullHeader(!showFullHeader)}
              >
                <Text style={styles.recipientText}>to me</Text>
                <Ionicons
                  name={showFullHeader ? "chevron-up" : "chevron-down"}
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

        <View style={[styles.emailBody, { height: webViewHeight }]}>
          <WebView
            source={{ html: htmlContent }}
            onMessage={onWebViewMessage}
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
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#202124',
  },
  htmlBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  paragraph: {
    marginVertical: 8,
    fontSize: 16,
    lineHeight: 24,
    color: '#202124',
  },
  link: {
    color: '#1a73e8',
    textDecorationLine: 'underline',
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