import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
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
  const [isLoading, setIsLoading] = useState(true); // State for splash screen

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '798624486063-vm81209jpdbncait5o4nis8ifup2cjmq.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/gmail.modify'],
      offlineAccess: true,
    });

    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        // Check if Google Sign-In has a previous session
        const isSignedIn = await GoogleSignin.hasPreviousSignIn();
        if (isSignedIn) {
          // Get current user from Google Sign-In
          const currentUser = await GoogleSignin.getCurrentUser();
          if (currentUser) {
            // Reset navigation stack and go to HomeTabs
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'HomeTabs',
                  params: {
                    user: currentUser.user,
                  },
                },
              ],
            });
          } else {
            setIsLoading(false); // Show login screen if no user found
          }
        } else {
          setIsLoading(false); // Show login screen if not signed in
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setIsLoading(false); // Show login screen even if there's an error
      }
    };

    checkAuthStatus();
  }, [navigation]);

  // Auto slide functionality
  useEffect(() => {
    if (!isLoading) { // Only start slider when not loading
      const slideInterval = setInterval(() => {
        if (activeSlide < slides.length - 1) {
          scrollViewRef.current?.scrollTo({
            x: (activeSlide + 1) * (width - 48),
            animated: true,
          });
          setActiveSlide(activeSlide + 1);
        } else {
          scrollViewRef.current?.scrollTo({
            x: 0,
            animated: true,
          });
          setActiveSlide(0);
        }
      }, 1500); // Change slide every 1.5 seconds

      return () => clearInterval(slideInterval); // Cleanup interval on unmount
    }
  }, [activeSlide, isLoading]);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const credential = GoogleAuthProvider.credential(tokens.idToken);
      const userCredential = await signInWithCredential(auth, credential);

      // Navigate to HomeTabs with reset
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'HomeTabs',
            params: {
              user: userCredential.user,
            },
          },
        ],
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

  // Splash Screen UI
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogoContainer}>
          <MaterialCommunityIcons 
            name="email-fast-outline" 
            size={60} 
            color="#FFFFFF" 
          />
        </View>
        <Text style={styles.splashTitle}>Mail Swap</Text>
        <ActivityIndicator size="large" color="#27160a" style={styles.splashLoader} />
      </View>
    );
  }

  // Login Screen UI
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
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#fef9f3', // Same background as main UI
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#8b5014', // Same accent color
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#27160a', // Same text color
    marginTop: 20,
    textAlign: 'center',
  },
  splashLoader: {
    marginTop: 30,
  },

  // Main UI Styles
  container: {
    flex: 1,
    backgroundColor: '#fef9f3',
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
    backgroundColor: '#8b5014',
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
    color: '#27160a',
    marginBottom: 16,
    textAlign: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffdbc1',
    borderRadius: 15,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 7,
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
    color: '#27160a',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
  sliderContainer: {
    height: 400,
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
    color: '#27160a',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default GoogleAuth;