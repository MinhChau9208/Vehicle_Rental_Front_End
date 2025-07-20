import { Platform, ScrollView, StatusBar, Text, View, Image } from 'react-native';
import { icons } from '@/constants';
import InputField from '@/components/InputField';
import { useState } from 'react';
import CustomButton from '@/components/CustomButton';
import { Link, router } from 'expo-router';
import OAuth from '@/components/OAuth';
import AppleAuth from '@/components/AppleAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '@/components/ToastAlert';
import { Button, Dialog, Portal, PaperProvider } from 'react-native-paper';

import { authAPI } from '@/services/api';
import { useAppContext } from '@/components/AppContext';

interface FormState {
  email: string;
  password: string;
}

const SignIn = () => {
  const { fetchUserAndConnect } = useAppContext();

  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
  });

  const [visible, setVisible] = useState(false);

  const showDialog = () => setVisible(true);

  const hideDialog = () => setVisible(false);

  const [errors, setErrors] = useState<{
    email: string;
    password: string;
  }>({
    email: '',
    password: '',
  });

  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      return 'Email is required.';
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password.trim()) {
      return 'Password is required.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    return '';
  };

  const handleEmailChange = (value: string) => {
    setForm({ ...form, email: value });
    setErrors({ ...errors, email: validateEmail(value) });
  };

  const handlePasswordChange = (value: string) => {
    setForm({ ...form, password: value });
    setErrors({ ...errors, password: validatePassword(value) });
  };

  const onSignInPress = async () => {
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);

    setErrors({ email: emailError, password: passwordError });

    if (emailError || passwordError) {
      return;
    }

    setIsAuthenticating(true);
    try {
      const { email, password } = form;
      const response = await authAPI.login(email, password);

      if (response.data?.status === 200 && response.data.accessToken) {
        await AsyncStorage.setItem('accessToken', response.data.accessToken);
        const accessToken = await AsyncStorage.getItem('accessToken');
        console.log('access Token: ', response.data.accessToken);
        console.log('access Token from storage: ', accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        
        console.log('refresh Token: ', response.data.refreshToken.toString());
        await fetchUserAndConnect();
        router.replace('/(root)/(tabs)/home')
      } else {
        showToast('error', 'Login failed', 'Invalid credentials');
      }
    } catch (error: any) {
      console.error('Login error:', error.response?.data);
      const errorMessage = getErrorMessage(error);
      showToast('error', 'Authentication failed', errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getErrorMessage = (error: any) => {
    const code = error.response?.data?.errorCode;
    switch (code) {
      case 1001:
        return 'User not found.';
      case 1005:
        return 'User is not verified.';
      case 1002:
        return 'Your email or password is incorrect.';
      case 1104:
        return 'Failed to login.';
      case 3001:
        return 'Email is not registered.';
      default:
        return 'Could not log you in. Please try again later!';
    }
  };

  return (
    <PaperProvider>
      <ScrollView className="flex-1 bg-white">
        <StatusBar translucent backgroundColor="transparent" />
        <View className="flex-1 bg-white">
          {/* Logo and Welcome */}
          <View className="relative mt-10 w-full h-[200px] justify-center items-center">
            <Text className="text-4xl font-RobotoBold text-primary-500">Vehicle Rental</Text>
            <Text className="text-2xl text-black font-RobotoMedium mt-2">Welcome</Text>
          </View>

          {/* Form */}
          <View className="px-10">
            <InputField
              label="Email"
              placeholder="Enter your email"
              icon={icons.email}
              value={form.email}
              onChangeText={handleEmailChange}
              error={errors.email}
              inputStyle='font-RobotoSemiBold'
            />
            <InputField
              label="Password"
              placeholder="Enter your password"
              icon={icons.lock}
              secureTextEntry
              value={form.password}
              onChangeText={handlePasswordChange}
              error={errors.password}
              inputStyle='font-RobotoSemiBold'
            />

            <CustomButton
              title="Sign In"
              onPress={onSignInPress}
              className="mt-6"
              disabled={isAuthenticating}
            />

            <Link href="/(auth)/reset-password" className="text-lg text-primary-500 font-RobotoMedium text-right mt-4">
              Forgot Password
            </Link>

            <View className="mt-4">
              <OAuth />
            </View>

            {Platform.OS === 'ios' && <AppleAuth />}

            <Link href="/sign-up" className="text-lg text-center text-general-200 mt-10">
              <Text>Don't have an account? </Text>
              <Text className="text-primary-500 font-RobotoMedium">Sign Up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </PaperProvider>
  );
};

export default SignIn;