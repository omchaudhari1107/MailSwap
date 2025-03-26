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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? height * 0.08 : height * 0.06;
const isTablet = width > 768;

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
  const generatedEmailRef = useRef(null);
  
  const user = route.params?.user || {};

  const tones = ['Professional', 'Casual', 'Formal', 'Brief'];
  const lengths = ['Short', 'Medium', 'Long'];

  useEffect(() => {
    if (generatedEmail && !displayedEmail) {
      setIsTyping(true);
      typeWriterEffect(generatedEmail);
    }
  }, [generatedEmail]);

  const typeWriterEffect = (text) => {
    let i = 0;
    const speed = 30;
    
    const type = () => {
      if (i < text.length) {
        setDisplayedEmail(text.substring(0, i + 1));
        setGeneratedEmail(text.substring(0, i + 1));
        i++;
        setTimeout(type, speed);
      } else {
        setIsTyping(false);
      }
    };
    
    type();
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        setAttachedFiles(prevFiles => [...prevFiles, ...result.assets]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
      console.error(err);
    }
  };

  const removeFile = (indexToRemove) => {
    setAttachedFiles(prevFiles => 
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const generateEmail = () => {
    let emailContent = '';
    let generatedSubject = '';
    const recipient = to.split('@')[0] || 'Recipient';

    switch (selectedTone) {
      case 'Professional':
        generatedSubject = `Regarding ${prompt}`;
        if (selectedLength === 'Short') {
          emailContent = `Dear ${recipient},\n\nRegarding "${prompt}", please let me know your availability.\n\nBest,\n${from}`;
        } else if (selectedLength === 'Medium') {
          emailContent = `Dear ${recipient},\n\nI hope this email finds you well. Regarding "${prompt}", I would like to discuss further details at your convenience.\n\nBest regards,\n${from}`;
        } else {
          emailContent = `Dear ${recipient},\n\nI hope this email finds you in good spirits. I am reaching out regarding "${prompt}". I believe it would be beneficial for us to discuss this matter in detail, and I would greatly appreciate the opportunity to coordinate with you at your earliest convenience. Please let me know what works best for your schedule.\n\nBest regards,\n${from}`;
        }
        break;
      case 'Casual':
        generatedSubject = `${prompt} - Quick Chat`;
        if (selectedLength === 'Short') {
          emailContent = `Hi ${recipient},\n\nAbout "${prompt}"—wanna chat?\n\nCheers,\n${from}`;
        } else if (selectedLength === 'Medium') {
          emailContent = `Hi ${recipient},\n\nI’m writing about "${prompt}". Let’s catch up soon—thoughts?\n\nCheers,\n${from}`;
        } else {
          emailContent = `Hey ${recipient},\n\nJust dropping you a note about "${prompt}". I’d love to catch up and chat about it whenever you’ve got a moment. Let me know what works for you—looking forward to it!\n\nCheers,\n${from}`;
        }
        break;
      case 'Formal':
        generatedSubject = `Subject: ${prompt}`;
        if (selectedLength === 'Short') {
          emailContent = `Dear ${recipient},\n\nRe: "${prompt}", I seek your input.\n\nSincerely,\n${from}`;
        } else if (selectedLength === 'Medium') {
          emailContent = `Hello ${recipient},\n\nOn the topic of "${prompt}", I am writing to seek your input and coordinate next steps. Looking forward to your reply.\n\nSincerely,\n${from}`;
        } else {
          emailContent = `Dear ${recipient},\n\nI trust this message finds you well. I am writing to you with regard to "${prompt}". It is my intention to seek your valuable input and to establish the necessary next steps for proceeding forward. I would be most grateful if you could provide your availability for a detailed discussion at your earliest convenience.\n\nSincerely,\n${from}`;
        }
        break;
      case 'Brief':
        generatedSubject = `${prompt}`;
        if (selectedLength === 'Short') {
          emailContent = `Hey ${recipient},\n\n"${prompt}"—talk soon?\n\n${from}`;
        } else if (selectedLength === 'Medium') {
          emailContent = `Hey ${recipient},\n\nQuick note on "${prompt}": let’s talk soon!\n\nRegards,\n${from}`;
        } else {
          emailContent = `Hey ${recipient},\n\nJust a quick heads-up about "${prompt}". I’d like to touch base with you soon to go over it—nothing urgent, just want to make sure we’re on the same page. Let me know when you’re free!\n\nRegards,\n${from}`;
        }
        break;
    }

    setSubject(generatedSubject);
    setGeneratedEmail(emailContent);
    setDisplayedEmail('');
    setShowGenerateButton(false);
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
        <TouchableOpacity 
          style={styles.profileHeader} 
          onPress={() => navigation.navigate('Profile', { user })}
        >
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
            onChangeText={setTo}
            placeholder="Recipient's email"
            placeholderTextColor="#5f6368"
          />
        </View>

        {!generatedEmail && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Prompt</Text>
              <TextInput
                style={[styles.input, styles.promptInput]}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="e.g., Request a meeting next week"
                placeholderTextColor="#5f6368"
                multiline
              />
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
          <TouchableOpacity style={styles.generateButton} onPress={generateEmail}>
            <Ionicons name="sparkles" size={isTablet ? 28 : 24} color="#ffdbc1" style={styles.aiicon} />
            <Text style={styles.generateButtonText}>Generate Email Content</Text>
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
            <TextInput
              ref={generatedEmailRef}
              style={[styles.generated, styles.generatedInput]}
              value={displayedEmail}
              onChangeText={handleEmailChange}
              multiline
              textAlignVertical="top"
              editable={true}
            />
            
            <View style={styles.attachmentContainer}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={pickDocument}
              >
                <Ionicons name="attach" size={isTablet ? 24 : 20} color="#291609" />
                <Text style={styles.attachButtonText}>Add Attachment</Text>
              </TouchableOpacity>

              {attachedFiles.length > 0 && (
                <View style={styles.attachedFilesContainer}>
                  {attachedFiles.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
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
          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="send" size={isTablet ? 24 : 20} color="#ffdbc1" />
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
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
  fileName: {
    flex: 1,
    color: '#202124',
    fontSize: isTablet ? 16 : 14,
    marginRight: 8,
  },
  removeFileButton: {
    padding: 4,
  },
});

export default ComposeWithAI;