import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Profile from './Profile';

const DUMMY_EMAILS = [
  {
    id: '1',
    sender: 'John Doe',
    subject: 'Weekly Meeting Notes',
    preview: 'Here are the meeting notes from yesterdays discussion...',
    time: '10:30 AM',
    isStarred: false,
    isRead: false,
    avatar: 'J',
    color: '#1a73e8',
  },
  {
    id: '2',
    sender: 'Amazon',
    subject: 'Your Order has been shipped',
    preview: 'Your package is on its way! Expected delivery...',
    time: '9:15 AM',
    isStarred: true,
    isRead: true,
    avatar: 'A',
    color: '#ea4335',
  },
  {
    id: '3',
    sender: 'LinkedIn',
    subject: 'New job opportunities for you',
    preview: 'Based on your profile, we found these jobs...',
    time: 'Yesterday',
    isStarred: false,
    isRead: true,
    avatar: 'L',
    color: '#0077b5',
  },
  {
    id: '4',
    sender: 'GitHub',
    subject: 'Security alert: New sign-in',
    preview: 'We noticed a new sign-in to your account...',
    time: 'Yesterday',
    isStarred: true,
    isRead: false,
    avatar: 'G',
    color: '#2b3137',
  },
  {
    id: '5',
    sender: 'Netflix',
    subject: 'New on Netflix: Shows you might like',
    preview: 'Check out these new releases based on...',
    time: 'Wed',
    isStarred: false,
    isRead: true,
    avatar: 'N',
    color: '#e50914',
  },
];


const EmailItem = ({ email }) => (
  <TouchableOpacity style={[styles.emailItem, !email.isRead && styles.unreadEmail]}>
    <View style={[styles.senderIcon, { backgroundColor: email.color }]}>
      <Text style={styles.senderInitial}>{email.avatar}</Text>
    </View>
    <View style={styles.emailContent}>
      <Text style={[styles.senderName, !email.isRead && styles.unreadText]} numberOfLines={1}>
        {email.sender}
      </Text>
      <View style={styles.subjectContainer}>
        <Text style={[styles.subject, !email.isRead && styles.unreadText]} numberOfLines={1}>
          {email.subject}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          - {email.preview}
        </Text>
      </View>
    </View>
    <View style={styles.emailRight}>
      <Text style={styles.time}>{email.time}</Text>
      {email.isStarred && (
        <Ionicons name="star" size={20} color="#f4b400" />
      )}
    </View>
  </TouchableOpacity>
);

const MailBox = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.header}>
        
        <TouchableOpacity style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#5f6368" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in mail"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#5f6368"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#5f6368" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
       
      </View>


      <FlatList
        data={DUMMY_EMAILS}
        renderItem={({ item }) => <EmailItem email={item} />}
        keyExtractor={item => item.id}
      />

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="sparkles" size={24} color="white" style={styles.aiIcon} />
        <Text style={styles.fabText}>Compose with AI</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    backgroundColor: '#fff',
    elevation: 2,
  },
  menuButton: {
    padding: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 24,
    marginHorizontal: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#202124',
  },
  profileButton: {
    padding: 10,
  },
  categoriesContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
  },
  activeCategoryChip: {
    backgroundColor: '#e8f0fe',
  },
  categoryText: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#1a73e8',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  senderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  senderInitial: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emailContent: {
    flex: 1,
    marginRight: 16,
  },
  senderName: {
    fontSize: 14,
    marginBottom: 4,
    color: '#202124',
  },
  subjectContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  subject: {
    fontSize: 14,
    color: '#5f6368',
  },
  preview: {
    fontSize: 14,
    color: '#5f6368',
    flex: 1,
  },
  emailRight: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: '#5f6368',
    marginBottom: 4,
  },
  unreadEmail: {
    backgroundColor: '#f2f6fc',
  },
  unreadText: {
    color: '#202124',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1a73e8',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  aiIcon: {
    marginRight: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MailBox; 