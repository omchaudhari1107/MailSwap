export const dummyEmails = [
  {
    id: '1',
    from: 'LinkedIn',
    email: 'notifications@linkedin.com',
    subject: 'New job opportunities matching your profile',
    preview: 'Senior React Native Developer - 5 new jobs in your area that match your preferences...',
    timestamp: '11:30 AM',
    read: false,
    starred: true,
    avatar: 'L',
    avatarColor: '#0077B5'
  },
  {
    id: '2',
    from: 'GitHub',
    email: 'noreply@github.com',
    subject: 'Security alert for your repository',
    preview: 'We found a potential security vulnerability in one of your dependencies...',
    timestamp: '10:45 AM',
    read: false,
    starred: false,
    avatar: 'G',
    avatarColor: '#2b3137'
  },
  {
    id: '3',
    from: 'Amazon',
    email: 'order-update@amazon.com',
    subject: 'Your Amazon order has shipped!',
    preview: 'Track your package: Your order #123-456789 is on its way...',
    timestamp: '9:20 AM',
    read: true,
    starred: false,
    avatar: 'A',
    avatarColor: '#ff9900'
  },
  {
    id: '4',
    from: 'Netflix',
    email: 'info@netflix.com',
    subject: 'New on Netflix: Shows you might like',
    preview: 'Based on your watching history, we think you will love these new shows in mumbai...',
    timestamp: 'Yesterday',
    read: true,
    starred: true,
    avatar: 'N',
    avatarColor: '#E50914'
  },
  {
    id: '5',
    from: 'Spotify',
    email: 'no-reply@spotify.com',
    subject: 'Your weekly music mix is ready',
    preview: 'Discover Weekly: We have got some new music for you based on your taste...',
    timestamp: 'Yesterday',
    read: true,
    starred: false,
    avatar: 'S',
    avatarColor: '#1DB954'
  },
  {
    id: '6',
    from: 'Apple',
    email: 'no_reply@email.apple.com',
    subject: 'Your App Store receipt',
    preview: 'Your receipt from the App Store. Tap to view purchase details...',
    timestamp: 'Feb 19',
    read: true,
    starred: false,
    avatar: 'A',
    avatarColor: '#555555'
  },
  {
    id: '7',
    from: 'Twitter',
    email: 'info@twitter.com',
    subject: 'Popular in your network',
    preview: 'See what is trending among people you follow and join the conversation...',
    timestamp: 'Feb 18',
    read: true,
    starred: false,
    avatar: 'T',
    avatarColor: '#1DA1F2'
  },
  {
    id: '8',
    from: 'Slack',
    email: 'notifications@slack.com',
    subject: 'Daily digest: 15 new messages',
    preview: 'You have unread messages in #react-native, #general, and 3 other channels...',
    timestamp: 'Feb 18',
    read: false,
    starred: true,
    avatar: 'S',
    avatarColor: '#4A154B'
  },
  {
    id: '9',
    from: 'Medium',
    email: 'noreply@medium.com',
    subject: 'Stories selected for you',
    preview: '5 stories curated by Medium editors featuring topics you care about...',
    timestamp: 'Feb 17',
    read: true,
    starred: false,
    avatar: 'M',
    avatarColor: '#000000'
  },
  {
    id: '10',
    from: 'Google Cloud',
    email: 'cloud-noreply@google.com',
    subject: 'Your cloud usage report',
    preview: 'Your monthly Google Cloud Platform usage report is now available...',
    timestamp: 'Feb 17',
    read: true,
    starred: false,
    avatar: 'G',
    avatarColor: '#4285F4'
  },
  // Add more emails here...
  {
    id: '11',
    from: 'Coursera',
    email: 'no-reply@coursera.org',
    subject: 'Certificate of completion',
    preview: 'Congratulations! You have completed your course. Your certificate is ready...',
    timestamp: 'Feb 16',
    read: false,
    starred: true,
    avatar: 'C',
    avatarColor: '#0056D2'
  },
  {
    id: '12',
    from: 'Dropbox',
    email: 'no-reply@dropbox.com',
    subject: 'Someone shared a file with you',
    preview: 'John Doe shared "Project Proposal.pdf" with you. Click to view...',
    timestamp: 'Feb 16',
    read: true,
    starred: false,
    avatar: 'D',
    avatarColor: '#0061FF'
  }
]; 



