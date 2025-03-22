import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Mail with AI',
    color: '#4285F4',
    icon: 'robot',
    description: 'Experience smart email composition powered by AI'
  },
  {
    id: 2,
    title: 'Official Connection',
    color: '#EA4335',
    icon: 'gmail',
    description: 'Seamlessly connect with your Gmail account'
  },
  {
    id: 3,
    title: 'Seamless Communication',
    color: '#34A853',
    icon: 'message-text-outline',
    description: 'Connect and communicate effortlessly'
  },
  {
    id: 4,
    title: 'AI Generated Mail',
    color: '#FBBC05',
    icon: 'email-edit-outline',
    description: 'Let AI help you craft the perfect email'
  },
];

const GoogleAuth = () => {
  const [user, setUser] = useState(null);
  const navigation = useNavigation();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '798624486063-vm81209jpdbncait5o4nis8ifup2cjmq.apps.googleusercontent.com',
      scopes: [
        // 'https://www.googleapis.com/auth/userinfo.email',
        // 'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',  // Add Gmail scope
      ],
      offlineAccess: true,
    });

    // Add check for existing user
    const checkCurrentUser = () => {
      try {
        const isSignedIn = GoogleSignin.hasPreviousSignIn();
        if (isSignedIn) {
          const currentUser = GoogleSignin.getCurrentUser();
          if (currentUser) {
            navigation.navigate('HomeTabs', {
                user: currentUser.user
            });
          }
        }
      } catch (error) {
        console.error('Error checking current user:', error);
      }
    };

    checkCurrentUser();
  }, [navigation]);

  // Auto slide functionality
  useEffect(() => {
    const slideInterval = setInterval(() => {
      if (activeSlide < slides.length - 1) {
        scrollViewRef.current?.scrollTo({
          x: (activeSlide + 1) * (width - 48),
          animated: true
        });
        setActiveSlide(activeSlide + 1);
      } else {
        scrollViewRef.current?.scrollTo({
          x: 0,
          animated: true
        });
        setActiveSlide(0);
      }
    }, 1500); // Change slide every 3 seconds

    return () => clearInterval(slideInterval);
  }, [activeSlide]);

  // const fetchEmails = async (accessToken) => {
  //   try {
  //     const response = await fetch(
  //       'https://gmail.googleapis.com/gmail/v1/users/me/messages',
  //       {
  //         headers: {
  //           Authorization: `Bearer ${accessToken}`,
  //         },
  //       }
  //     );
  //     const data = await response.json();
      
  //     // Fetch detailed information for each email
  //     const emailPromises = data.messages.map(async (message) => {
  //       const detailResponse = await fetch(
  //         `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${accessToken}`,
  //           },
  //         }
  //       );
  //       return detailResponse.json();
  //     });

  //     const emailDetails = await Promise.all(emailPromises);
  //     // console.log(emailDetails["payload"]);
  //     const formattedEmails = emailDetails.map((email) => ({
  //       id: email.id,
  //       sender: email.payload.headers.find(h => h.name === 'From')?.value || 'Unknown',
  //       subject: email.payload.headers.find(h => h.name === 'Subject')?.value || '(no subject)',
  //       preview: email.snippet || '',
  //       time: new Date(parseInt(email.internalDate)).toLocaleTimeString(),
  //       isStarred: email.labelIds?.includes('STARRED') || false,
  //       isRead: !email.labelIds?.includes('UNREAD'),
  //       avatar: email.payload.headers.find(h => h.name === 'From')?.value.charAt(0) || '?',
  //       color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
  //     }));
  //     // console.log('Total Emails:', emailDetails.length);
  //     // emailDetails.forEach((email, index) => {
  //     //   console.log(`LOG Email ${index + 1}:`, JSON.stringify(email, null, 2));
  //     // });
  //     return formattedEmails;
  //   } catch (error) {
  //     console.error('Error fetching emails:', error);
  //     return [];
  //   }
  // };

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const credential = GoogleAuthProvider.credential(tokens.idToken);
      const userCredential = await signInWithCredential(auth, credential);
      
      // Fetch emails after successful sign-in
      // const emailData = await fetchEmails(tokens.accessToken);
      // console.log(emailData)
      // Navigate to HomeTabs with both user and email data
      navigation.navigate('HomeTabs', {
        user: userCredential.user,
        // emails: emailData
      });
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress');
      } else {
        console.error('Google Sign-In Error:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons 
            name="email-fast-outline" 
            size={50} 
            color="#FFFFFF" 
          />
        </View>
        <Text style={styles.title}>Mail Swap</Text>
        
        {/* Slider Section */}
        <View style={styles.sliderContainer}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={({nativeEvent}) => {
              const slide = Math.ceil(nativeEvent.contentOffset.x / (width - 48));
              if(slide !== activeSlide) {
                setActiveSlide(slide);
              }
            }}
            scrollEventThrottle={16}
          >
            {slides.map((slide, index) => (
              <View key={slide.id} style={styles.slide}>
                <MaterialCommunityIcons 
                  name={slide.icon} 
                  size={40} 
                  color={slide.color} 
                />
                <Text style={[styles.slideTitle, { color: slide.color }]}>
                  {slide.title}
                </Text>
                <Text style={styles.slideDescription}>
                  {slide.description}
                </Text>
              </View>
            ))}
          </ScrollView>
          
          {/* Dots Indicator */}
          {/* <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  { backgroundColor: index === activeSlide ? '#4285F4' : '#ccc' }
                ]}
              />
            ))}
          </View> */}
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.googleButton} onPress={signIn}>
          <Image 
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png'
            }}
            style={styles.googleIcon}
          />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText}>Terms of Service</Text> and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#4285F4',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    paddingHorizontal: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  buttonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
  sliderContainer: {
    height: 400,
    // marginBottom: 10,
  },
  slide: {
    width: width - 48, // Accounting for padding
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default GoogleAuth;