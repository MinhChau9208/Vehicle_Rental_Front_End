import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { authAPI } from '@/services/api';
import InputField from '@/components/InputField';
import { showToast } from '@/components/ToastAlert';

const UpdateToLevel2 = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    idCardNumber: '',
    driverLicense: '',
    idCardFront: null as string | null,
    idCardBack: null as string | null,
    driverLicenseFront: null as string | null,
    driverLicenseBack: null as string | null,
  });
  const [loading, setLoading] = useState(false);

  const pickImage = async (field: keyof typeof formData) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('error', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const imageSize = (result.assets[0].base64.length * 3) / 4 / 1024 / 1024; // Approximate size in MB
      if (imageSize > 5) {
        showToast('error', 'Image size must be less than 5MB');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        [field]: `data:image/jpeg;base64,${result.assets[0].base64}`,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.idCardNumber || !formData.driverLicense ||
        !formData.idCardFront || !formData.idCardBack || !formData.driverLicenseFront || !formData.driverLicenseBack) {
      showToast('error', 'Please fill in all required fields and upload all required images');
      return;
    }

    if (formData.idCardNumber.length !== 12) {
      showToast('error', 'ID Card Number must be 12 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.requestUpdateToLevel2({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        idCardNumber: formData.idCardNumber,
        driverLicense: formData.driverLicense,
        idCardFront: formData.idCardFront!,
        idCardBack: formData.idCardBack!,
        driverLicenseFront: formData.driverLicenseFront!,
        driverLicenseBack: formData.driverLicenseBack!,
      });

      if (response.data.status === 200) {
        showToast('success', 'User sent for approval successfully. Please wait for approval.');
        router.push('/user/my-account');
      } else {
        throw new Error(response.data.message || 'Failed to request level 2');
      }
    } catch (err: any) {
      console.error('Error requesting level 2:', err);
      showToast(
        'error',
        err.message === 'Session expired. Please sign in again.'
          ? 'Session expired. Please sign in again.'
          : err.response?.data?.message || 'Failed to request level 2'
      );
      if (err.message === 'Session expired. Please sign in again.') {
        router.replace('/(auth)/sign-in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-100">
      <StatusBar backgroundColor="#f3f4f6" barStyle="dark-content" />
      <View className="bg-white pt-5 pb-5">
        <View className="flex-row items-center px-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-RobotoMedium text-gray-800 ml-4">Update to Level 2</Text>
        </View>
      </View>
      <ScrollView className="px-5 mt-5">
        <View className="bg-white rounded-lg p-5">
          <Text className="text-base font-RobotoMedium text-gray-800 mb-4">Identity Verification</Text>
          <InputField
            label="First Name"
            placeholder="Enter first name"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Middle Name"
            placeholder="Enter middle name (optional)"
            value={formData.middleName}
            onChangeText={(text) => setFormData({ ...formData, middleName: text })}
            containerStyle="mb-4"
          />
          <InputField
            label="Last Name"
            placeholder="Enter last name"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="ID Card Number"
            placeholder="Enter 12-digit ID card number"
            value={formData.idCardNumber}
            onChangeText={(text) => setFormData({ ...formData, idCardNumber: text })}
            containerStyle="mb-4"
            keyboardType="numeric"
            maxLength={12}
            isRequired
          />
          <InputField
            label="Driver's License Number"
            placeholder="Enter driver's license number"
            value={formData.driverLicense}
            onChangeText={(text) => setFormData({ ...formData, driverLicense: text })}
            containerStyle="mb-4"
            isRequired
          />
          <View className="mb-4">
            <Text className="text-sm font-RobotoMedium text-gray-500">ID Card Front *</Text>
            <TouchableOpacity
              className="mt-2 bg-gray-200 rounded-lg p-4 items-center justify-center"
              onPress={() => pickImage('idCardFront')}
            >
              {formData.idCardFront ? (
                <Image source={{ uri: formData.idCardFront }} className="w-32 h-20 rounded" />
              ) : (
                <Text className="text-gray-500">Upload ID Card Front</Text>
              )}
            </TouchableOpacity>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-RobotoMedium text-gray-500">ID Card Back *</Text>
            <TouchableOpacity
              className="mt-2 bg-gray-200 rounded-lg p-4 items-center justify-center"
              onPress={() => pickImage('idCardBack')}
            >
              {formData.idCardBack ? (
                <Image source={{ uri: formData.idCardBack }} className="w-32 h-20 rounded" />
              ) : (
                <Text className="text-gray-500">Upload ID Card Back</Text>
              )}
            </TouchableOpacity>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-RobotoMedium text-gray-500">Driver's License Front *</Text>
            <TouchableOpacity
              className="mt-2 bg-gray-200 rounded-lg p-4 items-center justify-center"
              onPress={() => pickImage('driverLicenseFront')}
            >
              {formData.driverLicenseFront ? (
                <Image source={{ uri: formData.driverLicenseFront }} className="w-32 h-20 rounded" />
              ) : (
                <Text className="text-gray-500">Upload Driver's License Front</Text>
              )}
            </TouchableOpacity>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-RobotoMedium text-gray-500">Driver's License Back *</Text>
            <TouchableOpacity
              className="mt-2 bg-gray-200 rounded-lg p-4 items-center justify-center"
              onPress={() => pickImage('driverLicenseBack')}
            >
              {formData.driverLicenseBack ? (
                <Image source={{ uri: formData.driverLicenseBack }} className="w-32 h-20 rounded" />
              ) : (
                <Text className="text-gray-500">Upload Driver's License Back</Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className={`py-3 rounded-md bg-[#2563EB] ${loading ? 'opacity-50' : ''}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white text-center font-RobotoMedium text-base">
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UpdateToLevel2;