// import React, { useState, useRef } from 'react';
// import {
//   SafeAreaView,
//   Text,
//   FlatList,
//   View,
//   TouchableOpacity,
//   StyleSheet,
//   StatusBar,
//   Pressable,
//   LayoutAnimation,
//   Platform,
//   UIManager,
//   Animated,
// } from 'react-native';
// import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// import { dummyEmails } from '../constants/dummyData';
// import { Searchbar } from 'react-native-paper';
// import Fuse from 'fuse.js';

// const AnimatedFlatList = FlatList;

// // Enable LayoutAnimation for Android
// if (Platform.OS === 'android') {
//   if (UIManager.setLayoutAnimationEnabledExperimental) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
//   }
// }

// export default function MainEmailScreen({ navigation }) {
//   const [selectedEmails, setSelectedEmails] = useState(() => new Set());
//   const [selectMode, setSelectMode] = useState(false);
//   const [isExpanded, setIsExpanded] = useState(true);
//   const lastOffset = useRef(0);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState([]);
//   const [isSearching, setIsSearching] = useState(false);

//   const scrollY = useRef(new Animated.Value(0)).current;

//   const buttonWidth = scrollY.interpolate({
//     inputRange: [0, 100],
//     outputRange: [160, 56], // Full width to circle
//     extrapolate: 'clamp',
//   });

//   const textWidth = scrollY.interpolate({
//     inputRange: [0, 100],
//     outputRange: [100, 0],
//     extrapolate: 'clamp',
//   });

//   // Enhanced Fuse.js configuration for deeper searching
//   const fuseOptions = {
//     keys: [
//       // Primary search fields
//       { name: 'subject', weight: 0.35 },
//       { name: 'from', weight: 0.25 },
//       { name: 'preview', weight: 0.15 },
      
//       // Deep search fields
//       { name: 'body', weight: 0.1 },
//       { name: 'sender.email', weight: 0.1 },
//       { name: 'sender.name', weight: 0.05 },
//       { name: 'recipients', weight: 0.025 },
//       { name: 'cc', weight: 0.025 },
//       { name: 'attachments.name', weight: 0.025 },
      
//       // Additional metadata
//       { name: 'labels', weight: 0.025 },
//       { name: 'timestamp', weight: 0.025 }
//     ],
//     threshold: 0.4, // Increased threshold for broader matches
//     distance: 100, // Increased distance for better fuzzy matching
//     includeScore: true,
//     includeMatches: true, // Include match information
//     minMatchCharLength: 2,
//     shouldSort: true,
//     findAllMatches: true,
//     location: 0,
//     ignoreLocation: true, // Ignore location for better partial matches
//     useExtendedSearch: true
//   };

//   const fuse = new Fuse(dummyEmails, fuseOptions);

//   const handleSearch = (query) => {
//     setSearchQuery(query);
//     setIsSearching(!!query);

//     if (!query.trim()) {
//       setSearchResults([]);
//       return;
//     }

//     // Enhanced search logic
//     try {
//       const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
//       // Perform the search with multiple terms support
//       let results = fuse.search(query)
//         .filter(result => {
//           // Check if all search terms are found somewhere in the email
//           return searchTerms.every(term => {
//             const email = result.item;
//             const searchableContent = [
//               email.subject,
//               email.from,
//               email.preview,
//               email.body,
//               email.sender?.email,
//               email.sender?.name,
//               ...(email.recipients || []),
//               ...(email.cc || []),
//               ...(email.attachments?.map(a => a.name) || []),
//               ...(email.labels || []),
//               email.timestamp
//             ].join(' ').toLowerCase();
            
