import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { rentalAPI, authAPI } from '@/services/api';
import { icons, images } from '@/constants'; // Ensure images are imported for carPlaceholder
import { showToast } from '@/components/ToastAlert';

const RentalConfirmation = () => {
  const params = useLocalSearchParams();
  const {
    vehicleId,
    title,
    price,
    startDate: startDateStr,
    endDate: endDateStr,
    imageFront,
    owner,
    avatar,
    rating
  } = params;

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const startDate = startDateStr ? new Date(startDateStr as string) : null;
  const endDate = endDateStr ? new Date(endDateStr as string) : null;
  const parsedPrice = price ? parseFloat(price as string) : 0;
  const parsedRating = rating ? parseFloat(rating as string) : 0;

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const days = calculateDays();
  const appFee = 2500; // Example app fee
  // Calculate estimated total price, including deposit if available in confirmationData
  const estimatedTotalPrice = parsedPrice * days + appFee;

  const getMonthsToCheck = (startDate: Date, endDate: Date) => {
    const months = new Set<string>();
    let current = new Date(startDate);
    while (current <= endDate) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      months.add(`${year}-${month}`);
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return Array.from(months).map((m) => {
      const [year, month] = m.split('-').map(Number);
      return { month, year };
    });
  };

  const checkAvailability = async () => {
    if (!vehicleId || !startDate || !endDate) {
      setIsAvailable(false); // Assume not available if dates are missing
      return;
    }
    try {
      const monthsToCheck = getMonthsToCheck(startDate, endDate);
      const allBookings = [];
      for (const { month, year } of monthsToCheck) {
        const response = await rentalAPI.checkVehicleAvailability({
          vehicleId: parseInt(vehicleId as string),
          month,
          year,
        });
        if (response.status === 200 && Array.isArray(response.data?.data)) {
          allBookings.push(...response.data.data);
        } else {
          throw new Error('Failed to check availability for ' + month + '/' + year);
        }
      }
      const isBooked = allBookings.some((booking: any) => {
        const bookingStart = new Date(booking.startDateTime);
        const bookingEnd = new Date(booking.endDateTime);
        return startDate < bookingEnd && endDate > bookingStart;
      });
      setIsAvailable(!isBooked);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 4101
          ? 'Failed to check vehicle availability.'
          : err.response?.data?.errorCode === 4012
            ? 'Invalid dates.'
            : err.response?.data?.message || 'Could not check availability.';
      showToast('error', errorMessage);
      setIsAvailable(false);
    }
  };

  const confirmRental = async () => {
    if (!vehicleId || !startDate || !endDate) {
      setConfirmationData(null); // No confirmation data if details are missing
      return;
    }
    try {
      const response = await rentalAPI.createRentalConfirmation({
        vehicleId: parseInt(vehicleId as string),
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
      });
      if (response.data.status === 200) {
        setConfirmationData(response.data.data);
      } else {
        throw new Error('Failed to create rental confirmation');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 2007
          ? 'Vehicle not found.'
          : err.response?.data?.errorCode === 4012
            ? 'End date is less than start date.'
            : err.response?.data?.errorCode === 4001
              ? 'Vehicle is not available.'
              : err.response?.data?.errorCode === 4102
                ? 'Failed to create rental confirmation.'
                : err.response?.data?.message || 'Could not confirm rental.';
      showToast('error', errorMessage);
      setConfirmationData(null); // Clear confirmation data on error
      setIsAvailable(false); // Mark as not available on error
    }
  };

  const handleCreateRental = async () => {
    if (!vehicleId || !startDate || !endDate) {
      showToast('error', 'Please provide all required information.');
      return;
    }
    try {
      const userResponse = await authAPI.getUser();
      if (userResponse.data.status === 200) {
        const phoneNumber = userResponse.data.data.phoneNumber;
        const accountLevel = userResponse.data.data.accountLevel;
        if (!phoneNumber) {
          showToast('error', 'Phone number is missing. Please update your profile.');
          router.push('/user/edit-phone');
          return;
        } else if (accountLevel === 1) {
          showToast('error', 'You must verify your account before making any rental');
          router.push('/user/update-to-level-2')
          return; // Stop execution if account level is 1
        }
        const response = await rentalAPI.createNewRental({
          vehicleId: parseInt(vehicleId as string),
          renterPhoneNumber: phoneNumber,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
        });
        if (response.data.status === 200 && response.data?.data) {
          const rentalId = response.data.data.id;
          const depositPrice = response.data.data.depositPrice;
          router.push({
            pathname: '/vehicle/payment',
            params: { rentalId: rentalId.toString(), depositPrice: depositPrice.toString() }
          });
        } else {
          throw new Error('Failed to create rental');
        }
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 2007
          ? 'Vehicle not found.'
          : err.response?.data?.errorCode === 4002
            ? 'Owner cannot rent their own vehicle.'
            : err.response?.data?.errorCode === 4012
              ? 'End date is less than start date.'
              : err.response?.data?.errorCode === 4001
                ? 'Vehicle is not available.'
                : err.response?.data?.errorCode === 4103
                  ? 'Failed to create rental.'
                  : err.response?.data?.message || 'Could not create rental.';
      showToast('error', errorMessage);
    }
  };

  useEffect(() => {
    if (vehicleId && startDate && endDate) {
      // Run both checks concurrently and then set loading to false
      Promise.all([
        checkAvailability(),
        confirmRental()
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [vehicleId, startDateStr, endDateStr]);

  if (!vehicleId || !title || !price || !startDateStr || !endDateStr || !imageFront || !owner) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">Missing rental information</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="font-RobotoMedium mt-2">Checking availability and confirming rental...</Text>
      </SafeAreaView>
    );
  }

  if (isAvailable === false) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-RobotoBold text-lg text-center px-4">
          Vehicle is not available for the selected dates.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center">Confirm Rental</Text>
        </View>

        {/* Vehicle Details Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Image
            source={{ uri: imageFront as string }}
            className="w-full h-52 rounded-lg mb-3"
            resizeMode="cover"
            onError={(e) => console.log(`Image load error for ${imageFront}:`, e.nativeEvent.error)}
          />
          <Text className="text-xl font-RobotoBold text-gray-900">{title as string}</Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="car-outline" size={20} color="#6B7280" />
            <Text className="text-sm text-gray-600 font-RobotoMedium ml-2">Vehicle ID: {vehicleId}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={18} color={parsedRating > 0 ? "#FFD700" : "#D1D5DB"} />
            {parsedRating > 0 ? (
              <Text className="text-base font-RobotoBold text-yellow-600 ml-1">{rating}</Text>
            ) : (
              <Text className="text-base font-RobotoMedium text-gray-500 ml-1">No rating</Text>
            )}
            <Text className="text-sm text-gray-500 font-RobotoMedium ml-2">21 trips</Text>
          </View>
        </View>

        {/* Rental Period & Location Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Rental Period & Location</Text>
          <View className="flex-row justify-between mb-3">
            <View>
              <Text className="text-sm text-gray-500 font-RobotoMedium">Pickup Date & Time</Text>
              <Text className="text-base font-RobotoMedium text-gray-800 mt-1">
                {startDate?.toLocaleString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-sm text-gray-500 font-RobotoMedium">Return Date & Time</Text>
              <Text className="text-base font-RobotoMedium text-gray-800 mt-1">
                {endDate?.toLocaleString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center mt-2">
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <Text className="text-base text-gray-700 font-RobotoMedium ml-2">District 2, Ho Chi Minh City</Text>
          </View>
        </View>

        {/* Owner Information Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Owner Information</Text>
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: avatar as string || images.avatar }}
              className="w-12 h-12 rounded-full mr-3 border border-gray-200"
              resizeMode="cover"
            />
            <View>
              <Text className="text-base font-RobotoBold text-gray-800">{owner as string}</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={18} color={parsedRating > 0 ? "#FFD700" : "#D1D5DB"} />
                {parsedRating > 0 ? (
                  <Text className="text-base font-RobotoBold text-yellow-600 ml-1">{rating}</Text>
                ) : (
                  <Text className="text-base font-RobotoMedium text-gray-500 ml-1">No rating</Text>
                )}
                <Text className="text-sm text-gray-500 font-RobotoMedium ml-2">21 trips</Text>
              </View>
            </View>
          </View>
          <Text className="text-xs text-gray-500 font-RobotoRegular leading-4">
            Personal information is kept confidential. The App will send the owner rental details after the customer completes full payment.
          </Text>
        </View>

        {/* Price Breakdown Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Price Breakdown</Text>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">Rental Rate</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">{parsedPrice.toLocaleString()} đ/day</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">Number of Days</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">{days} day{days > 1 ? 's' : ''}</Text>
          </View>
          {confirmationData && (
            <View className="flex-row justify-between py-2">
              <Text className="text-base text-gray-700 font-RobotoRegular">Deposit</Text>
              <Text className="text-base text-gray-800 font-RobotoMedium">
                {confirmationData.depositPrice.toLocaleString()} đ
              </Text>
            </View>
          )}

          <View className="flex-row justify-between items-center mt-4 pt-4 border-t-2 border-gray-300">
            <Text className="text-xl font-RobotoBold text-gray-900">Total</Text>
            <Text className="text-xl font-RobotoBold text-[#2563EB]">
              {(confirmationData?.totalPrice || estimatedTotalPrice).toLocaleString()} đ
            </Text>
          </View>
        </View>

        {/* Rental Policy Agreement */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <View className="flex-row items-center">
            <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
            <Text className="text-sm font-RobotoMedium text-gray-700 ml-2">
              By submitting, I agree to the rental policy of the App.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar for Submit Rental */}
      <View className="p-4 bg-white border-t border-gray-200 shadow-lg"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
      >
        <TouchableOpacity
          className="bg-[#2563EB] py-4 rounded-xl shadow-md active:bg-[#1D4ED8]"
          onPress={handleCreateRental}
        >
          <Text className="text-white text-center font-RobotoBold text-lg">Submit Rental Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RentalConfirmation;
