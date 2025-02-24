import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85;

// Define menu items outside the component
const MENU_ITEMS = [
  { section: 'main', icon: 'inbox', label: 'Inbox', badge: 3 },
  { section: 'main', icon: 'star-outline', label: 'Starred' },
  { section: 'main', icon: 'clock-outline', label: 'Snoozed' },
  { section: 'main', icon: 'send', label: 'Sent' },
  { section: 'main', icon: 'file-outline', label: 'Drafts', badge: 1 },
  { section: 'main', icon: 'archive-outline', label: 'All Mail' },
  { section: 'main', icon: 'alert-octagon-outline', label: 'Spam' },
  { section: 'main', icon: 'trash-can-outline', label: 'Trash' },
  { divider: true },
  { section: 'labels', label: 'Labels', isHeader: true },
  { section: 'labels', icon: 'plus', label: 'Create new' },
  { divider: true },
  { section: 'bottom', icon: 'cog-outline', label: 'Settings' },
  { section: 'bottom', icon: 'help-circle-outline', label: 'Help & Feedback' },
];

const DrawerMenu = ({ isOpen, onClose, userEmail = "Yash@gmail.com" }) => {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const renderMenuItem = (item, index) => {
    if (item.divider) {
      return <View key={`divider-${index}`} style={styles.divider} />;
    }

    if (item.isHeader) {
      return (
        <Text key={`header-${index}`} style={styles.sectionHeader}>
          {item.label}
        </Text>
      );
    }

    return (
      <TouchableOpacity
        key={`${item.label}-${index}`}
        style={styles.menuItem}
        onPress={() => {
          onClose();
          // Add any additional handling here
        }}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name={item.icon} 
            size={24}
            color="#000000"
          />
        </View>
        <Text style={styles.menuItemLabel}>
          {item.label}
        </Text>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.drawer,
        {
          transform: [{ translateX }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>MailSwap</Text>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userEmail.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>
      </View>
      
      <ScrollView style={styles.menuItems}>
        {MENU_ITEMS.map((item, index) => renderMenuItem(item, index))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    zIndex: 2,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    height: 100,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f1f3f4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerText: {
    fontSize: 24,
    color: '#202124',
    fontWeight: '600',
  },
  userInfo: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 16,
    color: '#5f6368',
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    height: 50,
    backgroundColor: 'transparent',
  },
  menuItemLabel: {
    marginLeft: 16,
    fontSize: 16,
    color: '#000000',
  },
  sectionHeader: {
    fontSize: 14,
    color: '#5f6368',
    paddingHorizontal: 24,
    paddingVertical: 12,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  divider: {
    height: 2,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  badge: {
    marginLeft: 'auto',
    backgroundColor: '#d93025',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DrawerMenu; 