//             return searchableContent.includes(term);
//           });
//         })
//         .map(result => ({
//           ...result.item,
//           searchScore: result.score,
//           matches: result.matches
//         }))
//         .sort((a, b) => {
//           // Custom sorting based on multiple factors
//           if (a.searchScore !== b.searchScore) {
//             return a.searchScore - b.searchScore; // Lower score is better
//           }
          
//           // Secondary sort by date if scores are equal
//           return new Date(b.timestamp) - new Date(a.timestamp);
//         })
//         .slice(0, 20); // Increased limit for more results

//       // Highlight matching terms in the results
//       results = results.map(email => ({
//         ...email,
//         highlightedPreview: highlightSearchTerms(email.preview, searchTerms),
//         highlightedSubject: highlightSearchTerms(email.subject, searchTerms)
//       }));

//       setSearchResults(results);
//     } catch (error) {
//       console.error('Search error:', error);
//       setSearchResults([]);
//     }
//   };

//   // Helper function to highlight matching terms
//   const highlightSearchTerms = (text, searchTerms) => {
//     if (!text) return '';
//     let highlightedText = text;
//     searchTerms.forEach(term => {
//       const regex = new RegExp(`(${term})`, 'gi');
//       highlightedText = highlightedText.replace(regex, '**$1**');
//     });
//     return highlightedText;
//   };

//   const toggleEmailSelection = (emailId) => {
//     if (!emailId) return;
//     const newSelected = new Set(selectedEmails);
//     if (selectedEmails.has(emailId)) {
//       newSelected.delete(emailId);
//     } else {
//       newSelected.add(emailId);
//     }
//     setSelectedEmails(newSelected);
//     setSelectMode(newSelected.size > 0);
//   };

//   const selectAll = () => {
//     if (!dummyEmails?.length) return;
//     if (selectedEmails.size === dummyEmails.length) {
//       setSelectedEmails(new Set());
//       setSelectMode(false);
//     } else {
//       setSelectedEmails(new Set(dummyEmails.map(email => email.id)));
//       setSelectMode(true);
//     }
//   };

//   const handleScroll = (event) => {
//     const currentOffset = event.nativeEvent.contentOffset.y;
//     const direction = currentOffset - lastOffset.current;
    
//     if (direction > 10 && isExpanded) {
//       LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//       setIsExpanded(false);
//     } else if (direction < -10 && !isExpanded) {
//       LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//       setIsExpanded(true);
//     }
    
//     lastOffset.current = currentOffset;
//   };

//   const renderSelectionHeader = () => (
//     <View style={styles.selectionHeader}>
//       <TouchableOpacity onPress={() => setSelectMode(false)} style={styles.backButton}>
//         <MaterialCommunityIcons name="arrow-left" size={24} color="#202124" />
//       </TouchableOpacity>
//       <Text style={styles.selectionCount}>{selectedEmails.size}</Text>
//       <View style={styles.actionButtons}>
//         <TouchableOpacity style={styles.actionButton}>
//           <MaterialCommunityIcons name="download" size={22} color="#202124" />
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.actionButton}>
//           <MaterialCommunityIcons name="delete-outline" size={22} color="#202124" />
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.actionButton}>
//           <MaterialCommunityIcons name="email-outline" size={22} color="#202124" />
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.actionButton}>
//           <MaterialCommunityIcons name="dots-vertical" size={22} color="#202124" />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const renderHeader = () => (
//     <View style={styles.headerContainer}>
//       <TouchableOpacity 
//         onPress={() => navigation?.openDrawer()} 
//         style={styles.menuButton}
//       >
//         <MaterialCommunityIcons name="menu" size={24} color="#5f6368" />
//       </TouchableOpacity>
//       <Searchbar
//         placeholder="Search in mail"
//         onChangeText={handleSearch}
//         value={searchQuery}
//         style={styles.searchBar}
//         inputStyle={styles.searchInput}
//         iconColor="#5f6368"
//         placeholderTextColor="#5f6368"
//         elevation={0}
//         onFocus={() => setIsSearching(true)}
//       />
//       <TouchableOpacity 
//         style={styles.profileButton}
//         onPress={() => navigation.navigate('Profile')}
//       >
//         <View style={styles.profileCircle}>
//           <Text style={styles.profileText}>Y</Text>
//         </View>
//       </TouchableOpacity>
//     </View>
//   );

