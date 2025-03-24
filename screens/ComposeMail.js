import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

// Sample content generator (replace with your logic)
const generateNewContent = () => {
  const contents = [
    '<p>Start typing your message here! Swipe for a fresh start.</p>',
    '<p>New draft ready! Let’s craft something great.</p>',
    '<p>Another swipe, another idea. Keep going!</p>',
  ];
  return contents[Math.floor(Math.random() * contents.length)];
};

const ComposeMail = ({ navigation }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [currentContent, setCurrentContent] = useState(generateNewContent());
  const [webViewHeight, setWebViewHeight] = useState(0);

  // Swipe animation
  const translateX = useSharedValue(0);
  const swipeThreshold = Dimensions.get('window').width * 0.3;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const onGestureEvent = (event) => {
    translateX.value = event.nativeEvent.translationX;
  };

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      if (Math.abs(translationX) > swipeThreshold) {
        translateX.value = withSpring(translationX > 0 ? Dimensions.get('window').width : -Dimensions.get('window').width, {}, () => {
          setCurrentContent(generateNewContent());
          translateX.value = 0; // Reset position
        });
      } else {
        translateX.value = withSpring(0); // Snap back
      }
    }
  };

  const handleSend = useCallback(() => {
    // Add your send email logic here (e.g., Firebase, Gmail API)
    console.log('Sending email:', { to, subject, body: currentContent });
    navigation.goBack();
  }, [to, subject, currentContent, navigation]);

  const handleWebViewMessage = useCallback((event) => {
    const data = event.nativeEvent.data;
    if (!isNaN(data)) {
      setWebViewHeight(parseInt(data));
    }
  }, []);

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
          img { max-width: 100%; height: auto; }
          a { color: #1a73e8; text-decoration: underline; }
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
      <body contenteditable="true">
        ${currentContent}
        <script>
          window.onload = function() {
            window.ReactNativeWebView.postMessage(
              Math.max(
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              )
            );
          }
          document.body.addEventListener('input', function() {
            window.ReactNativeWebView.postMessage(
              Math.max(
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              )
            );
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a73e8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={22} color="#5f6368" />
        </TouchableOpacity>
      </View>

      {/* Compose Fields */}
      <ScrollView style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="To"
          placeholderTextColor="#6b7280"
          value={to}
          onChangeText={setTo}
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          placeholder="Subject"
          placeholderTextColor="#6b7280"
          value={subject}
          onChangeText={setSubject}
        />
        <View style={styles.divider} />

        {/* Swipeable Body */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Reanimated.View style={[styles.emailBody, animatedStyle, { height: webViewHeight || 'auto' }]}>
            <WebView
              source={{ html: htmlContent }}
              onMessage={handleWebViewMessage}
              scrollEnabled={false}
              style={styles.webView}
            />
          </Reanimated.View>
        </PanGestureHandler>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="attach" size={22} color="#5f6368" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight + 8,
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 12,
  },
  sendButton: {
    padding: 12,
  },
  content: {
    flex: 1,
    backgroundColor: '#fef9f3',
  },
  input: {
    fontSize: 16,
    color: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f3f4',
  },
  emailBody: {
    width: '100%',
    backgroundColor: '#fef9f3',
    position: 'relative',
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    backgroundColor: '#fef9f3',
  },
  attachButton: {
    padding: 12,
    backgroundColor: '#f8e5d6',
    borderRadius: 20,
  },
});

export default ComposeMail;