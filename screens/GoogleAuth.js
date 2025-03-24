import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Get screen dimensions dynamically
const { width, height } = Dimensions.get('window');

// Slide data
const slides = [
  {
    id: 1,
    title: 'Mail with AI',
    color: '#4285F4',
    icon: 'robot',
    description: 'Experience smart email composition powered by AI',
  },
  {
    id: 2,
    title: 'Official Connection',
    color: '#EA4335',
    icon: 'gmail',
    description: 'Seamlessly connect with your Gmail account',
  },
  {
    id: 3,
    title: 'Seamless Communication',
    color: '#34A853',
    icon: 'message-text-outline',
    description: 'Connect and communicate effortlessly',
  },
  {
    id: 4,
    title: 'AI Generated Mail',
    color: '#FBBC05',
    icon: 'email-edit-outline',
    description: 'Let AI help you craft the perfect email',
  },
];

const GoogleAuth = () => {
  const [user, setUser] = useState(null);
  const navigation = useNavigation();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '798624486063-vm81209jpdbncait5o4nis8ifup2cjmq.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/gmail.modify'],
      offlineAccess: true,
    });

    const checkAuthStatus = async () => {
      try {
        const isSignedIn = await GoogleSignin.hasPreviousSignIn();
        if (isSignedIn) {
          const currentUser = await GoogleSignin.getCurrentUser();
          if (currentUser) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'HomeTabs', params: { user: currentUser.user } }],
            });
          } else {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [navigation]);

  useEffect(() => {
    if (!isLoading) {
      const slideInterval = setInterval(() => {
        if (activeSlide < slides.length - 1) {
          scrollViewRef.current?.scrollTo({
            x: (activeSlide + 1) * (width * 0.9), // 90% of screen width
            animated: true,
          });
          setActiveSlide(activeSlide + 1);
        } else {
          scrollViewRef.current?.scrollTo({ x: 0, animated: true });
          setActiveSlide(0);
        }
      }, 1500);
      return () => clearInterval(slideInterval);
    }
  }, [activeSlide, isLoading]);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const credential = GoogleAuthProvider.credential(tokens.idToken);
      const userCredential = await signInWithCredential(auth, credential);

      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs', params: { user: userCredential.user } }],
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

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogoContainer}>
          <MaterialCommunityIcons name="email-fast-outline" size={width * 0.15} color="#FFFFFF" />
        </View>
        <Text style={styles.splashTitle}>Mail Swap</Text>
        <ActivityIndicator size="large" color="#27160a" style={styles.splashLoader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="email-fast-outline" size={width * 0.12} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Mail Swap</Text>

        <View style={styles.sliderContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={({ nativeEvent }) => {
              const slide = Math.ceil(nativeEvent.contentOffset.x / (width * 0.9));
              if (slide !== activeSlide) setActiveSlide(slide);
            }}
            scrollEventThrottle={16}
          >
            {slides.map((slide) => (
              <View key={slide.id} style={styles.slide}>
                <MaterialCommunityIcons name={slide.icon} size={width * 0.1} color={slide.color} />
                <Text style={[styles.slideTitle, { color: slide.color }]}>{slide.title}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.googleButton} onPress={signIn}>
          <Image
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png',
            }}
            style={styles.googleIcon}
          />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and{' '}
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
    backgroundColor: '#fef9f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogoContainer: {
    width: width * 0.3,
    height: width * 0.3,
    backgroundColor: '#8b5014',
    borderRadius: width * 0.075,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  splashTitle: {
    fontSize: width * 0.09,
    fontWeight: '700',
    color: '#27160a',
    marginTop: height * 0.03,
    textAlign: 'center',
  },
  splashLoader: {
    marginTop: height * 0.05,
  },

  // Main UI Styles
  container: {
    flex: 1,
    backgroundColor: '#fef9f3',
    paddingTop: height * 0.07,
    paddingBottom: height * 0.05,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width * 0.06,
  },
  logoContainer: {
    width: width * 0.25,
    height: width * 0.25,
    // background Ascendant: true,
    backgroundColor: '#8b5014',
    borderRadius: width * 0.06,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.05,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: '700',
    color: '#27160a',
    marginBottom: height * 0.02,
    textAlign: 'center',
  },
  sliderContainer: {
    flex: 1,
    maxHeight: height * 0.5,
  },
  slide: {
    width: width * 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    padding: width * 0.05,
  },
  slideTitle: {
    fontSize: width * 0.06,
    fontWeight: '700',
    marginTop: height * 0.02,
    marginBottom: height * 0.01,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: width * 0.04,
    color: '#27160a',
    textAlign: 'center',
    lineHeight: width * 0.06,
  },
  bottomContainer: {
    paddingHorizontal: width * 0.06,
    paddingBottom: height * 0.02,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffdbc1',
    borderRadius: width * 0.04,
    padding: width * 0.04,
    marginBottom: height * 0.03,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 7,
  },
  googleIcon: {
    width: width * 0.06,
    height: width * 0.06,
    marginRight: width * 0.03,
  },
  buttonText: {
    color: '#1A1A1A',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
  termsText: {
    fontSize: width * 0.035,
    color: '#27160a',
    textAlign: 'center',
    lineHeight: width *  
   
0.05,
  },
  linkText: {
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
});

export default GoogleAuth;