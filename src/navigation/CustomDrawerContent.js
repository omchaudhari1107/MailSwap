import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const drawerItems = [
  {
    icon: 'inbox',
    label: 'All inboxes',
    count: 3,
  },
  {
    icon: 'inbox',
    label: 'Primary',
    count: 2,
    color: '#4285f4',
  },
  {
    icon: 'tag',
    label: 'Promotions',
    count: 12,
    color: '#34a853',
  },
  {
    icon: 'account-group',
    label: 'Social',
    count: 5,
    color: '#fbbc04',
  },
  {
    divider: true,
  },
  {
    icon: 'star-outline',
    label: 'Starred',
  },
  {
    icon: 'clock-outline',
    label: 'Snoozed',
  },
  {
    icon: 'send-outline',
    label: 'Sent',
  },
  {
    icon: 'file-outline',
    label: 'Drafts',
    count: 4,
  },
  {
    divider: true,
  },
  {
    icon: 'alert-circle-outline',
    label: 'Spam',
    count: 1,
  },
  {
    icon: 'trash-can-outline',
    label: 'Trash',
  },
  {
    divider: true,
  },
  {
    icon: 'plus',
    label: 'Create new',
  },
  {
    icon: 'cog-outline',
    label: 'Settings',
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & feedback',
  },
];

export default function CustomDrawerContent({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerHeaderText}>Gmail</Text>
      </View>
      {drawerItems.map((item, index) => {
        if (item.divider) {
          return <View key={index} style={styles.drawerDivider} />;
        }
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.drawerItem,
              item.label === 'Primary' && styles.drawerItemActive,
            ]}
            onPress={() => {
              navigation.closeDrawer();
              // Add navigation logic here
            }}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={item.color || '#5f6368'}
              style={styles.drawerIcon}
            />
            <Text style={styles.drawerLabel}>{item.label}</Text>
            {item.count && (
              <Text style={styles.drawerCount}>{item.count}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  drawerHeaderText: {
    fontSize: 20,
    color: '#202124',
    fontWeight: '500',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 8,
    borderRadius: 28,
  },
  drawerItemActive: {
    backgroundColor: '#e8f0fe',
  },
  drawerIcon: {
    marginRight: 16,
  },
  drawerLabel: {
    flex: 1,
    fontSize: 14,
    color: '#202124',
  },
  drawerCount: {
    fontSize: 12,
    color: '#5f6368',
    marginLeft: 8,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
    marginHorizontal: 16,
  },
}); 