import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { Buffer } from 'buffer';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Together from "together-ai";

const together = new Together({ apiKey: '2cda797bb6a09cd4367dbf7b6b66077fccb989130376cbb5b1bd634040c1e3e9' });

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
    return data;
  } catch (error) {
    console.error('Error fetching attachment:', error);
    throw error;
  }
};

// Fetch threadId if missing
const fetchThreadId = async (messageId, accessToken) => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!response.ok) throw new Error('Failed to fetch message details');
    const data = await response.json();
    return data.threadId;
  } catch (error) {
    console.error('Error fetching threadId:', error);
    return null; // Fallback to null if fetch fails
  }
};

// AI Reply Generation Function
const generateReply = async (originalMessage, userPrompt, email, user, setGeneratedReply) => {
  try {
    // Truncate originalMessage to a reasonable length (e.g., 4000 characters or estimate ~3000 tokens)
    const maxInputLength = 4000; // Adjust this based on your needs
    const truncatedMessage = originalMessage.length > maxInputLength 
      ? originalMessage.substring(0, maxInputLength) + "..." 
      : originalMessage;

    const lowerMessage = truncatedMessage.toLowerCase();
    let tone = 'neutral';
    if (lowerMessage.includes('urgent') || lowerMessage.includes('important')) tone = 'formal';
    else if (lowerMessage.includes('thanks') || lowerMessage.includes('great')) tone = 'friendly';
    else if (lowerMessage.includes('sorry') || lowerMessage.includes('issue')) tone = 'apologetic';

    const aiPrompt = `
      Generate an email reply to the following message: "${truncatedMessage}"
      User prompt: "${userPrompt}"
      Tone: ${tone}
      Keep it concise and professional. Do not include a subject line.
      user: ${user.name || 'You'}
      sender email: ${email.from || 'Sender'} - try to get name from it
      Recver email(me): ${email.to || 'Recipient'} - try to get name from it
    `;

    const response = await together.chat.completions.create({
      messages: [{"role": "user", "content": aiPrompt}],
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      max_tokens: 500, // Reduce max_new_tokens to leave buffer
    });

    const generatedContent = response.choices[0].message.content;
    setGeneratedReply(generatedContent);
  } catch (error) {
    console.error('Error generating reply with AI:', error);
    const fallbackText = `Dear ${email.senderName || 'Sender'},\n\nThank you for your message. ${userPrompt}\n\nBest regards,\n${user.name || 'You'}`;
    setGeneratedReply(fallbackText);
  }
};

