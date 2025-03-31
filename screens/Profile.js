import React, { use, useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';

const ProfileSection = ({ icon, title, value }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionIcon}>
      <Ionicons name={icon} size={24} color="#1a73e8" />
    </View>
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionValue}>{value}</Text>
    </View>
  </View>
);

const Profile = ({ navigation, route }) => {
  const [user, setUser] = useState(route.params?.user || null);
  
  const handleSignOut = async () => {
    try {
      await GoogleSignin.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'GoogleAuth' }],
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Fetching profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user.photo || user.photoURL }}
            style={styles.profileImage}
          />
        </View>
        
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        <ProfileSection
          icon="person-outline"
          title="Display Name"
          value={user.name || user.displayName}
        />
        <ProfileSection
          icon="mail-outline"
          title="Email"
          value={user.email}
        />
        {/* <ProfileSection
          icon="calendar-outline"
          title="Account Created"
          value={new Date(user.metadata.creationTime).toLocaleDateString()}
        /> */}
      </View>

      {/* <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <ProfileSection
          icon="notifications-outline"
          title="Notifications"
          value="Enabled"
        />
        <ProfileSection
          icon="moon-outline"
          title="Dark Mode"
          value="System Default"
        />
        <ProfileSection
          icon="language-outline"
          title="Language"
          value="English"
        />
      </View> */}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={24} color="#fff" style={styles.signOutIcon} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef9f3',
  },
  header: {
    backgroundColor: '#fef9f3',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  profileHeader: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 100,
    borderWidth: 6,
    borderColor: '#8b5014',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#1a73e8',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#202124',
  },
  email: {
    fontSize: 16,
    color: '#5f6368',
    marginBottom: 15,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  editButtonText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fae5d3',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#211a15',
    marginBottom: 16,
  },
  sectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#211a15',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef9f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    color: '#202124',
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#8b5014',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation:
      5,
  },
  signOutIcon: {
    marginRight: 8,
    color: '#ffdbc1',
  },
  signOutText: {
    color: '#ffdbc1',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 16,
  },
  version: {
    color: '#5f6368',
    fontSize: 14,
  },
});

export default Profile;