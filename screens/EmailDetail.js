import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const EmailDetail = ({ route, navigation }) => {
  const { email, onDelete, onToggleStar } = route.params;
  const [isStarred, setIsStarred] = useState(email.isStarred);
  const [showFullHeader, setShowFullHeader] = useState(false);

  // Animation value for header
  const scrollY = new Animated.Value(0);
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 60],
    extrapolate: 'clamp',
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Email",
      "Are you sure you want to delete this email?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete && onDelete(email.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      "Archive Email",
      "Archive this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Archive",
          onPress: () => {
            // Handle archive functionality
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${email.subject}\n\nFrom: ${email.sender}\n\n${email.preview}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share email');
    }
  };

  const handleToggleStar = () => {
    setIsStarred(!isStarred);
    onToggleStar && onToggleStar(email.id);
  };

  const handleReply = () => {
    // Implement reply functionality
    Alert.alert('Reply', 'Reply functionality coming soon');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleArchive}>
              <Ionicons name="archive-outline" size={24} color="#5f6368" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#5f6368" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#5f6368" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={24} color="#5f6368" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Email Content */}
      <ScrollView 
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <Text style={styles.subject}>{email.subject}</Text>
        
        <TouchableOpacity 
          style={styles.senderInfo}
          onPress={() => setShowFullHeader(!showFullHeader)}
        >
          <View style={[styles.avatar, { backgroundColor: email.color }]}>
            <Text style={styles.avatarText}>{email.avatar}</Text>
          </View>
          <View style={styles.senderDetails}>
            <Text style={styles.senderName}>{email.sender}</Text>
            <Text style={styles.time}>
              {email.time}
              <Text style={styles.toMe}> to me</Text>
              <Ionicons 
                name={showFullHeader ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#5f6368" 
              />
            </Text>
          </View>
          <TouchableOpacity style={styles.starButton} onPress={handleToggleStar}>
            <Ionicons 
              name={isStarred ? "star" : "star-outline"} 
              size={24} 
              color={isStarred ? "#f4b400" : "#5f6368"} 
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {showFullHeader && (
          <View style={styles.fullHeader}>
            <Text style={styles.headerLabel}>From: {email.sender}</Text>
            <Text style={styles.headerLabel}>To: me</Text>
            <Text style={styles.headerLabel}>Date: {email.time}</Text>
          </View>
        )}

        <Text style={styles.emailBody}>{email.preview}</Text>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.replyButton} onPress={handleReply}>
          <Text style={styles.replyText}>Reply</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
        
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
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
    marginBottom: 16,
    color: '#202124',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
  },
  time: {
    color: '#5f6368',
    fontSize: 14,
    marginTop: 2,
  },
  toMe: {
    color: '#5f6368',
    marginLeft: 4,
  },
  starButton: {
    padding: 8,
  },
  fullHeader: {
    backgroundColor: '#f1f3f4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 4,
  },
  emailBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#202124',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  replyButton: {
    backgroundColor: '#1a73e8',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  replyText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  forwardButton: {
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
});

export default EmailDetail; 