// Updated sendEmailReply Function
const sendEmailReply = async (accessToken, to, subject, generatedReply, threadId, messageId, userName) => {
  try {
    // Format the reply content with a signature
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        ${generatedReply
          .split('\n')
          .filter(line => line.trim())
          .map(line => `<p style="margin: 0 0 10px 0;">${line.trim()}</p>`)
          .join('')}
        <br/>
      </div>
    `;

    // Construct email headers with threading support
    const emailHeaders = [
      `To: ${to}`,
      `Subject: Re: ${subject}`,
      'Content-Type: text/html; charset="UTF-8"',
    ];

    // Only add threading headers if messageId is valid
    if (messageId) {
      emailHeaders.push(`In-Reply-To: <${messageId}>`);
      emailHeaders.push(`References: <${messageId}>`);
    }

    const emailBody = [...emailHeaders, '', htmlMessage].join('\r\n');

    // Encode to base64url
    const rawEmail = Buffer.from(emailBody, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare the request body, only include threadId if it’s valid
    const requestBody = { raw: rawEmail };
    if (threadId && threadId !== messageId) { // Avoid using messageId as threadId
      requestBody.threadId = threadId;
    }

    // Send the email via Gmail API
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || 'Failed to send email reply');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email reply:', error);
    throw error;
  }
};

const EmailDetail = ({ route, navigation }) => {
  const { email, avatarInfo, user } = route.params;
  const [isStarred, setIsStarred] = useState(email.isStarred || false);
  const [isArchived, setIsArchived] = useState(!email.labelIds?.includes('INBOX') || false);
  const [showFullHeader, setShowFullHeader] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [replyPrompt, setReplyPrompt] = useState('');
  const [generatedReply, setGeneratedReply] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  const scrollY = new Animated.Value(0);
  useEffect(() => {
  }, [email]);
  
  const shimmerAnimatedValue = new Animated.Value(0);
  useEffect(() => {
    if (isLoading || isGenerating || isSending) {
      Animated.loop(
        Animated.timing(shimmerAnimatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isLoading, isGenerating, isSending]);

  useEffect(() => {
    if (isGenerating || isSending) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isGenerating, isSending]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const translateX = shimmerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-Dimensions.get('window').width, Dimensions.get('window').width],
  });

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
        base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
      } else {
        throw new Error('No attachment data available');
      }

      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });

      let fileUri = `${downloadDir}${attachment.filename}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        const extension = attachment.filename.split('.').pop();
        const nameWithoutExt = attachment.filename.replace(`.${extension}`, '');
        fileUri = `${downloadDir}${nameWithoutExt}_${Date.now()}.${extension}`;
      }

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: attachment.mimeType,
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

  const handleGenerateReply = useCallback(async () => {
    if (!replyPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt to generate a reply.');
      return;
    }
    setIsGenerating(true);
    await generateReply(
      email.body || 'No content available',
      replyPrompt,
      email,
      user,
      setGeneratedReply
    );
    setIsGenerating(false);
  }, [email, user, replyPrompt]);

  const handleSendReply = useCallback(async () => {
    try {
      if (!generatedReply.trim()) {
        Alert.alert('Error', 'Cannot send an empty reply.');
        return;
      }

      setIsSending(true);
      const accessToken = await getGoogleToken();
      const to = email.sender.includes('<') ? email.sender.match(/<(.+?)>/)[1] : email.sender;
      const subject = email.subject || 'No Subject';
      let threadId = email.threadId || null;
      const messageId = email.id || null;

      // Fetch threadId if missing and messageId is available
      if (!threadId && messageId) {
        threadId = await fetchThreadId(messageId, accessToken);
      }

      await sendEmailReply(accessToken, to, subject, generatedReply, threadId, messageId, user.name);

      Alert.alert('Success', 'Reply sent successfully!');
      setReplyPrompt('');
      setGeneratedReply('');
      setIsEditing(false);
      setShowReplyModal(false);
    } catch (error) {
      Alert.alert('Error', `Failed to send reply: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  }, [generatedReply, email.sender, email.subject, email.threadId, email.id, user.name]);

  const handleToggleReplyModal = useCallback(() => {
    if (showReplyModal && generatedReply) {
      Alert.alert(
        'Unsent Reply',
        'Your reply hasn\'t been sent yet. Are you sure you want to close?',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes',
            onPress: () => {
              setShowReplyModal(false);
              setReplyPrompt('');
              setGeneratedReply('');
              setIsEditing(false);
              setIsGenerating(false);
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      setShowReplyModal((prev) => !prev);
      if (showReplyModal) {
        setReplyPrompt('');
        setGeneratedReply('');
        setIsEditing(false);
        setIsGenerating(false);
      }
    }
  }, [showReplyModal, generatedReply]);

  const handleEditReply = useCallback(() => {
    setIsEditing(true);
    setEditedReply(generatedReply);
  }, [generatedReply]);

  const handleSaveEdit = useCallback(() => {
    setGeneratedReply(editedReply);
    setIsEditing(false);
  }, [editedReply]);

  const SkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonLines}>
        {[styles.skeletonSubject, styles.skeletonLongLine, styles.skeletonMediumLine, styles.skeletonLongLine].map(
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
          pre { white-space: pre-wrap; word-wrap: break-word; background: #f8e5d6; padding: 8px; borderRadius: 4px; }
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
            <TouchableOpacity style={styles.mundaneIcons} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#332b23" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mundaneIcons} onPress={handleToggleStar}>
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
                <Text style={styles.recipientText} numberOfLines={2}>
                  to {email.to}
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
                <Text style={styles.headerValue}>{email.from}</Text>
              </View>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>To:</Text>
                <Text style={styles.headerValue}>{email.to}</Text>
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

      <Modal
        visible={showReplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleToggleReplyModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.replySectionTitle}>Reply</Text>
              <TouchableOpacity onPress={handleToggleReplyModal}>
                <Ionicons name="close" size={24} color="#332b23" />
              </TouchableOpacity>
            </View>

            {!generatedReply ? (
              <>
                <TextInput
                  style={styles.promptInput}
                  placeholder="Enter your prompt (e.g., 'Reply it in a friendly tone')"
                  value={replyPrompt}
                  onChangeText={setReplyPrompt}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                  onPress={handleGenerateReply}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="refresh" size={20} color="#ffdbc1" />
                    </Animated.View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="sparkles" size={24} color="#ffdbc1" style={styles.aiicon} />
                      <Text style={styles.generateButtonText}>Generate Reply</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.replyPreview}>
                <Text style={styles.replyPreviewTitle}>Generated Reply:</Text>
                {isEditing ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editedReply}
                      onChangeText={setEditedReply}
                      multiline
                      autoFocus
                    />
                    <View style={styles.replyActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleSaveEdit}
                      >
                        <Ionicons name="checkmark" size={20} color="#ffdbc1" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => setIsEditing(false)}
                      >
                        <Ionicons name="close" size={20} color="#ffdbc1" />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.replyPreviewText}>{generatedReply}</Text>
                    <View style={styles.replyActions}>
                      <TouchableOpacity
                        style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                        onPress={handleSendReply}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <Ionicons name="refresh" size={20} color="#ffdbc1" />
                          </Animated.View>
                        ) : (
                          <Text style={styles.sendButtonText}>Send</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleEditReply}
                        disabled={isSending}
                      >
                        <Ionicons name="pencil" size={20} color="#ffdbc1" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleToggleReplyModal}>
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
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  backButton: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  mundaneIcons: { padding: 8, marginLeft: 16 },
  content: { flex: 1, backgroundColor: '#fef9f3', marginTop: 0 },
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
  loadingOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(254, 249, 243, 0.9)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  skeletonContainer: { width: '100%', paddingHorizontal: 16 },
  skeletonLines: { width: '100%' },
  skeletonLine: { backgroundColor: '#e8eaed', borderRadius: 4, height: 10, marginBottom: 12, overflow: 'hidden', position: 'relative' },
  skeletonSubject: { width: '80%', height: 20, marginBottom: 16 },
  skeletonLongLine: { width: '90%' },
  skeletonMediumLine: { width: '70%' },
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
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '90%', backgroundColor: '#fef9f3', borderRadius: 8, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  replySectionTitle: { fontSize: 18, fontWeight: '500', color: '#202124' },
  promptInput: { borderWidth: 1, borderColor: '#dadce0', borderRadius: 4, padding: 8, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  generateButton: {
    backgroundColor: '#8b5014',
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 40,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: { color: '#ffdbc1', fontSize: 16, fontWeight: '500' },
  replyPreview: {
    padding: 12,
    backgroundColor: '#f8e5d6',
    borderRadius: 4,
    minHeight: 100,
  },
  replyPreviewTitle: { fontSize: 16, fontWeight: '500', color: '#202124', marginBottom: 8 },
  replyPreviewText: { fontSize: 14, color: '#202124', marginBottom: 12 },
  editInput: { 
    borderWidth: 1, 
    borderColor: '#dadce0', 
    borderRadius: 4, 
    padding: 8, 
    minHeight: 100, 
    textAlignVertical: 'top', 
    marginBottom: 12, 
    fontSize: 14, 
    color: '#202124' 
  },
  replyActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sendButton: { backgroundColor: '#8b5014', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4 },
  sendButtonText: { color: '#ffdbc1', fontSize: 14, fontWeight: '500' },
  sendButtonDisabled: { opacity: 0.7 },
  iconButton: { padding: 8, backgroundColor: '#8b5014', borderRadius: 4 },
  aiicon: {
    marginRight: 8, // Adds some space between the icon and text
  },
});

export default EmailDetail;