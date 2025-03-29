import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
  // Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Together from "together-ai";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Buffer } from 'buffer';
import { BackHandler } from 'react-native';
import * as FileSystem from 'expo-file-system';

const together = new Together({ apiKey: '2cda797bb6a09cd4367dbf7b6b66077fccb989130376cbb5b1bd634040c1e3e9' });

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? height * 0.08 : height * 0.06;
const isTablet = width > 768;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB in bytes

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidEmailList = (emails) => {
  if (!emails.trim()) return false;
  const emailArray = emails.split(',').map(email => email.trim());
  return emailArray.every(email => isValidEmail(email));
};

const ComposeWithAI = ({ navigation, route }) => {
  const [from, setFrom] = useState('');
  const [editable,setIsEditable] = useState(true)
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [displayedEmail, setDisplayedEmail] = useState('');
  const [showGenerateButton, setShowGenerateButton] = useState(true);
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [selectedLength, setSelectedLength] = useState('Medium');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isEmailEditable, setIsEmailEditable] = useState(false);
  const [toError, setToError] = useState('');
  const [ccError, setCcError] = useState('');
  const [promptError, setPromptError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const generatedEmailRef = useRef(null);
  const user = route.params?.user || {};
  const send_to = route.params?.email?.from || '';
  const tones = ['Professional', 'Casual', 'Formal', 'Brief'];
  const lengths = ['Short', 'Medium', 'Long'];
  useEffect(() => {
    if (send_to) {
      setTo(send_to);
      setIsEditable(false) // Pre-fill "To" field for replies
    }
  }, [send_to]);
  useEffect(() => {
    if (generatedEmail && !displayedEmail) {
      setIsTyping(true);
      setIsGenerating(false);
      typeWriterEffect(generatedEmail);
    }
  
    // Override the UI back button behavior
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#000000" style={styles.boldIcon} />
        </TouchableOpacity>
      ),
    });
  
    // Handle hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // if (hasUnsavedChanges()) {
        Alert.alert(
          'Discard Changes?',
          'Any changes made to this email format will be lost, are you sure you want to go back?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Yes',
              style: 'destructive',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return true; 
    });
  
    // Cleanup the event listener on unmount
    return () => backHandler.remove();
  }, [generatedEmail, navigation, to, cc, subject, prompt, generatedEmail, attachedFiles]);
  
  const typeWriterEffect = (text) => {
    let i = 0;
    const speed = 5;
    
    const type = () => {
      if (i < text.length) {
        setDisplayedEmail(text.substring(0, i + 1));
        // Vibration.vibrate(1);
        i++;
        setTimeout(type, speed);
      } else {
        setIsTyping(false);
      }
    };
    type();
  };

  const getGoogleToken = async () => {
    try {
      const { accessToken } = await GoogleSignin.getTokens();
      return accessToken;
    } catch (error) {
      console.error('Error getting Google token:', error);
      throw error;
    }
  };

  const generateEmail = async () => {
    setToError('');
    setCcError('');
    setPromptError('');

    let hasError = false;
    if (!to.trim() && !cc.trim()) {
      setToError('Please enter at least one recipient in To or CC field.');
      hasError = true;
    }
    if (to.trim() && !isValidEmail(to.trim())) {
      setToError('Please enter a valid email address in To field.');
      hasError = true;
    }
    if (cc.trim() && !isValidEmailList(cc)) {
      setCcError('Please enter valid email addresses in CC field, separated by commas.');
      hasError = true;
    }
    if (!prompt.trim()) {
      setPromptError('Prompt is required to generate the email.');
      hasError = true;
    }

    if (hasError) return;

    setIsGenerating(true);

    try {
      const aiPrompt = `${user.name || 'User'} wants to generate a ${selectedLength.toLowerCase()} ${selectedTone.toLowerCase()} email with only the subject and main content, ensuring proper greetings and closing based on the context.  

      For **professional emails**, use greetings like "Respected Sir/Madam" and closings like "Yours sincerely, \n [User's Name]" or "Yours faithfully,\n [User's Name]."  
      For **casual emails**, use greetings like "Dear friend" or "Sir" and closings like "Yours truly,\n [User's Name]" or "Lovingly, \n [User's Name]."  
      means after every closing like "Yours sincerely" or "Yours faithfully" add a new line and then add the user's name.
      Format the response as follows without enclosing the subject or content in quotes:  
      Subject: [subject line]  
      
      [main content with appropriate line breaks if needed]  
      [Proper greeting at the start with \n]  
      [Email body]  
      [Proper closing as per the tone, followed by the \n user's name ]  
      
      Email context: "${prompt} and ensure the email ends with proper regards."`;
            
      const response = await together.chat.completions.create({
        messages: [{"role": "user", "content": aiPrompt}],
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      });

      const generatedContent = response.choices[0].message.content;
      const [subjectLine, ...bodyLines] = generatedContent.split('\n\n');
      const subjectText = subjectLine.replace('Subject: ', '');
      const bodyText = bodyLines.join('\n\n');

      setSubject(subjectText);
      setGeneratedEmail(bodyText);
      setDisplayedEmail('');
      setShowGenerateButton(false);
    } catch (error) {
      setIsGenerating(false);
      setToError('Failed to generate email. Please try again.');
      console.error('Email generation error:', error);
    }
  };

  const handleBackPress = () => {
      Alert.alert(
        'Discard Changes?',
        'Any changes made to this email format will be lost, are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return true;
  };

  const sendEmail = async () => {
    setToError('');
    setCcError('');

    if (!to.trim() && !cc.trim()) {
      setToError('Please enter at least one recipient in To or CC field.');
      return;
    }
    if (to.trim() && !isValidEmail(to.trim())) {
      setToError('Please enter a valid email address in To field.');
      return;
    }
    if (cc.trim() && !isValidEmailList(cc)) {
      setCcError('Please enter valid email addresses in CC field, separated by commas.');
      return;
    }

    Alert.alert(
      'Confirm Send',
      'Are you sure you want to send this email? AI might make mistakes, so please verify the content once.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setIsSending(true);
            try {
              const accessToken = await getGoogleToken();

              const email = {
                to: to,
                cc: cc,
                from: user.email || from,
                subject: subject,
                message: generatedEmail,
              };

              const htmlMessage = `
                <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                  ${email.message
                    .split('\n')
                    .filter(line => line.trim())
                    .map(line => `<p style="margin: 0 0 10px 0;">${line.trim()}</p>`)
                    .join('')}
                </div>
              `;

              const boundary = `boundary_${Math.random().toString(36).substring(2)}`;
              let emailBody = '';

              if (attachedFiles.length === 0) {
                emailBody = [
                  `To: ${email.to}`,
                  ...(email.cc ? [`Cc: ${email.cc}`] : []),
                  `From: ${email.from}`,
                  `Subject: ${email.subject}`,
                  `Content-Type: text/html; charset=UTF-8`,
                  '',
                  htmlMessage,
                ].join('\r\n');
              } else {
                let bodyParts = [
                  `To: ${email.to}`,
                  ...(email.cc ? [`Cc: ${email.cc}`] : []),
                  `From: ${email.from}`,
                  `Subject: ${email.subject}`,
                  `MIME-Version: 1.0`,
                  `Content-Type: multipart/mixed; boundary="${boundary}"`,
                  '',
                  `--${boundary}`,
                  `Content-Type: text/html; charset=UTF-8`,
                  '',
                  htmlMessage,
                ];

                for (const file of attachedFiles) {
                  const base64Content = await FileSystem.readAsStringAsync(file.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });

                  bodyParts.push(
                    `--${boundary}`,
                    `Content-Type: ${file.mimeType || 'application/octet-stream'}`,
                    `Content-Disposition: attachment; filename="${file.name}"`,
                    `Content-Transfer-Encoding: base64`,
                    '',
                    base64Content
                  );
                }

                bodyParts.push(`--${boundary}--`);
                emailBody = bodyParts.join('\r\n');
              }

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

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: [
          'image/*',
          'application/pdf',
          'text/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'video/*',
          'audio/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = result.assets.filter(newFile => 
          !attachedFiles.some(existingFile => 
            existingFile.uri === newFile.uri || existingFile.name === newFile.name
          )
        );

        const newTotalSize = newFiles.reduce((sum, file) => sum + file.size, totalSize);
        if (newTotalSize > MAX_TOTAL_SIZE) {
          Alert.alert(
            'Size Limit Exceeded',
            `Total attachment size exceeds 30MB. Current total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB. Please remove some files or select smaller ones.`
          );
          return;
        }

        if (newFiles.length > 0) {
          setAttachedFiles(prevFiles => [...prevFiles, ...newFiles]);
          setTotalSize(newTotalSize);
        }
      }
    } catch (err) {
      console.error('Document picking error:', err);
    }
  };

  const removeFile = (indexToRemove) => {
    const fileToRemove = attachedFiles[indexToRemove];
    setAttachedFiles(prevFiles => 
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
    setTotalSize(prevSize => prevSize - fileToRemove.size);
  };

  const renderFilePreview = (file) => {
    if (file.mimeType && file.mimeType.includes('image')) {
      return (
        <Image
          source={{ uri: file.uri }}
          style={styles.filePreviewImage}
        />
      );
    } else if (file.mimeType && file.mimeType.includes('pdf')) {
      return (
        <Ionicons 
          name="document-text" 
          size={isTablet ? 24 : 20} 
          color="#291609" 
          style={styles.fileIcon}
        />
      );
    } else if (file.mimeType && file.mimeType.includes('video')) {
      return (
        <Ionicons 
          name="videocam" 
          size={isTablet ? 24 : 20} 
          color="#291609" 
          style={styles.fileIcon}
        />
      );
    } else if (file.mimeType && file.mimeType.includes('audio')) {
      return (
        <Ionicons 
          name="musical-notes" 
          size={isTablet ? 24 : 20} 
          color="#291609" 
          style={styles.fileIcon}
        />
      );
    } else {
      return (
        <Ionicons 
          name="document" 
          size={isTablet ? 24 : 20} 
          color="#291609" 
          style={styles.fileIcon}
        />
      );
    }
  };

  const handleEmailChange = (text) => {
    setGeneratedEmail(text);
    setDisplayedEmail(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#000000" style={styles.boldIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileHeader}>
          <Image 
            source={{ uri: user.photo || user.photoURL || 'https://cdn.pixabay.com/photo/2016/11/14/17/39/person-1824147_640.png' }} 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Compose with AI</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>From</Text>
          <TextInput
            style={styles.input}
            value={user.email || from}
            editable={false}
            // placeholder="Your email"
            placeholderTextColor="#5f6368"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>To</Text>
          <TextInput
            style={styles.input}
            value={to}
            editable={editable}
            keyboardType="email-address"
            onChangeText={(text) => {
              setTo(text);
              setToError('');
            }}
            placeholder="Recipient's email"
            placeholderTextColor="#5f6368"
            autoCapitalize="none"
          />
          {toError ? <Text style={styles.errorText}>{toError}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>CC</Text>
          <TextInput
            style={styles.input}
            value={cc}
            onChangeText={(text) => {
              setCc(text);
              setCcError('');
            }}
            placeholder="CC recipients (comma-separated)"
            placeholderTextColor="#5f6368"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.ccNote}>Note: Separate multiple emails with commas</Text>
          {ccError ? <Text style={styles.errorText}>{ccError}</Text> : null}
        </View>

        {!generatedEmail && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Prompt</Text>
              <TextInput
                style={[styles.input, styles.promptInput]}
                value={prompt}
                onChangeText={(text) => {
                  setPrompt(text);
                  setPromptError('');
                }}
                placeholder="e.g., Request a meeting next week"
                placeholderTextColor="#5f6368"
                multiline
              />
              {promptError ? <Text style={styles.errorText}>{promptError}</Text> : null}
            </View>

            <View style={styles.tagContainer}>
              {tones.map(tone => (
                <TouchableOpacity
                  key={tone}
                  style={[
                    styles.tag,
                    selectedTone === tone && styles.selectedTag,
                  ]}
                  onPress={() => setSelectedTone(tone)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedTone === tone && styles.selectedTagText,
                  ]}>
                    {tone}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tagContainer}>
              {lengths.map(length => (
                <TouchableOpacity
                  key={length}
                  style={[
                    styles.tag,
                    selectedLength === length && styles.selectedTag,
                  ]}
                  onPress={() => setSelectedLength(length)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedLength === length && styles.selectedTagText,
                  ]}>
                    {length}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {showGenerateButton && !generatedEmail && (
          <TouchableOpacity 
            style={styles.generateButton} 
            onPress={generateEmail}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#ffdbc1" />
            ) : (
              <>
                <Ionicons name="sparkles" size={isTablet ? 28 : 24} color="#ffdbc1" style={styles.aiicon} />
                <Text style={styles.generateButtonText}>Generate Email Content</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {generatedEmail && (
          <View style={styles.generatedContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject"
                placeholderTextColor="#5f6368"
              />
            </View>
            <Text style={styles.generatedLabel}>Generated Email:</Text>
            <View style={styles.generatedInputWrapper}>
              <TextInput
                ref={generatedEmailRef}
                style={[styles.generated, styles.generatedInput]}
                value={displayedEmail}
                onChangeText={handleEmailChange}
                multiline
                textAlignVertical="top"
                editable={isEmailEditable}
              />
              {!isTyping && (
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => setIsEmailEditable(!isEmailEditable)}
                >
                  <Ionicons 
                    name={isEmailEditable ? "checkmark" : "pencil"} 
                    size={isTablet ? 20 : 20} 
                    color="#ffdbc1" 
                  />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.attachmentContainer}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={pickDocument}
              >
                <Ionicons name="attach" size={isTablet ? 26 : 26} color="#291609" />
                <Text style={styles.attachButtonText}>Add Attachment</Text>
              </TouchableOpacity>
              <Text style={styles.sizeInfo}>
                Total Size: {(totalSize / (1024 * 1024)).toFixed(2)}MB / 30MB
              </Text>

              {attachedFiles.length > 0 && (
                <View style={styles.attachedFilesContainer}>
                  {attachedFiles.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      {renderFilePreview(file)}
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name} ({(file.size / 1024).toFixed(2)}KB)
                      </Text>
                      <TouchableOpacity 
                        onPress={() => removeFile(index)}
                        style={styles.removeFileButton}
                      >
                        <Ionicons name="close" size={isTablet ? 20 : 16} color="#5f6368" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {generatedEmail && (
        <View style={styles.fixedSendButtonContainer}>
          <TouchableOpacity 
            style={[styles.sendButton, (isGenerating || isTyping) && styles.disabledButton]}
            onPress={sendEmail}
            disabled={isGenerating || isTyping}
          >
            <Ionicons name="send" size={isTablet ? 24 : 20} color="#ffdbc1" />
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

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
  container: {
    flex: 1,
    backgroundColor: '#fef9f3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: HEADER_HEIGHT * 0.2,
    backgroundColor: '#fef9f3',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    zIndex: 1001,
    // height: HEADER_HEIGHT,
    width: '100%',
    position: 'fixed',
    top: 50,
    left: 0,
  },
  headerTitle: {
    fontSize: isTablet ? 22 : 18,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: height * 0.02,
  },
  contentContainer: {
    paddingHorizontal: width * 0.04,
    paddingTop: HEADER_HEIGHT + 10,
    paddingBottom: height * 0.1,
  },
  inputContainer: {
    marginBottom: height * 0.02,
    width: '100%',
  },
  label: {
    fontSize: isTablet ? 16 : 14,
    color: '#5f6368',
    marginBottom: height * 0.005,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8e5d6',
    borderRadius: 8,
    padding: isTablet ? 16 : 12,
    fontSize: isTablet ? 18 : 16,
    color: '#202124',
    width: '100%',
  },
  generated: {
    backgroundColor: '#f8e5d6',
    borderRadius: 8,
    padding: isTablet ? 16 : 12,
    fontSize: isTablet ? 18 : 16,
    color: '#202124',
    minHeight: isTablet ? 100 : 80,
  },
  generatedInput: {
    textAlignVertical: 'top',
    height: undefined,
  },
  generatedInputWrapper: {
    position: 'relative',
    marginBottom: height * 0.02,
  },
  promptInput: {
    height: isTablet ? 150 : 100,
    textAlignVertical: 'top',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: height * 0.02,
  },
  tag: {
    backgroundColor: '#f1f3f4',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTag: {
    backgroundColor: '#ffdbc1',
  },
  tagText: {
    color: '#5f6368',
    fontSize: isTablet ? 14 : 12,
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#291609',
  },
  generateButton: {
    backgroundColor: '#8b5014',
    borderRadius: 15,
    paddingVertical: isTablet ? 20 : 16,
    paddingHorizontal: width * 0.06,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: isTablet ? '100%' : '100%',
    alignSelf: 'center',
    marginBottom: height * 0.02,
  },
  generateButtonText: {
    color: '#ffdbc1',
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
  },
  generatedLabel: {
    fontSize: isTablet ? 16 : 14,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: height * 0.005,
  },
  editButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#8b5014',
  },
  fixedSendButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: width * 0.04,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5014',
    borderRadius: 8,
    paddingVertical: isTablet ? 14 : 12,
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  sendButtonText: {
    color: '#ffdbc1',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  boldIcon: {
    fontWeight: 'bold',
  },
  aiicon: {
    paddingRight: isTablet ? 12 : 10,
  },
  profileHeader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: isTablet ? 50 : 43,
    height: isTablet ? 50 : 43,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#8b5014',
  },
  attachmentContainer: {
    marginTop: height * 0.02,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdbc1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 'auto',
    alignSelf: 'flex-start',
  },
  attachButtonText: {
    color: '#291609',
    fontSize: isTablet ? 16 : 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  attachedFilesContainer: {
    marginTop: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8e5d6',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  filePreviewImage: {
    width: isTablet ? 40 : 32,
    height: isTablet ? 40 : 32,
    borderRadius: 4,
    marginRight: 8,
  },
  fileIcon: {
    marginRight: 8,
  },
  fileName: {
    flex: 1,
    color: '#202124',
    fontSize: isTablet ? 16 : 14,
    marginRight: 8,
  },
  removeFileButton: {
    padding: 4,
  },
  errorText: {
    color: 'red',
    fontSize: isTablet ? 14 : 12,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#a68a6b',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex:1002,
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
  sizeInfo: {
    color: '#5f6368',
    fontSize: isTablet ? 14 : 12,
    marginTop: 8,
    fontWeight: '500',
  },
  ccNote: {
    color: '#5f6368',
    fontSize: isTablet ? 12 : 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default ComposeWithAI;