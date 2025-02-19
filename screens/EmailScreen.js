import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const EmailScreen = ({ route }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [emails, setEmails] = useState([
    {
      to: 'example1@email.com',
      from: 'your@email.com',
      content: 'First generated email version...'
    },
    {
      to: 'example2@email.com',
      from: 'your@email.com',
      content: 'Second generated email version...'
    },
  ]);

  const generateNewEmail = () => ({
    to: `example${emails.length + 1}@email.com`,
    from: 'your@email.com',
    content: `Generated email version ${emails.length + 1}...`
  });

  const addNewEmail = () => {
    setEmails(prev => [...prev, generateNewEmail()]);
  };

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleSend = () => {
    console.log('Sending email:', emails[currentIndex]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.emailCard}>
        <View style={styles.fixedHeader}>
          <View style={styles.field}>
            <Text style={styles.label}>To:</Text>
            <Text style={styles.text}>{emails[currentIndex].to}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>From:</Text>
            <Text style={styles.text}>{emails[currentIndex].from}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>CC:</Text>
            <Text style={styles.text}>{emails[currentIndex].cc || 'N/A'}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {emails.map((email, index) => (
            <View key={index} style={styles.slideContent}>
              <View style={styles.contentCard}>
                <View style={styles.contentContainer}>
                  <Text style={styles.content}>{email.content}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.paginationContainer}>
            {emails.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentIndex === index && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.generateButton]}
              onPress={addNewEmail}
            >
              <Text style={styles.buttonText}>Generate New</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.sendButton]}
              onPress={handleSend}
            >
              <Text style={styles.buttonText}>Send Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#34C759',
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  slideContent: {
    width: SCREEN_WIDTH - 40,
    paddingHorizontal: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emailCard: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  fixedHeader: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  field: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    width: 50,
  },
  text: {
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#007AFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentWrapper: {
    flexDirection: 'row',
    flex: 1,
  },
  slideContent: {
    width: SCREEN_WIDTH - 40,
    paddingHorizontal: 10,
  },
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

export default EmailScreen; 