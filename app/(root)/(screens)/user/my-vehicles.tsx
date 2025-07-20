import React, { useState, useCallback } from 'react';
import { Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import PendingRequests from '@/components/PendingRequests';
import VehicleList from '@/components/vehicle/VehicleList';
import { useFocusEffect } from 'expo-router';

const MyVehicles = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'vehicles'>('pending');
  // State to trigger a re-mount of the child components
  const [refreshKey, setRefreshKey] = useState(0);

  // This effect runs every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // By changing the key, we force React to re-mount the active component,
      // which will trigger its internal data fetching logic (useEffect/useFocusEffect).
      setRefreshKey(prevKey => prevKey + 1);
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-white p-5">
      {/* Tab Navigation */}
      <View className="flex-row justify-between mb-4">
        <TouchableOpacity
          className={`flex-1 p-3 rounded-lg ${activeTab === 'pending' ? 'bg-primary-500' : 'bg-gray-200'}`}
          onPress={() => setActiveTab('pending')}
        >
          <Text className={`text-center font-RobotoBold ${activeTab === 'pending' ? 'text-white' : 'text-black'}`}>
            Pending Requests
          </Text>
        </TouchableOpacity>
        <View className="w-2" />
        <TouchableOpacity
          className={`flex-1 p-3 rounded-lg ${activeTab === 'vehicles' ? 'bg-primary-500' : 'bg-gray-200'}`}
          onPress={() => setActiveTab('vehicles')}
        >
          <Text className={`text-center font-RobotoBold ${activeTab === 'vehicles' ? 'text-white' : 'text-black'}`}>
            My Vehicles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content - The `key` prop is added to force a refresh on focus */}
      {activeTab === 'pending' ? (
        <PendingRequests key={`pending-${refreshKey}`} />
      ) : (
        <VehicleList key={`vehicles-${refreshKey}`} />
      )}
    </SafeAreaView>
  );
};

export default MyVehicles;
