import { useState } from 'react';
import { Alert, View, Text, Image, Platform, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import InputField from '@/components/InputField';
import CustomButton from '@/components/CustomButton';
import { Link, router } from 'expo-router';
import { authAPI } from '@/services/api';
import { icons, images } from '@/constants';
import { showToast } from '@/components/ToastAlert';

const ResetPassword = () => {
  const [form, setForm] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!form.email) {
      showToast('error', 'Please enter your email.' );
      return;
    }
    setIsOtpLoading(true);
    try {
      await authAPI.requestOTP(form.email);
      setOtpSent(true);
      showToast('success', 'OTP sent to your email.');
    } catch (e) {
      showToast('error', 'Failed to send OTP.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!form.email || !form.otp || !form.newPassword || !form.confirmPassword) {
      showToast('error', 'Please fill in all fields.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }
    try {
      const response = await authAPI.resetPassword(form.email, Number(form.otp), form.newPassword);
      if (response.data.message === 'Password updated successfully') {
        showToast('success', 'Password reset successful. Please sign in.');
        router.replace('/(auth)/sign-in');
      }
    } catch (e: any) {
      let errorMessage = 'Failed to reset password.';
      const code = e?.response?.data?.code;
      if (code) {
        // Add specific code handling if backend doc provides codes for reset password
        errorMessage = e?.response?.data?.message || errorMessage;
      } else {
        errorMessage = e?.response?.data?.message || errorMessage;
      }
      showToast('error', errorMessage);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <StatusBar translucent backgroundColor="transparent" />
      {/* Back Button */}
      <View className="mt-10 ml-5 w-10 h-10 justify-center absolute">
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={icons.backArrow} className="w-6 h-6" />
        </TouchableOpacity>
      </View>

      <View className="relative mt-10 w-full h-[200px] justify-center items-center">
        <Text className="text-4xl font-RobotoBold text-primary-500">Logo</Text>
        <Text className="text-2xl text-black font-RobotoMedium mt-2">Reset Password</Text>
      </View>
      <View className="px-10">
        <InputField
          label="Email"
          placeholder="Enter your email"
          value={form.email}
          onChangeText={value => setForm({ ...form, email: value })}
        />
        <InputField
          label='Code'
          icon={icons.lock}
          placeholder='123456'
          value={form.otp}
          keyboardType="numeric"
          onChangeText={value => setForm({ ...form, otp: value })}
          rightElement={
            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={isOtpLoading}
              className={`mr-2 px-3 py-2 rounded-lg ${isOtpLoading ? 'bg-gray-300' : 'bg-primary-500'
                }`}
            >
              <Text className="text-white font-RobotoBold">
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </Text>
            </TouchableOpacity>
          }
        />
        <InputField
          label="New Password"
          placeholder="Enter new password"
          secureTextEntry
          value={form.newPassword}
          onChangeText={value => setForm({ ...form, newPassword: value })}
        />
        <InputField
          label="Confirm Password"
          placeholder="Re-enter new password"
          secureTextEntry
          value={form.confirmPassword}
          onChangeText={value => setForm({ ...form, confirmPassword: value })}
        />
        <CustomButton
          title="Reset Password"
          onPress={handleResetPassword}
          className="mt-6"
        />
      </View>
    </ScrollView>
  );
};

export default ResetPassword;
