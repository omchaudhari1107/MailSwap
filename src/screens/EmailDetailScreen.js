import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const EmailDetailScreen = ({ navigation, route }) => {
  const email = route.params?.email || {};
  const [isStarred, setIsStarred] = useState(email.isStarred || false);

  const handleArchive = () => {
    Alert.alert(
      "Archive",
      "Archive this email?",
      [
        { text: "Cancel" },
        { 
          text: "Archive",
          onPress: () => {
            // Add your archive logic here
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete",
      "Delete this email?",
      [
        { text: "Cancel" },
        { 
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Add your delete logic here
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleMarkUnread = () => {
    // Add your mark as unread logic here
    navigation.goBack();
  };

  const toggleStar = () => {
    setIsStarred(!isStarred);
    // Add your star persistence logic here
  };

  const handleReply = () => {
    navigation.navigate('Compose', { 
      replyTo: email,
      subject: `Re: ${email.subject}`,
      to: email.from,
      body: `\n\nOn ${email.timestamp}, ${email.from} wrote:\n> ${email.preview}`
    });
  };

  const handleForward = () => {
    navigation.navigate('Compose', {
      forward: email,
      subject: `Fwd: ${email.subject}`,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${email.from}\nDate: ${email.timestamp}\nSubject: ${email.subject}\n\n${email.preview}`
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleArchive}>
            <MaterialIcons name="archive" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <MaterialIcons name="delete" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkUnread}>
            <MaterialIcons name="mail" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subject}>{email.subject}</Text>
        
        <View style={styles.senderInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {email.from?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.senderDetails}>
            <Text style={styles.senderName}>{email.from}</Text>
            <Text style={styles.senderEmail}>{email.email}</Text>
            <Text style={styles.timestamp}>{email.timestamp}</Text>
          </View>
          <TouchableOpacity style={styles.starButton} onPress={toggleStar}>
            <MaterialIcons 
              name={isStarred ? "star" : "star-border"} 
              size={24} 
              color={isStarred ? "#FFD700" : "#666"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.recipients}>
          <Text style={styles.recipientsText}>To: me</Text>
        </View>

        <Text style={styles.emailBody}>{email.preview}</Text>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.replyButton}
          onPress={handleReply}
        >
          <MaterialIcons name="reply" size={24} color="#666" />
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.forwardButton}
          onPress={handleForward}
        >
          <MaterialIcons name="forward" size={24} color="#666" />
          <Text style={styles.forwardText}>Forward</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subject: {
    fontSize: 22,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 16,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  senderDetails: {
    flex: 1,
    marginLeft: 12,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
  },
  senderEmail: {
    fontSize: 14,
    color: '#5f6368',
  },
  timestamp: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  starButton: {
    padding: 8,
  },
  recipients: {
    marginBottom: 16,
  },
  recipientsText: {
    fontSize: 14,
    color: '#5f6368',
  },
  emailBody: {
    fontSize: 16,
    color: '#202124',
    lineHeight: 24,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  forwardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  replyText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  forwardText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
});

export default EmailDetailScreen; 