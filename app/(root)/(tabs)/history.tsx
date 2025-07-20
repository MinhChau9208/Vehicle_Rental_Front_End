import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, Image, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rentalAPI, vehicleAPI, authAPI } from '@/services/api';
import { images } from '@/constants';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for status icons
import { showToast } from '@/components/ToastAlert';

interface Rental {
  id: number;
  vehicleId: number;
  renterId: number;
  startDateTime: string;
  endDateTime: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    imageFront: string;
    title: string; // Added title for better display
  };
}

const History = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [statusConstants, setStatusConstants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const fetchRentalsAndConstants = useCallback(async () => {
    try {
      setLoading(true); // Set loading true on initial fetch and refresh
      const [userResponse, rentalsResponse, constantsResponse] = await Promise.all([
        authAPI.getUser(),
        rentalAPI.getAllRentals(),
        rentalAPI.getRentalStatusConstants(),
      ]);

      if (userResponse.data.status === 200) {
        setUserId(userResponse.data.data.id);
      } else {
        throw new Error('Failed to fetch user info');
      }

      if (rentalsResponse.data.status === 200) {
        const rentalsData = rentalsResponse.data.data.rentals;
        const updatedRentals = await Promise.all(
          rentalsData.map(async (rental: Rental) => {
            const vehicleResponse = await vehicleAPI.getVehicleById(rental.vehicleId);
            if (vehicleResponse.data.status === 200) {
              return {
                ...rental,
                vehicle: {
                  imageFront: vehicleResponse.data.data.imageFront || images.carPlaceholder, // Fallback image
                  title: vehicleResponse.data.data.title,
                },
              };
            }
            return { ...rental, vehicle: { imageFront: images.carPlaceholder, title: 'Unknown Vehicle' } }; // Fallback for vehicle info
          })
        );
        setRentals(updatedRentals);
      } else {
        throw new Error('Failed to fetch rentals');
      }

      if (constantsResponse.data.status === 200) {
        setStatusConstants(constantsResponse.data.data);
      } else {
        throw new Error('Failed to fetch status constants');
      }
    } catch (err: any) {
      setError(err.message || 'Could not load rental history');
      showToast('error', err.message || 'Could not load rental history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Empty dependency array means this function is created once

  useFocusEffect(
    useCallback(() => {
      fetchRentalsAndConstants();
    }, [fetchRentalsAndConstants])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    fetchRentalsAndConstants();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPOSIT PENDING':
      case 'DEPOSIT PAID':
        return '#F59E0B'; // Amber
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return '#3B82F6'; // Blue
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return '#8B5CF6'; // Purple
      case 'REMAINING PAYMENT PAID':
        return '#10B981'; // Green
      case 'RENTER RECEIVED':
        return '#3B82F6'; // Blue
      case 'RENTER RETURNED':
        return '#10B981'; // Green
      case 'COMPLETED':
        return '#0D9488'; // Teal
      case 'CANCELLED':
        return '#EF4444'; // Red
      case 'DEPOSIT REFUNDED':
        return '#6B7280'; // Gray
      default:
        return '#1F2937'; // Dark Gray
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DEPOSIT PENDING':
      case 'DEPOSIT PAID':
        return 'hourglass-outline';
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return 'person-circle-outline';
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return 'document-text-outline';
      case 'REMAINING PAYMENT PAID':
        return 'wallet-outline';
      case 'RENTER RECEIVED':
        return 'car-outline';
      case 'RENTER RETURNED':
        return 'checkmark-circle-outline';
      case 'COMPLETED':
        return 'trophy-outline';
      case 'CANCELLED':
        return 'close-circle-outline';
      case 'DEPOSIT REFUNDED':
        return 'cash-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const handleRentalPress = (rentalId: number) => {
    router.push({
      pathname: '/rental/rental-details', // Updated path to match previous change
      params: { rentalId: rentalId.toString() },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="font-RobotoMedium mt-2 text-gray-600">Loading rental history...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoBold text-lg text-center">{error}</Text>
        <TouchableOpacity onPress={onRefresh} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (rentals.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-3xl font-RobotoBold text-gray-900">History</Text>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            source={images.noResult} // Assuming this is a local image asset
            alt="No History"
            className="w-64 h-64" // Adjusted size
            resizeMode="contain"
          />
          <Text className="text-2xl font-RobotoBold text-gray-800 mt-6">
            No Rental History Found
          </Text>
          <Text className="text-base mt-2 text-center px-7 text-gray-600">
            Your recently rented vehicles will appear here!
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <Text className="text-xl font-RobotoBold text-gray-900">Rental History</Text>
        {/* Optional: Add a filter/sort icon here if needed */}
        {/* <TouchableOpacity>
          <Ionicons name="filter-outline" size={24} color="#000" />
        </TouchableOpacity> */}
      </View>

      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleRentalPress(item.id)}
            className="p-4 bg-white rounded-xl mb-4 shadow-md border border-gray-200"
          >
            {item.vehicle && item.vehicle.imageFront && (
              <Image
                source={{ uri: item.vehicle.imageFront }}
                className="w-full h-40 rounded-lg mb-3"
                resizeMode="cover"
                onError={(e) => console.log(`Image load error for ${item.vehicle?.imageFront}:`, e.nativeEvent.error)}
              />
            )}
            <Text className="text-lg font-RobotoBold text-gray-900 mb-1">{item.vehicle?.title || 'Vehicle Details'}</Text>
            <Text className="text-sm text-gray-600 mb-2">Rental ID: {item.id}</Text>

            <View className="flex-row items-center mb-1">
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-700 ml-2">
                Start: {new Date(item.startDateTime).toLocaleDateString()}
              </Text>
            </View>
            <View className="flex-row items-center mb-1">
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-700 ml-2">
                End: {new Date(item.endDateTime).toLocaleDateString()}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-700 ml-2">
                Total Price: {item.totalPrice.toLocaleString()} VND
              </Text>
            </View>

            <View className="flex-row items-center justify-between pt-3 border-t border-gray-200 mt-2">
              <View className="flex-row items-center">
                <Ionicons name={getStatusIcon(item.status) as any} size={20} color={getStatusColor(item.status)} />
                <Text style={{ color: getStatusColor(item.status) }} className="text-base font-RobotoBold ml-2">
                  {item.status}
                </Text>
              </View>
              {item.status === 'COMPLETED' && userId === item.renterId && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/rental/rating', params: { rentalId: item.id.toString() } })}
                  className="bg-[#2563EB] py-2 px-4 rounded-md active:bg-[#1D4ED8]"
                >
                  <Text className="text-white font-RobotoMedium text-center">
                    Rate Vehicle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          !loading && !error && rentals.length === 0 ? (
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-base text-gray-500 font-RobotoMedium">No rentals found</Text>
            </View>
          ) : null
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      />
    </SafeAreaView>
  );
};

export default History;
