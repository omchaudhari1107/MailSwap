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
  Linking,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import logo from '../assets/logo.png';
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
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      offlineAccess: true,
    });

    const checkAuthStatus = () => {
      try {
        const isSignedIn = GoogleSignin.hasPreviousSignIn();
        if (isSignedIn) {
          const currentUser = GoogleSignin.getCurrentUser();
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
        if (activeSlide < slides.length) {
          scrollViewRef.current?.scrollTo({
            x: (activeSlide) * (width * 0.9),
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
          <Image
            source={logo}
            style={{
              width: width * 0.3,
              // height: width * 0.15,
              resizeMode: 'contain'
            }}
          />
        </View>
        <Text style={styles.splashTitle}>EazyMail</Text>
        <ActivityIndicator size="large" color="#27160a" style={styles.splashLoader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={logo}
            style={{
              width: width * 0.3,
              height: width * 0.5,
              resizeMode: 'contain'
            }}
          />
        </View>
        <Text style={styles.title} >EazyMail</Text>

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
          By continuing, you agree to our{' '}
          <Text
            style={styles.linkText}
            onPress={() => Linking.openURL('https://mailswap09.github.io/terms.html')}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            style={styles.linkText}
            onPress={() => Linking.openURL('https://mailswap09.github.io/privacy.html')}>
            Privacy Policy
          </Text>
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
    width: width * 0.37,
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
    width: width * .37,
    height: width * .3,
    backgroundColor: '#8b5014',
    borderRadius: width * 0.06,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.05,
    elevation: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#8b5014',
    fontFamily: 'Quicksand',
    marginBottom: 20,
    textAlign: 'center',
  },
  roundText: {
    fontSize: 24,
    letterSpacing: 1, // Slight spacing improves roundness
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sliderContainer: {
    flex: 1,
    maxHeight: height * 0.5,
  },
  slide: {
    display: 'flex',
    width: width * 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    padding: width * 0.05,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 16,
    color: '#27160a',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: width * 0.06,
    paddingBottom: height * 0.02,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5014',
    borderRadius: width * 0.04,
    padding: height * 0.02,
    width: width * 0.9,
    marginBottom: height * 0.025,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 10,
  },
  googleIcon: {
    width: width * 0.06,
    height: width * 0.06,
    marginRight: width * 0.03,
  },
  buttonText: {
    color: '#ffdbc1',
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
});

export default GoogleAuth;