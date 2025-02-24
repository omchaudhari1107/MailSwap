// import React from 'react';
// import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
// import { Text, Avatar } from 'react-native-paper';
// import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// import { COLORS } from '../constants/theme';

// export default function EmailCard({ 
//   email, 
//   onPress, 
//   onLongPress, 
//   selected,
//   showCheckbox 
// }) {
//   const getRandomColor = () => {
//     const colors = Object.values(COLORS.avatar);
//     return colors[Math.floor(Math.random() * colors.length)];
//   };

//   return (
//     <Pressable 
//       onPress={onPress}
//       onLongPress={onLongPress}
//       delayLongPress={500}
//       style={[styles.container, selected && styles.selectedContainer]}
//     >
//       {showCheckbox ? (
//         <View style={styles.selectButton}>
//           <MaterialCommunityIcons 
//             name={selected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
//             size={20} 
//             color={selected ? COLORS.primary : COLORS.secondaryText} 
//           />
//         </View>
//       ) : (
//         <View style={styles.selectButton} />
//       )}
      
//       <Avatar.Text 
//         size={36} 
//         label={email.avatar}
//         style={[styles.avatar, { backgroundColor: email.avatarColor }]}
//       />
      
//       <View style={styles.content}>
//         <View style={styles.topRow}>
//           <Text style={[styles.from, !email.read && styles.unread]} numberOfLines={1}>
//             {email.from}
//           </Text>
//           <View style={styles.rightContent}>
//             <Text style={styles.timestamp}>{email.timestamp}</Text>
//           </View>
//         </View>
//         <Text style={[styles.subject, !email.read && styles.unread]} numberOfLines={1}>
//           {email.subject}
//         </Text>
//         <View style={styles.previewContainer}>
//           <Text style={styles.preview} numberOfLines={1}>
//             {email.preview}
//           </Text>
//           <TouchableOpacity style={styles.starButton}>
//             <MaterialCommunityIcons 
//               name={email.starred ? "star" : "star-outline"}
//               size={20} 
//               color={email.starred ? "#f4b400" : "#9AA0A6"}
//               style={styles.starIcon}
//             />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Pressable>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flexDirection: 'row',
//     paddingVertical: 8,
//     paddingRight: 16,
//     backgroundColor: COLORS.background,
//     alignItems: 'center',
//   },
//   selectedContainer: {
//     backgroundColor: '#e8f0fe',
//   },
//   selectButton: {
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   avatar: {
//     marginRight: 16,
//   },
//   content: {
//     flex: 1,
//   },
//   topRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   from: {
//     fontSize: 14,
//     color: '#5F6368',
//     flex: 1,
//     marginRight: 8,
//   },
//   unread: {
//     color: '#202124',
//     fontWeight: '600',
//   },
//   rightContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   timestamp: {
//     fontSize: 12,
//     color: '#5F6368',
//     marginLeft: 8,
//   },
//   subject: {
//     fontSize: 14,
//     color: '#5F6368',
//     marginBottom: 4,
//   },
//   previewContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   preview: {
//     fontSize: 14,
//     color: '#5F6368',
//     flex: 1,
//     marginRight: 8,
//   },
//   starButton: {
//     padding: 8,
//     marginRight: -8,
//   },
//   starIcon: {
//     marginLeft: 'auto',
//   }
// }); 



import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  Text,
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { dummyEmails } from '../constants/dummyData';

const AnimatedFlatList = FlatList;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function MainEmailScreen({ navigation }) {
  const [selectedEmails, setSelectedEmails] = useState(() => new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastOffset = useRef(0);

  const scrollY = useRef(new Animated.Value(0)).current;

  const buttonWidth = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [160, 56], // Full width to circle
    extrapolate: 'clamp',
  });

  const textWidth = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [100, 0],
    extrapolate: 'clamp',
  });

  const toggleEmailSelection = (emailId) => {
    if (!emailId) return;
    const newSelected = new Set(selectedEmails);
    if (selectedEmails.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    setSelectMode(newSelected.size > 0);
  };

  const selectAll = () => {
    if (!dummyEmails?.length) return;
    if (selectedEmails.size === dummyEmails.length) {
      setSelectedEmails(new Set());
      setSelectMode(false);
    } else {
      setSelectedEmails(new Set(dummyEmails.map(email => email.id)));
      setSelectMode(true);
    }
  };

  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset - lastOffset.current;
    
    if (direction > 10 && isExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(false);
    } else if (direction < -10 && !isExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(true);
    }
    
    lastOffset.current = currentOffset;
  };

  const renderSelectionHeader = () => (
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={() => setSelectMode(false)} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#202124" />
      </TouchableOpacity>
      <Text style={styles.selectionCount}>{selectedEmails.size}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="download" size={22} color="#202124" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#202124" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="email-outline" size={22} color="#202124" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color="#202124" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        onPress={() => navigation?.openDrawer()} 
        style={styles.menuButton}
      >
        <MaterialCommunityIcons name="menu" size={24} color="#5f6368" />
      </TouchableOpacity>
      <Pressable style={styles.searchBarContainer} onPress={() => navigation.navigate('Search')}>
        <Text style={styles.searchBarPlaceholder}>Search in emails</Text>
      </Pressable>
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <View style={styles.profileCircle}>
          <Text style={styles.profileText}>Y</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const getAvatarBackground = (sender) => {
    const colors = {
      'The Forage Team': '#4285f4',
      'Google Play': '#00C4B4',
      'British Airways': '#738ADB',
      'BCG': '#DB4437',
      'Forage': '#0F9D58'
    };
    return colors[sender] || '#9E9E9E';
  };

  const renderEmailItem = ({ item }) => (
    <Pressable 
      style={[styles.emailItem, selectedEmails.has(item.id) && styles.selectedEmailItem]}
      onPress={() => selectMode ? toggleEmailSelection(item.id) : navigation.navigate('EmailDetail', { email: item })}
      onLongPress={() => toggleEmailSelection(item.id)}
    >
      <View style={styles.avatarContainer}>
        {selectMode ? (
          <View style={[styles.checkbox, selectedEmails.has(item.id) && styles.checkedCheckbox]}>
            {selectedEmails.has(item.id) && (
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
            )}
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            <Text style={styles.avatarText}>{item.avatar}</Text>
          </View>
        )}
      </View>
      <View style={styles.emailContent}>
        <Text style={styles.senderName} numberOfLines={1}>{item.from}</Text>
        <Text style={styles.subjectText} numberOfLines={1}>{item.subject}</Text>
        <Text style={styles.previewText} numberOfLines={1}>{item.preview}</Text>
      </View>
      <Text style={styles.dateText}>{item.timestamp}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {selectMode ? renderSelectionHeader() : renderHeader()}
      {selectMode && (
        <TouchableOpacity style={styles.selectAllContainer} onPress={selectAll}>
          <View style={[
            styles.checkbox,
            selectedEmails.size === dummyEmails.length && styles.checkedCheckbox
          ]}>
            {selectedEmails.size === dummyEmails.length && (
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
            )}
          </View>
          <Text style={styles.selectAllText}>Select all</Text>
        </TouchableOpacity>
      )}
      <View style={styles.divider} />
      <Text style={styles.primaryText}>Primary</Text>
      <AnimatedFlatList
        data={dummyEmails}
        renderItem={renderEmailItem}
        keyExtractor={(item) => item?.id?.toString()}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />
      {!selectMode && (
        <Animated.View
          style={[
            styles.composeButton,
            {
              width: buttonWidth,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('Compose')}
            style={styles.composeContent}
          >
            <MaterialCommunityIcons name="pencil" size={24} color="#202124" />
            <Animated.View
              style={{
                width: textWidth,
                overflow: 'hidden',
              }}
            >
              <Text style={styles.composeText}>Write with AI</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 12,
  },
  selectionCount: {
    fontSize: 18,
    color: '#202124',
    marginLeft: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 12,
  },
  searchBarContainer: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
  searchBarPlaceholder: {
    color: '#5f6368',
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  profileButton: {
    padding: 8,
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#673AB7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#5f6368',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  selectAllText: {
    fontSize: 16,
    color: '#202124',
    fontFamily: 'Roboto',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eaed',
  },
  primaryText: {
    fontSize: 14,
    color: '#202124',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Roboto',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  selectedEmailItem: {
    backgroundColor: '#f2f8ff',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  emailContent: {
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 14,
    color: '#202124',
    fontWeight: '500',
    fontFamily: 'Roboto',
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#5f6368',
    fontFamily: 'Roboto',
  },
  subjectText: {
    fontSize: 14,
    color: '#202124',
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  previewText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  composeButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#c2e7ff',
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  composeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  composeText: {
    fontSize: 15,
    color: '#202124',
    fontWeight: '500',
    marginLeft: 12,
  },
  menuButton: {
    padding: 12,
  },
});