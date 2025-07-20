import { Image, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { icons, images } from '@/constants';
import InputField from '@/components/InputField';
import { useState } from 'react';
import CustomButton from '@/components/CustomButton';
import { Link, useRouter } from 'expo-router';
import OAuth from '@/components/OAuth';
import ReactNativeModal from 'react-native-modal';
import AppleAuth from '@/components/AppleAuth';
import { authAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';

interface FormState {
  nickname: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface VerificationState {
  state: 'default' | 'pending' | 'success';
  error: string;
  code: string;
}

const SignUp = () => {
  const router = useRouter();

  // Form state
  const [form, setForm] = useState<FormState>({
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Error state
  const [errors, setErrors] = useState<{
    email: string;
    password: string;
  }>({
    email: '',
    password: '',
  });

  // Verification state
  const [verification, setVerification] = useState<VerificationState>({
    state: 'default',
    error: '',
    code: '',
  });

  // OTP state
  const [otpButtonText, setOtpButtonText] = useState('Send OTP');
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // Email validation
  const validateEmail = (email: string) => {
    if (!email.trim()) {
      return 'Email is required.';
    }
    if (!email.includes('@')) {
      return 'Email must contain "@".';
    }
    return '';
  };

  // Handle email change and validation
  const handleEmailChange = (value: string) => {
    setForm({ ...form, email: value });
    setErrors({ ...errors, email: validateEmail(value) });
  };

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    numeric: false,
  });

  // Validate password
  const validatePassword = (password: string) => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      numeric: /\d/.test(password),
    });
  };

  // Handle OTP sending
  const handleSendOTP = async () => {
    if (!form.email) {
      showToast('error', 'Error', 'Please enter a valid email address');
      return;
    }
    setIsOtpLoading(true);
    try {
      const response = await authAPI.requestOTP(form.email);
      if (response.data.status === 200) {
        setOtpButtonText('Re-send Code');
        setVerification({ ...verification, state: 'pending', error: '' });
        showToast('success', 'OTP Sent', 'Verification code sent to your email');
      } else {
        showToast('error', 'Error', response.data.message || getOtpErrorCode(response.data.errorCode));
      }
    } catch (error) {
      console.error('OTP Request Error:', error);
      showToast('error', 'Error', 'Failed to send verification code');
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Handle OTP resend
  const handleResendOTP = async () => {
    if (!form.email) {
      showToast('error', 'Error', 'Please enter a valid email address');
      return;
    }
    setIsOtpLoading(true);
    try {
      const response = await authAPI.resendOTP(form.email);
      if (response.data.status === 200) {
        setOtpButtonText('Re-send Code');
        showToast('success', 'OTP Resent', 'Verification code resent to your email');
      } else {
        // OTP expired for code 1011, handle it by sending a new OTP
        if (response.data.errorCode === 1011) {
          await handleSendOTP();
        } else {
          showToast('error', 'Error', response.data.message || getOtpErrorCode(response.data.errorCode));
        }
      }
    } catch (error) {
      console.error('Resend OTP Error:', error);
      showToast('error', 'Error', 'Failed to resend verification code');
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Get OTP error code message
  const getOtpErrorCode = (code: number): string => {
    switch (code) {
      case 1001:
        return 'User not found.';
      case 1009:
        return 'OTP already requested.';
      case 1011:
        return 'OTP code expired.';
      case 1105:
        return 'User is not level 1';
      case 1106:
        return 'Failed to send OTP.';
      default:
        return 'Failed to process OTP request.';
    }
  };

  // Handle sign-up button press
  const onSignUpPress = async () => {
    if (form.password !== form.confirmPassword) {
      showToast('error', 'Error', 'Passwords do not match.');
      return;
    }
    if (!passwordValidation.length || !passwordValidation.uppercase || !passwordValidation.numeric) {
      showToast('error', 'Error', 'Password must be at least 8 characters long, contain an uppercase letter, and a number.');
      return;
    }
    try {
      const response = await authAPI.register({
        nickname: form.nickname,
        email: form.email,
        password: form.password,
      });
      if (response.data.status === 201) {
        setVerification({ state: 'pending', error: '', code: '' });
        await handleSendOTP();
      } else {
        showToast('error', 'Error', response.data.message || getSignUpErrorCode(response.data.errorCode));
      }
    } catch (error: any) {
      showToast('error', 'Error', error.response?.data?.message || 'An error occurred during sign-up.');
    }
  };

  // Get sign-up error code message
  const getSignUpErrorCode = (code: number): string => {
    switch (code) {
      case 1003:
        return 'Email already in use.';
      case 1107:
        return 'Failed to create user.';
      default:
        return 'Sign-up failed.';
    }
  };

  // Handle verification button press
  const onPressVerify = async () => {
    try {
      const response = await authAPI.updateToLevel1(form.email, Number(verification.code));
      if (response.data.status === 200) {
        setVerification({ ...verification, state: 'success', error: '', code: '' });
        showToast('success', 'Verified', 'Your account has been successfully verified!');
      } else {
        setVerification({
          ...verification,
          error: response.data.message || 'Verification failed.',
          state: 'pending',
        });
        showToast('error', 'Verification Failed', response.data.message || 'Verification failed.');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message === 'OTP is incorrect'
        ? 'OTP is incorrect'
        : error.response?.data?.message || 'An error occurred during verification.';
      setVerification({ ...verification, error: errorMsg, state: 'pending' });
      showToast('error', 'Verification Failed', errorMsg);
    }
  };

  const closeOtpModal = () => {
    setVerification({ ...verification, state: 'default', error: '', code: '' });
  };

  // Render the SignUp component
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 bg-white">
        {/* Back Button */}
        <View className="mt-10 ml-5 w-10 h-10 justify-center absolute">
          <TouchableOpacity onPress={() => router.back()}>
            <Image source={icons.backArrow} className="w-6 h-6" />
          </TouchableOpacity>
        </View>

        {/* Logo and Header */}
        <View className="mt-10 w-full h-[200px] justify-center items-center">
          <Text className="text-4xl font-RobotoBold text-primary-500">Vehicle Rental</Text>
          <Text className="text-2xl font-RobotoMedium text-black mt-2">Create Your Account</Text>
        </View>

        {/* Form */}
        <View className="px-10">
          <InputField
            label="Username"
            placeholder="Enter your username"
            icon={icons.person}
            value={form.nickname}
            onChangeText={(value) => setForm({ ...form, nickname: value })}
          />
          <InputField
            label="Email"
            placeholder="Enter your email"
            icon={icons.email}
            value={form.email}
            onChangeText={(value) => setForm({ ...form, email: value })}
          />
          <InputField
            label="Password"
            placeholder="Enter your password"
            icon={icons.lock}
            secureTextEntry
            value={form.password}
            onChangeText={(value) => {
              setForm({ ...form, password: value });
              validatePassword(value);
            }}
          />

          {/* Password Validation Display */}
          <View className="mb-5 ml-8">
            <View className="flex-row items-center mb-[-20px] mt-[-10px]">
              <Text className={passwordValidation.length ? 'text-green-500 text-4xl mt-1' : 'text-gray-400 text-4xl mt-1'}>•</Text>
              <Text className={passwordValidation.length ? "text-green-500 text-sm font-RobotoMedium ml-2" : "text-gray-500 text-sm font-RobotoMedium ml-2"}>At least 8 characters</Text>
            </View>
            <View className="flex-row items-center mb-[-20px]">
              <Text className={passwordValidation.uppercase ? 'text-green-500 text-4xl mt-1' : 'text-gray-400 text-4xl mt-1'}>•</Text>
              <Text className={passwordValidation.uppercase ? "text-green-500 text-sm font-RobotoMedium ml-2" : "text-gray-500 text-sm font-RobotoMedium ml-2"}>At least 1 uppercase letter</Text>
            </View>
            <View className="flex-row items-center mb-[-15px]">
              <Text className={passwordValidation.numeric ? 'text-green-500 text-4xl mt-1' : 'text-gray-400 text-4xl mt-1'}>•</Text>
              <Text className={passwordValidation.numeric ? "text-green-500 text-sm font-RobotoMedium ml-2" : "text-gray-500 text-sm font-RobotoMedium ml-2"}>At least 1 numeric character</Text>
            </View>
          </View>

          <InputField
            label="Re-type Password"
            placeholder="Enter your password again"
            icon={icons.lock}
            secureTextEntry
            value={form.confirmPassword}
            onChangeText={(value) => setForm({ ...form, confirmPassword: value })}
          />

          <CustomButton title="Sign Up" onPress={onSignUpPress} className="mt-6" />

          <OAuth />
          {Platform.OS === "ios" && <AppleAuth />}

        </View>

        {/* OTP Verification Modal */}
        <ReactNativeModal isVisible={verification.state === 'pending'}>
          <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
            {/* Back Button */}
            <TouchableOpacity onPress={closeOtpModal} className="absolute top-4 left-4">
              <Image source={icons.backArrow} className="w-6 h-6" />
            </TouchableOpacity>

            <Text className="text-2xl font-RobotoMedium mb-2">Verification</Text>
            <Text className="font-RobotoMedium mb-5">We've sent a verification code to {form.email}</Text>
            <InputField
              label="Code"
              icon={icons.lock}
              placeholder="123456"
              value={verification.code}
              keyboardType="numeric"
              onChangeText={(code) => setVerification({ ...verification, code })}
              rightElement={
                <TouchableOpacity
                  onPress={otpButtonText === 'Send OTP' ? handleSendOTP : handleResendOTP}
                  disabled={isOtpLoading}
                  className={`mx-2 px-3 py-2 rounded-lg ${isOtpLoading ? 'bg-gray-300' : 'bg-primary-500'}`}
                >
                  <Text className="text-white font-RobotoMedium text-sm">{otpButtonText}</Text>
                </TouchableOpacity>
              }
            />
            {verification.error && (
              <Text className="text-red-500 text-sm font-RobotoMedium mt-1">{verification.error}</Text>
            )}
            <CustomButton
              title="Verify Email"
              onPress={onPressVerify}
              className="mt-5 bg-primary-500"
            />
          </View>
        </ReactNativeModal>

        {/* Success Modal */}
        <ReactNativeModal isVisible={verification.state === 'success'}>
          <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px] justify-center items-center">
            <Image source={images.check} className="w-[110px] h-[110px] mx-auto my-5" />
            <Text className="text-3xl font-RobotoMedium text-center">Verified</Text>
            <Text className="text-base text-gray-400 font-RobotoMedium text-center mt-2">
              You have successfully signed up your account.
            </Text>
            <CustomButton
              title="Login Now"
              onPress={() => router.replace('/sign-in')}
              className="mt-5 w-full"
            />
          </View>
        </ReactNativeModal>
      </View>
    </ScrollView>
  );
};

export default SignUp;