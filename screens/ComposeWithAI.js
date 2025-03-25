import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const HEADER_HEIGHT = Platform.OS === 'ios' ? height * 0.08 : height * 0.06;
const isTablet = width > 768;

const ComposeWithAI = ({ navigation, route }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedEmails, setGeneratedEmails] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGenerateButton, setShowGenerateButton] = useState(true);
  const flatListRef = useRef(null);
  
  const user = route.params?.user || {};

  const generateEmails = () => {
    const mockEmails = [
      `Dear ${to.split('@')[0]},\n\nI hope this email finds you well. Regarding "${subject}", ${prompt}\n\nBest regards,\n${from}`,
      `Hi ${to.split('@')[0]},\n\nI’m writing about "${subject}". ${prompt} Let me know your thoughts!\n\nCheers,\n${from}`,
      `Hello ${to.split('@')[0]},\n\nOn the topic of "${subject}", ${prompt} Looking forward to your reply.\n\nSincerely,\n${from}`,
      `Hey ${to.split('@')[0]},\n\nQuick note on "${subject}": ${prompt} Talk soon!\n\nRegards,\n${from}`,
    ];
    setGeneratedEmails(mockEmails);
    setActiveIndex(0);
    setShowGenerateButton(false);
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: 0, animated: false });
    }
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / CARD_WIDTH);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < generatedEmails.length) {
      setActiveIndex(newIndex);
    }
  };

  const renderEmailCard = ({ item }) => (
    <View style={styles.emailCard}>
      <Text style={styles.emailContent}>{item}</Text>
    </View>
  );

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
            value={from}
            onChangeText={setFrom}
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

        {showGenerateButton && (
          <TouchableOpacity style={styles.generateButton} onPress={generateEmails}>
            <Ionicons name="sparkles" size={isTablet ? 28 : 24} color="#291609" style={styles.aiicon} />
            <Text style={styles.generateButtonText}>Generate Emails</Text>
          </TouchableOpacity>
        )}

        {generatedEmails.length > 0 && (
          <View style={styles.sliderContainer}>
            <FlatList
              ref={flatListRef}
              data={generatedEmails}
              renderItem={renderEmailCard}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + width * 0.04} // Added spacing between cards
              snapToAlignment="center"
              decelerationRate={0.8} // Smoother deceleration
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.sliderContent}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              bounces={false} // Prevents bouncing effect
            />
            <View style={styles.pagination}>
              {generatedEmails.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: index === activeIndex ? '#8b5014' : '#d3d3d3' },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.sendButton}>
              <Ionicons name="send" size={isTablet ? 24 : 20} color="#291609" />
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: height * 0.03,
    minHeight: height,
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
  promptInput: {
    height: isTablet ? 150 : 100,
    textAlignVertical: 'top',
  },
  generateButton: {
    backgroundColor: '#ffdbc1',
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
    marginTop: height * 0.02,
    width: isTablet ? '60%' : '80%',
    alignSelf: 'center',
  },
  generateButtonText: {
    color: '#291609',
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
  },
  sliderContainer: {
    marginTop: height * 0.03,
    width: '100%',
  },
  emailCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: isTablet ? 20 : 16,
    marginHorizontal: width * 0.02, // Added horizontal margin for spacing
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emailContent: {
    fontSize: isTablet ? 16 : 14,
    color: '#202124',
    lineHeight: isTablet ? 24 : 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffdbc1',
    borderRadius: 8,
    paddingVertical: isTablet ? 14 : 12,
    marginTop: height * 0.02,
    marginHorizontal: width * 0.04,
  },
  sendButtonText: {
    color: '#291609',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sliderContent: {
    paddingHorizontal: width * 0.02,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: height * 0.02,
  },
  dot: {
    width: isTablet ? 10 : 8,
    height: isTablet ? 10 : 8,
    borderRadius: isTablet ? 5 : 4,
    marginHorizontal: width * 0.01,
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
});

export default ComposeWithAI;