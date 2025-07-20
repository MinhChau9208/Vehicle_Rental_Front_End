import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';
import InputField from '@/components/InputField';

const EditPhone = () => {
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams();
  const [newPhoneNumber, setNewPhoneNumber] = useState<string>(phoneNumber as string || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNewPhoneNumber(phoneNumber as string || '');
  }, [phoneNumber]);

  const handleSave = async () => {
    if (!newPhoneNumber.trim()) {
      showToast('error', 'Phone number cannot be empty');
      return;
    }
    setLoading(true);
    try {
      const updateData = { phoneNumber: newPhoneNumber };
      const response = await authAPI.updateUser(updateData);
      if (response.data.status === 200) {
        showToast('success', 'Phone number updated successfully');
        router.push('/user/my-account');
      } else {
        throw new Error(response.data.message || 'Failed to update phone number');
      }
    } catch (err: any) {
      console.error('Error updating phone number:', err);
      showToast('error', 'Failed to update phone number');
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
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-RobotoMedium ml-4">Edit Phone</Text>
        </View>
      </View>
      <View className="px-5 mt-5">
        <View className="bg-white rounded-lg p-5">
          <InputField
            className="text-base font-RobotoMedium text-gray-800 border-b border-gray-300 py-2"
            value={newPhoneNumber}
            onChangeText={setNewPhoneNumber}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            label={'Enter New Phone Number'}
          />
        </View>
        <TouchableOpacity
          className="mt-5 py-3 bg-[#2563EB] rounded-md"
          onPress={handleSave}
          disabled={loading}
        >
          <Text className="text-white text-center font-RobotoMedium text-base">Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default EditPhone;