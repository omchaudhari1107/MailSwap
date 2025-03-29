import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import WebView from 'react-native-webview';
import { Buffer } from 'buffer';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system';

const ForwardEmail = ({ route, navigation }) => {
  const { email, user } = route.params;
  console.log('ForwardEmailScreen email:', email);
  const [originalAttachments] = useState(email.attachments || []);
  const [from, setFrom] = useState(user.email);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(`Fwd: ${email.subject}`);
  const [bodyText, setBodyText] = useState('');
  const [newAttachments, setNewAttachments] = useState([]);
  const [webViewHeight, setWebViewHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toError, setToError] = useState('');
  const [ccError, setCcError] = useState('');

  const forwardedContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Roboto', sans-serif; font-size: 14px; line-height: 1.5; color: #332b23; margin: 0; padding: 16px; background-color: #fef9f3; }
          .forward-divider { border-top: 1px solid #dadce0; margin: 16px 0; text-align: center; color: #8b5014; font-size: 12px; }
          .forward-header { color: #8b5014; font-size: 12px; margin-bottom: 16px; }
          .forward-header p { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="forward-divider">---------- Forwarded message ---------</div>
        <div class="forward-header">
          <p>From: ${email.sender}</p>
          <p>Date: ${email.time}</p>
          <p>Subject: ${email.subject}</p>
          <p>To: me</p>
          ${email.cc ? `<p>Cc: ${email.cc}</p>` : ''}
        </div>
        ${email.body || '<p>No content available</p>'}
        <script>
          window.onload = () => window.ReactNativeWebView.postMessage(
            Math.max(document.documentElement.scrollHeight, document.documentElement.offsetHeight)
          );
        </script>
      </body>
    </html>
  `;

  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  };

  const isValidEmailList = (emails) => {
    const emailArray = emails.split(',').map(email => email.trim());
    return emailArray.every(email => isValidEmail(email));
  };

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => {
          const fileSizeMB = asset.size / (1024 * 1024);
          if (fileSizeMB > 20) {
            Alert.alert('Error', `File ${asset.name} exceeds 20MB limit`);
            return null;
          }
          return {
            uri: asset.uri,
            name: asset.name,
            size: asset.size,
            type: asset.mimeType,
          };
        }).filter(Boolean);

        setNewAttachments(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  }, []);

  const removeAttachment = useCallback((index) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getGoogleToken = async () => {
    try {
      const { accessToken } = await GoogleSignin.getTokens();
      return accessToken;
    } catch (error) {
      console.error('Error getting Google token:', error);
      throw error;
    }
  };

  const fetchAttachmentContent = async (messageId, attachmentId, accessToken) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch attachment: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      return data.data; // base64url encoded
    } catch (error) {
      console.error('Error fetching attachment:', error);
      throw error;
    }
  };

  const sendEmail = async () => {
    setToError('');
    setCcError('');

    if (!to.trim() && !cc.trim()) {
      setToError('Please enter at least one recipient in To or CC field.');
      return;
    }
    if (to.trim() && !isValidEmailList(to)) {
      setToError('Please enter valid email addresses in To field.');
      return;
    }
    if (cc.trim() && !isValidEmailList(cc)) {
      setCcError('Please enter valid email addresses in CC field.');
      return;
    }

    Alert.alert(
      'Confirm Send',
      'Are you sure you want to send this email? Please verify the content once.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setIsSending(true);
            try {
              const accessToken = await getGoogleToken();
              

              const emailData = {
                to: to,
                cc: cc,
                from: user.email || from,
                subject: subject,
                message: bodyText + '\n\n' + forwardedContent,
              };

              const htmlMessage = `
                <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                  ${bodyText
                    .split('\n')
                    .filter(line => line.trim())
                    .map(line => `<p style="margin: 0 0 10px 0;">${line.trim()}</p>`)
                    .join('')}
                  ${forwardedContent}
                </div>
              `;

              const boundary = `boundary_${Math.random().toString(36).substring(2)}`;
              let bodyParts = [
                `To: ${emailData.to}`,
                ...(emailData.cc ? [`Cc: ${emailData.cc}`] : []),
                `From: ${emailData.from}`,
                `Subject: ${emailData.subject}`,
                `MIME-Version: 1.0`,
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                `Content-Type: text/html; charset=UTF-8`,
                '',
                htmlMessage,
              ];

              // Handle original Gmail attachments
              if (originalAttachments.length > 0 && email.id) {
                for (const attachment of originalAttachments) {
                  if (!attachment.attachmentId) {
                    continue;
                  }
                  try {
                    const base64Content = await fetchAttachmentContent(
                      email.id,
                      attachment.attachmentId,
                      accessToken
                    );
                    // Convert base64url to base64
                    let formattedBase64 = base64Content.replace(/-/g, '+').replace(/_/g, '/');
                    while (formattedBase64.length % 4) {
                      formattedBase64 += '=';
                    }

                    bodyParts.push(
                      `--${boundary}`,
                      `Content-Type: ${attachment.mimeType || 'application/octet-stream'}`,
                      `Content-Disposition: attachment; filename="${attachment.filename}"`,
                      `Content-Transfer-Encoding: base64`,
                      '',
                      formattedBase64
                    );
                  } catch (error) {
                    console.error(`Failed to process attachment ${attachment.filename}:`, error);
                  }
                }
              }

              // Handle new local attachments
              if (newAttachments.length > 0) {
                for (const attachment of newAttachments) {
                  try {
                    const base64Content = await FileSystem.readAsStringAsync(attachment.uri, {
                      encoding: FileSystem.EncodingType.Base64,
                    });

                    bodyParts.push(
                      `--${boundary}`,
                      `Content-Type: ${attachment.type || 'application/octet-stream'}`,
                      `Content-Disposition: attachment; filename="${attachment.name}"`,
                      `Content-Transfer-Encoding: base64`,
                      '',
                      base64Content
                    );
                  } catch (error) {
                    console.error(`Failed to process new attachment ${attachment.name}:`, error);
                  }
                }
              }

              bodyParts.push(`--${boundary}--`);
              const emailBody = bodyParts.join('\r\n');

              const rawEmail = Buffer.from(emailBody, 'utf-8')
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

              const response = await fetch(
                'https://www.googleapis.com/gmail/v1/users/me/messages/send',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ raw: rawEmail }),
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Your email has been sent!');
                navigation.goBack();
              } else {
                const errorData = await response.json();
                console.error('Send error:', errorData);
                throw new Error(errorData.error.message || 'Failed to send email');
              }
            } catch (error) {
              setToError(error.message || 'Failed to send email. Please try again.');
              console.error('Email sending error:', error);
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  const handleSend = useCallback(() => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    sendEmail();
  }, [to, cc, subject, bodyText, newAttachments]);

  const handleWebViewMessage = useCallback((event) => {
    const data = event.nativeEvent.data;
    if (!isNaN(data)) {
      setWebViewHeight(parseInt(data));
      setIsLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fef9f3" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#332b23" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={isSending}>
          <Ionicons name="send" size={24} color={to || cc ? '#8b5014' : '#dadce0'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>From:</Text>
          <TextInput
            style={styles.input}
            value={from}
            onChangeText={setFrom}
            placeholder="Your email"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={false}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>To:</Text>
          <TextInput
            style={[styles.input]}
            value={to}
            onChangeText={setTo}
            placeholder="Recipient email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {toError ? <Text style={styles.errorText}>{toError}</Text> : null}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cc:</Text>
          <TextInput
            style={[styles.input, ccError ? styles.errorInput : null]}
            value={cc}
            onChangeText={setCc}
            placeholder="Cc (comma separated)"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {ccError ? <Text style={styles.errorText}>{ccError}</Text> : null}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Subject:</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
          />
        </View>
        <TextInput
          style={styles.bodyInput}
          value={bodyText}
          onChangeText={setBodyText}
          placeholder="Type your message here..."
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
          <Ionicons name="attach" size={24} color="#8b5014" />
          <Text style={styles.attachText}>Attach File (Max 20MB)</Text>
        </TouchableOpacity>
        {newAttachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.attachmentsLabel}>New Attachments:</Text>
            {newAttachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentItem}>
                <Text style={styles.attachmentName}>{attachment.name}</Text>
                <Text style={styles.attachmentSize}>
                  {(attachment.size / (1024 * 1024)).toFixed(2)} MB
                </Text>
                <TouchableOpacity onPress={() => removeAttachment(index)}>
                  <Ionicons name="close" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {originalAttachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.originalAttachmentsLabel}>Original Attachments:</Text>
            {originalAttachments.map((attachment, index) => (
              <View key={`original-${index}`} style={styles.attachmentItem}>
                <Text style={styles.attachmentName}>{attachment.filename || attachment.name}</Text>
                {attachment.size && (
                  <Text style={styles.attachmentSize}>
                    {(attachment.size / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        <View style={[styles.emailBody, { height: webViewHeight || 'auto' }]}>
          <WebView
            source={{ html: forwardedContent }}
            onMessage={handleWebViewMessage}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            scrollEnabled={false}
            style={styles.webView}
          />
        </View>
      </ScrollView>

      {isSending && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5014" />
            <Text style={styles.loadingText}>Sending Email...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fef9f3' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight + 8,
    paddingHorizontal: 16,
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#dadce0',
  },
  backButton: { padding: 8 },
  sendButton: { padding: 8 },
  content: { flex: 1 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dadce0',
    backgroundColor: '#fef9f3',
  },
  label: { fontSize: 14, color: '#8b5014', marginRight: 8, width: 50 },
  input: { flex: 1, fontSize: 14, color: '#332b23', backgroundColor: '#fef9f3' },
  errorInput: { borderColor: '#ff4444', borderWidth: 1 },
  errorText: { color: '#ff4444', fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 },
  bodyInput: {
    minHeight: 100,
    fontSize: 14,
    color: '#332b23',
    padding: 16,
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#dadce0',
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dadce0',
    backgroundColor: '#fef9f3',
  },
  attachText: { fontSize: 14, color: '#8b5014', marginLeft: 8 },
  attachmentsContainer: { padding: 16, backgroundColor: '#fef9f3' },
  attachmentsLabel: {
    fontSize: 14,
    color: '#8b5014',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  originalAttachmentsLabel: {
    fontSize: 14,
    color: '#8b5014',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8e5d6',
    padding: 8,
    borderRadius: 4,
  },
  attachmentName: { flex: 1, fontSize: 14, color: '#332b23' },
  attachmentSize: { fontSize: 12, color: '#8b5014', marginRight: 8 },
  emailBody: { width: '100%', backgroundColor: '#fef9f3' },
  webView: { backgroundColor: 'transparent', width: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#332b23',
  },
});

export default ForwardEmail;