//   const getAvatarBackground = (sender) => {
//     const colors = {
//       'The Forage Team': '#4285f4',
//       'Google Play': '#00C4B4',
//       'British Airways': '#738ADB',
//       'BCG': '#DB4437',
//       'Forage': '#0F9D58'
//     };
//     return colors[sender] || '#9E9E9E';
//   };

//   const renderEmailItem = ({ item }) => (
//     <Pressable 
//       style={[styles.emailItem, selectedEmails.has(item.id) && styles.selectedEmailItem]}
//       onPress={() => {
//         if (selectMode) {
//           toggleEmailSelection(item.id);
//         } else {
//           navigation.navigate('EmailDetail', {
//             email: item,
//             animation: 'slide',
//           });
//         }
//       }}
//       onLongPress={() => toggleEmailSelection(item.id)}
//       android_ripple={{ color: '#e8eaed' }}
//     >
//       <View style={styles.avatarContainer}>
//         {selectMode ? (
//           <View style={[styles.checkbox, selectedEmails.has(item.id) && styles.checkedCheckbox]}>
//             {selectedEmails.has(item.id) && (
//               <MaterialCommunityIcons name="check" size={18} color="#fff" />
//             )}
//           </View>
//         ) : (
//           <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
//             <Text style={styles.avatarText}>{item.avatar}</Text>
//           </View>
//         )}
//       </View>
//       <View style={styles.emailContent}>
//         <Text style={styles.senderName} numberOfLines={1}>
//           {isSearching ? highlightSearchTerms(item.from, searchQuery.split(' ')) : item.from}
//         </Text>
//         <Text style={styles.subjectText} numberOfLines={1}>
//           {isSearching ? item.highlightedSubject : item.subject}
//         </Text>
//         <Text style={styles.previewText} numberOfLines={1}>
//           {isSearching ? item.highlightedPreview : item.preview}
//         </Text>
//       </View>
//       <Text style={styles.dateText}>{item.timestamp}</Text>
//     </Pressable>
//   );

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#fff" />
//       {selectMode ? renderSelectionHeader() : renderHeader()}
//       {selectMode && (
//         <TouchableOpacity style={styles.selectAllContainer} onPress={selectAll}>
//           <View style={[
//             styles.checkbox,
//             selectedEmails.size === dummyEmails.length && styles.checkedCheckbox
//           ]}>
//             {selectedEmails.size === dummyEmails.length && (
//               <MaterialCommunityIcons name="check" size={18} color="#fff" />
//             )}
//           </View>
//           <Text style={styles.selectAllText}>Select all</Text>
//         </TouchableOpacity>
//       )}
//       <View style={styles.divider} />
//       {!isSearching && <Text style={styles.primaryText}>Primary</Text>}
//       {isSearching && searchQuery && searchResults.length === 0 ? (
//         <View style={styles.noResultsContainer}>
//           <MaterialCommunityIcons name="email-search-outline" size={48} color="#5f6368" />
//           <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
//         </View>
//       ) : (
//         <AnimatedFlatList
//           data={isSearching ? searchResults : dummyEmails}
//           renderItem={renderEmailItem}
//           keyExtractor={(item) => item?.id?.toString()}
//           showsVerticalScrollIndicator={false}
//           onScroll={Animated.event(
//             [{ nativeEvent: { contentOffset: { y: scrollY } } }],
//             { useNativeDriver: false }
//           )}
//           scrollEventThrottle={16}
//         />
//       )}
//       {!selectMode && (
//         <Animated.View
//           style={[
//             styles.composeButton,
//             {
//               width: buttonWidth,
//             },
//           ]}
//         >
//           <TouchableOpacity
//             onPress={() => navigation.navigate('Compose')}
//             style={styles.composeContent}
//           >
//             <MaterialCommunityIcons name="pencil" size={24} color="#202124" />
//             <Animated.View
//               style={{
//                 width: textWidth,
//                 overflow: 'hidden',
//               }}
//             >
//               <Text style={styles.composeText}>Write with AI</Text>
//             </Animated.View>
//           </TouchableOpacity>
//         </Animated.View>
//       )}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   headerContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 4,
//     paddingVertical: 8,
//   },
//   selectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 8,
//     paddingVertical: 8,
//     backgroundColor: '#fff',
//   },
//   backButton: {
//     padding: 12,
//   },
//   selectionCount: {
//     fontSize: 18,
//     color: '#202124',
//     marginLeft: 16,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     marginLeft: 'auto',
//   },
//   actionButton: {
//     padding: 12,
//   },
//   searchBar: {
//     flex: 1,
//     marginHorizontal: 8,
//     backgroundColor: '#f1f3f4',
//     borderRadius: 24,
//     height: 48,
//     elevation: 0,
//   },
//   searchInput: {
//     fontSize: 16,
//     fontFamily: 'Roboto',
//     color: '#202124',
//   },
//   profileButton: {
//     padding: 8,
//   },
//   profileCircle: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: '#673AB7',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   profileText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   selectAllContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//   },
//   checkbox: {
//     width: 20,
//     height: 20,
//     borderRadius: 2,
//     borderWidth: 2,
//     borderColor: '#5f6368',
//     marginRight: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   checkedCheckbox: {
//     backgroundColor: '#1a73e8',
//     borderColor: '#1a73e8',
//   },
//   selectAllText: {
//     fontSize: 16,
//     color: '#202124',
//     fontFamily: 'Roboto',
//   },
//   divider: {
//     height: 1,
//     backgroundColor: '#e8eaed',
//   },
//   primaryText: {
//     fontSize: 14,
//     color: '#202124',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     fontFamily: 'Roboto',
//   },
//   emailItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     backgroundColor: '#fff',
//   },
//   selectedEmailItem: {
//     backgroundColor: '#f2f8ff',
//   },
//   avatarContainer: {
//     marginRight: 16,
//   },
//   avatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   avatarText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '500',
//     fontFamily: 'Roboto',
//   },
//   emailContent: {
//     flex: 1,
//     marginRight: 8,
//   },
//   senderName: {
//     fontSize: 14,
//     color: '#202124',
//     fontWeight: '500',
//     fontFamily: 'Roboto',
//     flex: 1,
//     marginRight: 8,
//   },
//   dateText: {
//     fontSize: 12,
//     color: '#5f6368',
//     fontFamily: 'Roboto',
//   },
//   subjectText: {
//     fontSize: 14,
//     color: '#202124',
//     marginTop: 2,
//     fontFamily: 'Roboto',
//   },
//   previewText: {
//     fontSize: 14,
//     color: '#5f6368',
//     marginTop: 2,
//     fontFamily: 'Roboto',
//   },
//   composeButton: {
//     position: 'absolute',
//     right: 16,
//     bottom: 16,
//     backgroundColor: '#c2e7ff',
//     borderRadius: 28,
//     elevation: 4,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   composeContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     height: 56,
//     paddingHorizontal: 16,
//   },
//   composeText: {
//     fontSize: 15,
//     color: '#202124',
//     fontWeight: '500',
//     marginLeft: 12,
//   },
//   menuButton: {
//     padding: 12,
//   },
//   noResultsContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingTop: 100,
//   },
//   noResultsText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#5f6368',
//     fontFamily: 'Roboto',
//   },
//   highlightedText: {
//     backgroundColor: '#fff9c4',
//     fontWeight: '600',
//   },
// });