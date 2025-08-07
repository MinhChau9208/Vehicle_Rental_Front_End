import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons'; // Added Ionicons
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { authAPI } from '@/services/api';
import { images } from '@/constants';
import { UserData } from '@/types/carData';
import { showToast } from '@/components/ToastAlert';
import { UserProfileData, SessionData } from '@/types/userData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionItem } from '@/components/ui/SessionItem';
import { Button, Dialog, PaperProvider, Portal } from 'react-native-paper';

const MyAccount = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editedNickname, setEditedNickname] = useState('');
  const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const deviceId = await AsyncStorage.getItem('deviceId');
        setCurrentDeviceId(deviceId);
        const [userResponse, sessionsResponse] = await Promise.all([
          authAPI.getUser(),
          authAPI.getRefreshTokens()
        ]);

        if (userResponse.data.status === 200) {
          const user = userResponse.data.data;
          setUserData({
            id: String(user.id || 'unknown'),
            nickname: user.nickname || 'User',
            avatar: user.avatar ? user.avatar : undefined,
            level: user.accountLevel || 1,
          });
          setProfileData({
            email: user.email || '',
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            idCardNumber: user.idCardNumber || null,
            driverLicense: user.driverLicense || null,
            status: user.status || 'UNKNOWN',
            phoneNumber: user.phoneNumber || null,
          });
          setEditedNickname(user.nickname || '');
          setEditedAvatar(user.avatar || null);
          setPhoneNumber(user.phoneNumber || '');

        } else {
          throw new Error(userResponse.data.message || 'User data not found');
        }
        if (sessionsResponse.data.status === 200) {
          setSessions(sessionsResponse.data.refreshTokens);
        } else {
          throw new Error(sessionsResponse.data.message || 'Could not load sessions');
        }
        setError(null);
      } catch (err: any) {
        console.error('Error fetching user:', err);
        setError(err.message === 'Session expired. Please sign in again.' ? err.message : 'Could not load user details');
        if (err.message === 'Session expired. Please sign in again.') {
          router.replace('/(auth)/sign-in');
        }
      } finally {
        setLoading(false);
        setSessionsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleAvatarEdit = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('error', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEditedAvatar(base64Image);
      try {
        const updateData = { avatar: base64Image };
        const response = await authAPI.updateUser(updateData);
        if (response.data.status === 200) {
          setUserData((prev) => prev ? { ...prev, avatar: updateData.avatar } : null);
          showToast('success', 'Avatar updated successfully');
        } else {
          throw new Error(response.data.message || 'Failed to update avatar');
        }
      } catch (err: any) {
        console.error('Error updating avatar:', err);
        showToast('error', err.message || 'Failed to update avatar');
      }
    }
  };

  const handleNicknameEdit = () => {
    setIsEditingNickname(true);
  };

  const handleNicknameSave = async () => {
    if (!editedNickname.trim()) {
      showToast('error', 'Nickname cannot be empty');
      return;
    }
    try {
      const updateData = { nickname: editedNickname };
      const response = await authAPI.updateUser(updateData);
      if (response.data.status === 200) {
        setUserData((prev) => prev ? { ...prev, nickname: editedNickname } : null);
        setIsEditingNickname(false);
        showToast('success', 'Nickname updated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to update nickname');
      }
    } catch (err: any) {
      console.error('Error updating nickname:', err);
      showToast('error', err.message || 'Failed to update nickname');
    }
  };

  const handlePhoneEdit = () => {
    router.push({
      pathname: '/user/edit-phone',
      params: { phoneNumber: profileData?.phoneNumber || '' },
    });
  };

  const handleUpdateToLevel2 = () => {
    router.push('/user/update-to-level-2');
  };

  const handleDeletePress = (deviceId: string) => {
    setSessionToDelete(deviceId);
    setDialogVisible(true);
  };

  // 2. When logout is confirmed, call the API and update the UI
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await authAPI.logout(sessionToDelete);
      setSessions(prevSessions => prevSessions.filter(s => s.deviceId !== sessionToDelete));
      showToast('success', 'Session logged out successfully.');
    } catch (error) {
      console.error('Failed to log out session:', error);
      showToast('error', 'Failed to log out session. Please try again.');
    } finally {
      setDialogVisible(false);
      setSessionToDelete(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="font-RobotoMedium mt-2 text-gray-600">Loading account details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userData || !profileData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center p-5">
        <Text className="text-red-500 font-RobotoBold text-lg text-center">{error || 'User data not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const fullName = [profileData.firstName, profileData.lastName]
    .filter((name) => name)
    .join(' ') || 'N/A';

  return (
    <PaperProvider>
      <SafeAreaView className="flex-1 bg-gray-100">
        <StatusBar backgroundColor="#f3f4f6" barStyle="dark-content" />
        {/* Header with back button */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center text-gray-900">My Account</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1">
          {/* Profile Header Section */}
          <View className="bg-white py-6 items-center border-b border-gray-200 shadow-sm">
            <TouchableOpacity onPress={handleAvatarEdit} className="relative mb-3">
              <Image
                source={
                  editedAvatar
                    ? { uri: editedAvatar }
                    : userData.avatar
                      ? { uri: userData.avatar }
                      : images.avatar
                }
                className="w-28 h-28 rounded-full border-4 border-white shadow-md"
                resizeMode="cover"
              />
              <View className="absolute bottom-0 right-0 bg-[#2563EB] rounded-full p-2 border-2 border-white">
                <Feather name="edit-2" size={18} color="white" />
              </View>
            </TouchableOpacity>
            {isEditingNickname ? (
              <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                <TextInput
                  className="text-lg font-RobotoMedium text-gray-800 flex-1"
                  value={editedNickname}
                  onChangeText={setEditedNickname}
                  placeholder="Enter nickname"
                  autoFocus
                />
                <TouchableOpacity onPress={handleNicknameSave} className="ml-2 p-1">
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditingNickname(false)} className="ml-1 p-1">
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Text className="text-2xl font-RobotoBold text-gray-900">{userData.nickname}</Text>
                <TouchableOpacity onPress={handleNicknameEdit} className="ml-2 p-1">
                  <Feather name="edit-3" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
            <Text className="text-base text-gray-600 font-RobotoRegular mt-1">{profileData.email}</Text>
          </View>

          {/* Account Information Card */}
          <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
            <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Account Information</Text>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-base text-gray-700 font-RobotoRegular">Email</Text>
              <Text className="text-base text-gray-800 font-RobotoMedium">{profileData.email}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-base text-gray-700 font-RobotoRegular">Full Name</Text>
              <Text className="text-base text-gray-800 font-RobotoMedium">{fullName}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-base text-gray-700 font-RobotoRegular">Phone Number</Text>
              <View className="flex-row items-center">
                <Text className="text-base text-gray-800 font-RobotoMedium mr-2">
                  {profileData.phoneNumber || 'N/A'}
                </Text>
                <TouchableOpacity onPress={handlePhoneEdit}>
                  <Feather name="edit-3" size={16} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-base text-gray-700 font-RobotoRegular">Nickname</Text>
              <Text className="text-base text-gray-800 font-RobotoMedium">@{userData.nickname}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-base text-gray-700 font-RobotoRegular">Account Level</Text>
              <Text className="text-base text-gray-800 font-RobotoMedium">Level {userData.level}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-base text-gray-700 font-RobotoRegular">ID Card Number</Text>
              <Text className="text-base text-gray-800 font-RobotoMedium">
                {profileData.idCardNumber || 'N/A'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-base text-gray-700 font-RobotoRegular">Driver's License</Text>
              <Text className="text-base text-gray-800 font-RobotoMedium">
                {profileData.driverLicense || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Active Sessions Card */}
          <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
            <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Active Sessions</Text>
            {sessionsLoading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              sessions.map((session, index) => (
                <View key={index} className={`py-3 ${index < sessions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <SessionItem
                    session={session}
                    isCurrent={session.deviceId === currentDeviceId}
                    onDelete={handleDeletePress}
                  />
                </View>
              ))
            )}
          </View>

          {/* Update to Level 2 Button */}
          <View className="mx-4 mt-4 mb-8">
            <TouchableOpacity
              className={`py-4 rounded-xl shadow-md ${userData.level && userData.level >= 2 ? 'bg-gray-300' : 'bg-[#2563EB] active:bg-[#1D4ED8]'}`}
              onPress={handleUpdateToLevel2}
              disabled={userData.level && userData.level >= 2}
            >
              <Text
                className={`text-center font-RobotoBold text-lg ${userData.level && userData.level >= 2 ? 'text-gray-600' : 'text-white'}`}
              >
                {userData.level && userData.level >= 2 ? 'Account is Verified' : 'Verify Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Confirmation Dialog */}
          <Portal>
            <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ borderRadius: 12 }}>
              <Dialog.Title style={{ fontFamily: 'Roboto-Bold', fontSize: 20, color: '#1F2937' }}>Log Out Device</Dialog.Title>
              <Dialog.Content>
                <Text style={{ fontFamily: 'Roboto-Regular', fontSize: 16, color: '#4B5563' }}>
                  Are you sure you want to log out this device? This action cannot be undone.
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setDialogVisible(false)} textColor='#6B7280' labelStyle={{ fontFamily: 'Roboto-Medium' }}>Cancel</Button>
                <Button onPress={confirmDeleteSession} textColor="#EF4444" labelStyle={{ fontFamily: 'Roboto-Bold' }}>Log Out</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
};

export default MyAccount;
