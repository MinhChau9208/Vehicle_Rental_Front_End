import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, StatusBar, Switch, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { images } from '@/constants';
import { authAPI } from '@/services/api';
import { Portal, Dialog, Button, PaperProvider } from 'react-native-paper';
import { showToast } from '@/components/ToastAlert';
import { useAppContext } from '@/components/AppContext';

interface UserData {
  avatar?: string;
  nickname: string;
  level?: number;
  email: string;
}

const Profile = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getUser();
        const user = response.data.data;
        if (response.data.status === 200) {
          setUserData({
            avatar: user.avatar,
            nickname: user.nickname,
            level: user.accountLevel,
            email: user.email,
          });
          setError(null);
        } else {
          throw new Error(response.data.message || 'User data not found');
        }
      } catch (err: any) {
        console.error('Error fetching user:', err);
        setError(err.message === 'Session expired. Please sign in again.' ? err.message : 'Could not load user data.');
        if (err.message === 'Session expired. Please sign in again.') {
          router.replace('/(auth)/sign-in');
        } else {
          showToast('error', 'Could not load user data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    setDialogVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'pushNotificationsEnabled']);
      setDialogVisible(false);
      router.replace('/(auth)/sign-in');
    } catch (err) {
      setDialogVisible(false);
      showToast('error', 'Could not log out. Please try again.');
      console.error('Error during logout:', err);
    }
  };

  // Dummy function for email notifications (as it's not implemented in the provided snippet)
  const setForm = (args: { emailNotifications: boolean }) => {
    console.log('Email notifications toggled:', args.emailNotifications);
    // You would typically update a state or context here for email notifications
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="font-RobotoMedium mt-2 text-gray-600">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoBold text-lg text-center">{error}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <PaperProvider>
      <SafeAreaView className="flex-1 bg-gray-100">
        <StatusBar backgroundColor="#f3f4f6" barStyle="dark-content" />
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text numberOfLines={1} className="text-xl font-RobotoBold flex-1 text-center text-gray-900">
            Profile
          </Text>
          <TouchableOpacity className="p-2">
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {/* Account Section */}
          <View className="mb-6">
            <Text className="text-xs uppercase text-gray-500 font-RobotoMedium ml-3 mb-2">Account</Text>
            <View className="bg-white rounded-xl shadow-md overflow-hidden">
              <TouchableOpacity
                onPress={() => router.push('/user/my-account')} // Simplified path for clarity
                className="flex-row items-center p-4 border-b border-gray-100"
              >
                <Image
                  resizeMode='cover'
                  source={userData?.avatar ? { uri: userData.avatar } : images.avatar}
                  className="w-16 h-16 rounded-full mr-4 border border-gray-200"
                />
                <View className="flex-1">
                  <Text className="text-xl font-RobotoBold text-gray-900">{userData?.nickname || 'User'}</Text>
                  <Text className="text-sm text-gray-600 font-RobotoRegular mt-1">{userData?.email || 'user@example.com'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Vehicles Section */}
          <View className="mb-6">
            <Text className="text-xs uppercase text-gray-500 font-RobotoMedium ml-3 mb-2">Vehicles</Text>
            <View className="bg-white rounded-xl shadow-md overflow-hidden">
              <TouchableOpacity
                onPress={() => router.push('/user/my-vehicles')} // Simplified path
                className="flex-row items-center p-4 border-b border-gray-100"
              >
                <Ionicons name="car-outline" size={24} color="#2563EB" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">My Vehicles</Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(root)/(screens)/user/favorites')}
                className="flex-row items-center p-4 border-b border-gray-100"
              >
                <Ionicons name="heart-outline" size={24} color="#EF4444" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">My Favorites</Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/addpost')} // Simplified path
                className="flex-row items-center p-4"
              >
                <Ionicons name="add-circle-outline" size={24} color="#10B981" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Add New Vehicle</Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferences Section */}
          <View className="mb-6">
            <Text className="text-xs uppercase text-gray-500 font-RobotoMedium ml-3 mb-2">Preferences</Text>
            <View className="bg-white rounded-xl shadow-md overflow-hidden">
              <View className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="language-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Language</Text>
                <View className="flex-1" />
                <Text className="text-base text-gray-600 font-RobotoRegular mr-2">English</Text>
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </View>
              <View className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="location-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Location</Text>
                <View className="flex-1" />
                <Text className="text-base text-gray-600 font-RobotoRegular mr-2">Los Angeles, CA</Text>
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </View>
              <View className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="mail-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Email Notifications</Text>
                <View className="flex-1" />
                <Switch
                  onValueChange={emailNotifications => setForm({ emailNotifications })}
                  value={false} // Assuming 'mock' was a placeholder, setting to false for demo
                  trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                  thumbColor={false ? "#F9FAFB" : "#FFFFFF"}
                />
              </View>
              <View className="flex-row items-center p-4">
                <Ionicons name="notifications-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Push Notifications</Text>
                <View className="flex-1" />
                <Switch
                  trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                  thumbColor={"#F9FAFB"}
                />
              </View>
            </View>
          </View>

          {/* Resources Section */}
          <View className="mb-6">
            <Text className="text-xs uppercase text-gray-500 font-RobotoMedium ml-3 mb-2">Resources</Text>
            <View className="bg-white rounded-xl shadow-md overflow-hidden">
              <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="help-circle-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Contact Us</Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="bug-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Report Bug</Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="star-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Rate in App Store</Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center p-4">
                <Ionicons name="document-text-outline" size={24} color="#6B7280" />
                <Text className="text-base text-gray-800 font-RobotoMedium ml-3">Terms and Privacy</Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={24} color="#B0B0B0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Logout Button */}
          <View className="mb-8">
            <View className="bg-white rounded-xl shadow-md overflow-hidden">
              <TouchableOpacity onPress={handleLogout} className="p-4 items-center">
                <Text className="text-center font-RobotoBold text-red-600 text-base">Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-center text-gray-500 text-sm font-RobotoRegular mb-4">App Version 1.0</Text>
        </ScrollView>

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ borderRadius: 12 }}>
            <Dialog.Title style={{ fontFamily: 'Roboto-Bold', fontSize: 20, color: '#1F2937' }}>Confirm Logout</Dialog.Title>
            <Dialog.Content>
              <Text style={{ fontFamily: 'Roboto-Regular', fontSize: 16, color: '#4B5563' }}>Are you sure you want to log out?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)} textColor='#6B7280' labelStyle={{ fontFamily: 'Roboto-Medium' }}>Cancel</Button>
              <Button onPress={confirmLogout} textColor="#EF4444" labelStyle={{ fontFamily: 'Roboto-Bold' }}>Logout</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
};

export default Profile;
