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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Together from "together-ai";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const together = new Together({ apiKey: '2cda797bb6a09cd4367dbf7b6b66077fccb989130376cbb5b1bd634040c1e3e9' });

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? height * 0.08 : height * 0.06;
const isTablet = width > 768;

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const ComposeWithAI = ({ navigation, route }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [displayedEmail, setDisplayedEmail] = useState('');
  const [showGenerateButton, setShowGenerateButton] = useState(true);
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [selectedLength, setSelectedLength] = useState('Medium');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isEmailEditable, setIsEmailEditable] = useState(false);
  const [toError, setToError] = useState('');
  const [promptError, setPromptError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const generatedEmailRef = useRef(null);
  const user = route.params?.user || {};
  const tones = ['Professional', 'Casual', 'Formal', 'Brief'];
  const lengths = ['Short', 'Medium', 'Long'];

  useEffect(() => {
    if (generatedEmail && !displayedEmail) {
      setIsTyping(true);
      setIsGenerating(false);
      typeWriterEffect(generatedEmail);
    }
  }, [generatedEmail]);

  const typeWriterEffect = (text) => {
    let i = 0;
    const speed = 30;
    
    const type = () => {
      if (i < text.length) {
        setDisplayedEmail(text.substring(0, i + 1));
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
    setPromptError('');

    let hasError = false;
    if (!to.trim()) {
      setToError('Recipient email is required.');
      hasError = true;
    } else if (!isValidEmail(to.trim())) {
      setToError('Please enter a valid email address (e.g., example@domain.com).');
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

      For **professional emails**, use greetings like "Respected Sir/Madam" and closings like "Yours sincerely, [User's Name]" or "Yours faithfully, [User's Name]."  
      For **casual emails**, use greetings like "Dear friend" or "Sir" and closings like "Yours truly, [User's Name]" or "Lovingly, [User's Name]."  
      
      Format the response as follows without enclosing the subject or content in quotes:  
      Subject: [subject line]  
      
      [main content with appropriate line breaks if needed]  
      [Proper greeting at the start]  
      [Email body]  
      [Proper closing as per the tone, followed by the user's name]  
      
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

  const sendEmail = async () => {
    setToError('');

    if (!to.trim()) {
      setToError('Recipient email is required.');
      return;
    }
    if (!isValidEmail(to.trim())) {
      setToError('Please enter a valid email address (e.g., example@domain.com).');
      return;
    }

    Alert.alert(
      'Confirm Send',
      'Are you sure you want to send this email? AI might make mistakes, so please verify the content once.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: async () => {
            setIsSending(true);
            try {
              const accessToken = await getGoogleToken();

              const email = {
                to: to,
                from: user.email || from,
                subject: subject,
                message: generatedEmail,
              };

              const boundary = 'boundary_' + Math.random().toString(36).substring(2);
              let emailBody = '';
              if (attachedFiles.length === 0) {
                emailBody = [
                  `To: ${email.to}`,
                  `From: ${email.from}`,
                  `Subject: ${email.subject}`,
                  `Content-Type: text/plain; charset=UTF-8`,
                  '',
                  ...email.message.split('\n').map(line => line.trim()),
                ].join('\r\n');
              } else {
                emailBody = [
                  `To: ${email.to}`,
                  `From: ${email.from}`,
                  `Subject: ${email.subject}`,
                  `MIME-Version: 1.0`,
                  `Content-Type: multipart/mixed; boundary="${boundary}"`,
                  '',
                  `--${boundary}`,
                  `Content-Type: text/plain; charset=UTF-8`,
                  '',
                  ...email.message.split('\n').map(line => line.trim()),
                ];

                for (const file of attachedFiles) {
                  if (file.size > 20 * 1024 * 1024) {
                    throw new Error(`File "${file.name}" is too large to attach (max 20MB).`);
                  }

                  const fileContent = await fetch(file.uri).then(res => res.blob());
                  const base64Content = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(fileContent);
                  });

                  emailBody.push(
                    `--${boundary}`,
                    `Content-Type: ${file.mimeType || 'application/octet-stream'}`,
                    `Content-Disposition: attachment; filename="${file.name}"`,
                    `Content-Transfer-Encoding: base64`,
                    '',
                    base64Content
                  );
                }

                emailBody.push(`--${boundary}--`);
                emailBody = emailBody.join('\r\n');
              }

              const rawEmail = btoa(emailBody)
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
                  body: JSON.stringify({
                    raw: rawEmail,
                  }),
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

        if (newFiles.length > 0) {
          setAttachedFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
      }
    } catch (err) {
      console.error('Document picking error:', err);
    }
  };

  const removeFile = (indexToRemove) => {
    setAttachedFiles(prevFiles => 
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
            placeholder="Your email"
            placeholderTextColor="#5f6368"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>To</Text>
          <TextInput
            style={styles.input}
            value={to}
            onChangeText={(text) => {
              setTo(text);
              setToError('');
            }}
            placeholder="Recipient's email"
            placeholderTextColor="#5f6368"
          />
          {toError ? <Text style={styles.errorText}>{toError}</Text> : null}
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

              {attachedFiles.length > 0 && (
                <View style={styles.attachedFilesContainer}>
                  {attachedFiles.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      {renderFilePreview(file)}
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
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
          <ActivityIndicator size="large" color="#8b5014" />
          <Text style={styles.loadingText}>Sending Email...</Text>
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
    height: HEADER_HEIGHT,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Increased opacity from 0.5 to 0.7 for stronger effect
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)', // Added blur effect
    WebkitBackdropFilter: 'blur(5px)', // Added for Safari compatibility
  },
  loadingText: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: isTablet ? 18 : 16,
    fontWeight: '500',
  },
});

export default ComposeWithAI;