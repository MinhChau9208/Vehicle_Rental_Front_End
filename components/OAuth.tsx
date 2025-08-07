import { View, Image } from "react-native";
import CustomButton from "./CustomButton";
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { icons } from "@/constants";
import { router } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from "@/components/AppContext";
import { showToast } from "@/components/ToastAlert";
import { useState } from "react";

const OAuth = () => {
  const { fetchUserAndConnect } = useAppContext();
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    const redirectUrl = Linking.createURL('auth');
    const authUrl = `https://vehicle.kietpep1303.com/api/auth/google?redirect_uri=${redirectUrl}`;

    console.log(redirectUrl);
    console.log(authUrl);

    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success') {
        const url = new URL(result.url);
        console.log(url);
        // Extract tokens from the redirect URL's query parameters
        const accessToken = url.searchParams.get('accessToken');
        const refreshToken = url.searchParams.get('refreshToken');
        const deviceId = url.searchParams.get('deviceId');


        if (accessToken && refreshToken && deviceId) {
          // Store tokens in AsyncStorage, similar to the standard login
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', refreshToken);
          await AsyncStorage.setItem('deviceId', deviceId);

          // Update app context with user data and navigate to home
          await fetchUserAndConnect();
          router.replace('/(root)/(tabs)/home');
          showToast('success', 'Login successful', 'Welcome!');
        } else {
          showToast('error', 'Login failed', 'Could not retrieve authentication tokens from Google.');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        showToast('info', 'Login cancelled', 'The Google sign-in process was cancelled.');
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      showToast('error', 'Authentication failed', 'An unexpected error occurred during Google sign-in.');
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  return (
    <View>
      <CustomButton
        title="Log In with Google"
        className="mt-5 w-full shadow-none"
        IconLeft={() => (
          <Image source={icons.google} resizeMode="contain" className="w-5 h-5 mx-2" />
        )}
        bgVariant="outline"
        textVariant="primary"
        onPress={handleGoogleSignIn}
        disabled={isAuthenticating}
      />
    </View>
  )
};

export default OAuth;