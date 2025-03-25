import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated as RNAnimated,
  ActivityIndicator,
} from 'react-native';
import { TextInput, IconButton, Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  withRepeat,
  FadeInUp,
  FadeOutDown,
} from 'react-native-reanimated';
import Voice from '@react-native-voice/voice';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const USER_EMAIL = 'Yash@gmail.com';

export default function ComposeScreen({ navigation }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState([]);
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({
    to: '',
    subject: '',
    content: '',
  });
  const [isSending, setIsSending] = useState(false);
  const micScale = useSharedValue(1);
  const micOpacity = useSharedValue(1);

  const scrollRef = useRef(null);
  const buttonScale = useSharedValue(1);
  const generateButtonOpacity = useSharedValue(0);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate email
  const validateEmail = (email) => {
    if (!email) {
      return 'Recipient email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Handle recipient change with validation
  const handleRecipientChange = (text) => {
    setTo(text);
    const emailError = validateEmail(text);
    setErrors(prev => ({ ...prev, to: emailError }));
  };

  // Validate form before sending
  const validateForm = () => {
    const newErrors = {
      to: validateEmail(to),
      subject: !subject ? 'Subject is required' : '',
      content: !emailContent ? 'Email content is required' : '',
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  // Handle send email
  const handleSend = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSending(true);
    try {
      // Your email sending logic here
      console.log('Sending email...');
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success
      navigation.goBack();
    } catch (error) {
      console.error('Send email error:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Failed to send email. Please try again.',
      }));
    } finally {
      setIsSending(false);
    }
  };

  // Remove the useMemo for animated style and directly define it
  const generateButtonStyle = useAnimatedStyle(() => ({
    opacity: generateButtonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    const voiceSetup = async () => {
      try {
        await Voice.destroy();
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechResults = onSpeechResults;
      } catch (e) {
        console.error('Voice setup error:', e);
      }
    };
    voiceSetup();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStart = () => setIsRecording(true);
  const onSpeechEnd = () => setIsRecording(false);
  const onSpeechResults = (e) => {
    if (e.value && e.value[0]) {
      setPrompt(e.value[0]);
      generateButtonOpacity.value = withTiming(1);
    }
  };

  const handleAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: false,
      });
      
      if (result.assets) {
        setAttachments([...attachments, ...result.assets]);
      }
    } catch (err) {
      console.log('Document picker error:', err);
    }
  };

  const startRecording = async () => {
    try {
      await Voice.start('en-US');
      setIsRecording(true);
      micScale.value = withRepeat(
        withSpring(1.2, { duration: 1000 }),
        -1,
        true
      );
      micOpacity.value = withRepeat(
        withTiming(0.5, { duration: 1000 }),
        -1,
        true
      );
    } catch (e) {
      console.error(e);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
      micScale.value = withSpring(1);
      micOpacity.value = withSpring(1);
    } catch (e) {
      console.error(e);
    }
  };

  const generateDrafts = () => {
    const tones = [
      'Professional',
      'Lengthy Professional',
      'Concise Creative',
      'Knowledge-Based'
    ];

    const dummyDrafts = tones.map(tone => ({
      id: Math.random().toString(),
      tone,
      subject: `Response to: ${prompt}`,
      content: `This is a ${tone.toLowerCase()} email draft based on your prompt: "${prompt}"`,
    }));

    setGeneratedDrafts(dummyDrafts);
    setShowEmailForm(false);
  };

  const selectDraft = (draft) => {
    setSelectedDraft(draft);
    setSubject(draft.subject);
    setEmailContent(draft.content);
    setShowEmailForm(true);
    setGeneratedDrafts([]);
  };

  const renderEmailForm = () => (
    <View style={styles.emailForm}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>To:</Text>
        <TextInput
          value={to}
          onChangeText={handleRecipientChange}
          style={[styles.input, errors.to && styles.inputError]}
          mode="flat"
          underlineColor={errors.to ? '#B00020' : '#E0E0E0'}
          placeholder="Recipients"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {errors.to ? (
        <Text style={styles.errorText}>{errors.to}</Text>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>From:</Text>
        <Text style={styles.fromEmail}>{USER_EMAIL}</Text>
      </View>

      {selectedDraft && (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject:</Text>
            <TextInput
              value={subject}
              onChangeText={(text) => {
                setSubject(text);
                setErrors(prev => ({ ...prev, subject: '' }));
              }}
              style={[styles.input, errors.subject && styles.inputError]}
              mode="flat"
              underlineColor={errors.subject ? '#B00020' : '#E0E0E0'}
            />
          </View>
          {errors.subject ? (
            <Text style={styles.errorText}>{errors.subject}</Text>
          ) : null}

          <TextInput
            value={emailContent}
            onChangeText={(text) => {
              setEmailContent(text);
              setErrors(prev => ({ ...prev, content: '' }));
            }}
            placeholder="Write your email here..."
            style={[styles.emailInput, errors.content && styles.inputError]}
            multiline
            mode="flat"
            underlineColor="transparent"
          />
          {errors.content ? (
            <Text style={styles.errorText}>{errors.content}</Text>
          ) : null}
        </>
      )}
    </View>
  );

  // Update the prompt change handler
  const handlePromptChange = (text) => {
    setPrompt(text);
    if (text.length > 0 && generateButtonOpacity.value === 0) {
      generateButtonOpacity.value = withTiming(1);
    } else if (text.length === 0 && generateButtonOpacity.value === 1) {
      generateButtonOpacity.value = withTiming(0);
    }
  };

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
    opacity: micOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Compose</Text>
        <View style={styles.headerRight}>
          {selectedDraft && (
            <IconButton
              icon="attachment"
              size={24}
              onPress={handleAttachment}
              color="#1a73e8"
            />
          )}
          <IconButton
            icon="send"
            size={24}
            onPress={handleSend}
            color="#1a73e8"
            disabled={isSending}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {showEmailForm && renderEmailForm()}

        {attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {attachments.map((file, index) => (
              <View key={index} style={styles.attachmentChip}>
                <Text numberOfLines={1} style={styles.attachmentName}>
                  {file.name}
                </Text>
                <IconButton
                  icon="close"
                  size={18}
                  onPress={() => {
                    const newAttachments = [...attachments];
                    newAttachments.splice(index, 1);
                    setAttachments(newAttachments);
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {!selectedDraft && (
          <View style={styles.promptSection}>
            <View style={styles.promptContainer}>
              <TextInput
                value={prompt}
                onChangeText={handlePromptChange}
                placeholder="Enter your prompt for AI generation..."
                style={styles.promptInput}
                multiline
                numberOfLines={3}
                mode="outlined"
              />
              <Animated.View style={[styles.voiceButtonContainer, micAnimatedStyle]}>
                <TouchableOpacity
                  onPress={isRecording ? stopRecording : startRecording}
                  style={[
                    styles.voiceButton,
                    isRecording && styles.voiceButtonRecording,
                  ]}
                >
                  <MaterialIcons
                    name={isRecording ? 'mic' : 'mic-none'}
                    size={24}
                    color="#1a73e8"
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {prompt.length > 0 && (
              <Animated.View 
                entering={FadeInUp}
                exiting={FadeOutDown}
                style={styles.generateButtonContainer}
              >
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={generateDrafts}
                >
                  <Animated.View style={generateButtonStyle}>
                    <MaterialCommunityIcons 
                      name="rocket-launch-outline"
                      size={24} 
                      color="#FFFFFF" 
                      style={styles.generateIcon}
                    />
                  </Animated.View>
                  <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        )}

        {generatedDrafts.length > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.cardsContainer}
          >
            {generatedDrafts.map((draft) => (
              <TouchableOpacity
                key={draft.id}
                style={styles.draftCard}
                onPress={() => selectDraft(draft)}
              >
                <Text style={styles.cardTone}>{draft.tone}</Text>
                <ScrollView style={styles.cardContent}>
                  <Text style={styles.cardSubject}>
                    {draft.subject}
                  </Text>
                  <Text style={styles.cardBody}>{draft.content}</Text>
                </ScrollView>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {isSending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1a73e8" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 40 : 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 20,
    color: '#202124',
  },
  content: {
    flex: 1,
  },
  emailForm: {
    padding: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: 48,
    paddingVertical: 8,
  },
  fieldLabel: {
    width: 60,
    fontSize: 15,
    color: '#5F6368',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 40,
    fontSize: 16,
  },
  fromEmail: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
  },
  promptSection: {
    padding: 16,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  promptInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  voiceButtonRecording: {
    backgroundColor: '#E8F0FE',
    borderColor: '#1a73e8',
  },
  generateButtonContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardsContainer: {
    height: 300,
    marginTop: 16,
  },
  draftCard: {
    width: CARD_WIDTH,
    height: 280,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardTone: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a73e8',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    textAlign: 'center',
    backgroundColor: '#F8F9FA',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardSubject: {
    fontSize: 17,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 12,
    lineHeight: 24,
  },
  cardBody: {
    fontSize: 15,
    color: '#5F6368',
    lineHeight: 22,
  },
  emailInput: {
    backgroundColor: 'transparent',
    minHeight: 200,
    textAlignVertical: 'top',
    fontSize: 16,
    paddingTop: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingLeft: 12,
    maxWidth: 200,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: '#202124',
    paddingRight: 4,
  },
  voiceButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: {
    borderColor: '#B00020',
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginLeft: 60,
    marginTop: 4,
    marginBottom: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateIcon: {
    marginRight: 8,
  },
}); 