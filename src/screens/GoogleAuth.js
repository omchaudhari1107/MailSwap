import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  ActivityIndicator 
} from "react-native";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = "765790071927-i3ba43fvqrquhgpbkbmg9qhfuhlpc2do.apps.googleusercontent.com";
// const REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true }); // Ensures Expo handles the redirect correctly
const REDIRECT_URI = 'https://auth.expo.io/@gpsync/emailscrap';
export default function GoogleAuth({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scopes: ['email', 'profile'],
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      fetchEmails(authentication.accessToken);
    }
  }, [response]);

  async function signInWithGoogle() {
    setIsLoading(true);
    setError(null);
    
    try {
      await promptAsync();
    } catch (error) {
      setError("Failed to sign in. Please try again.");
      console.error("❌ Google Sign-In Error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchEmails(token) {
    try {
      // First, fetch user profile for avatar
      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const userData = await userResponse.json();

      // Fetch email list
      const response = await fetch(
        "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
  
      const data = await response.json();
      
      if (!data.messages) {
        throw new Error("No emails found");
      }

      // Fetch detailed information for each email
      const emailDetails = await Promise.all(
        data.messages.map(async (message) => {
          const detailResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          return detailResponse.json();
        })
      );

      const formattedEmails = emailDetails.map((email) => {
        const headers = email.payload.headers;
        const subject = headers.find(h => h.name === "Subject")?.value || "No Subject";
        const from = headers.find(h => h.name === "From")?.value || "Unknown";
        const date = headers.find(h => h.name === "Date")?.value;
        
        // Get email body
        let body = "";
        if (email.payload.parts) {
          const textPart = email.payload.parts.find(part => part.mimeType === "text/plain");
          if (textPart && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString();
          }
        }

        return {
          id: email.id,
          subject,
          from: from.split('<')[0].trim(),
          sender: {
            name: from.split('<')[0].trim(),
            email: from.match(/<(.+)>/)?.[1] || ""
          },
          preview: email.snippet,
          body,
          timestamp: new Date(date).toLocaleDateString(),
          avatar: from.charAt(0).toUpperCase(),
          avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          read: !(email.labelIds || []).includes('UNREAD'),
          labels: email.labelIds || []
        };
      });

      // Navigate to MainEmailScreen with emails and user data
      navigation.replace('MainEmailScreen', { 
        emails: formattedEmails, 
        accessToken: token,
        userProfile: userData
      });

    } catch (error) {
      setError("Failed to fetch emails. Please try again.");
      console.error("❌ Error fetching emails:", error);
    }
  }

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to Gmail</Text>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity 
        style={styles.googleButton}
        onPress={signInWithGoogle}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.googleIcon}
            />
            <Text style={styles.buttonText}>Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#202124',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#d93025',
    marginBottom: 20,
    textAlign: 'center',
  }
});
