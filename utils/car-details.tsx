import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { vehicleAPI, authAPI, rentalAPI } from '@/services/api';
import { VehicleData, UserData } from '@/types/carData';
import { images } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { showToast } from '@/components/ToastAlert';
import { Button } from 'react-native-paper';
import Swiper from 'react-native-swiper';

const screenWidth = Dimensions.get('window').width;

interface Rating {
  vehicleId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  userNickname?: string;
}

const CarDetails = () => {
  const { id } = useLocalSearchParams();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ nickname: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectingStartDate, setSelectingStartDate] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startDay, setStartDay] = useState<number | null>(null);
  const [endDay, setEndDay] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [userId, setUserId] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('08:00');
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  useEffect(() => {
    const fetchVehicleAndUser = async () => {
      try {
        if (!id || typeof id !== 'string') throw new Error('Invalid vehicle ID');
        const vehicleResponse = await vehicleAPI.getVehicleById(parseInt(id));

        if (vehicleResponse.status === 200 && vehicleResponse.data?.data) {
          const vehicleData = vehicleResponse.data.data;

          // Ensure image fields are strings and provide fallbacks
          const sanitizedVehicleData: VehicleData = {
            ...vehicleData,
            imageFront: String(vehicleData.imageFront),
            imageEnd: String(vehicleData.imageEnd),
            imageRearRight: String(vehicleData.imageRearRight),
            imageRearLeft: String(vehicleData.imageRearLeft),
            imagePic1: String(vehicleData.imagePic1),
            imagePic2: String(vehicleData.imagePic2),
            imagePic3: String(vehicleData.imagePic3),
            imagePic4: String(vehicleData.imagePic4),
            imagePic5: String(vehicleData.imagePic5),
            vehicleRegistrationFront: String(vehicleData.vehicleRegistrationFront),
            vehicleRegistrationBack: String(vehicleData.vehicleRegistrationBack),
          };
          setVehicle(sanitizedVehicleData);
          setStartTime(sanitizedVehicleData.timePickupStart || '08:00');
          setEndTime(sanitizedVehicleData.timeReturnStart || '08:00');
          setError(null);

          if (vehicleData.userId) {
            const userPublicResponse = await authAPI.getUserPublicInfo(vehicleData.userId);
            if (userPublicResponse.status === 200 && userPublicResponse.data?.data) {
              const userData: UserData = userPublicResponse.data.data;
              setOwnerInfo({
                nickname: userData.nickname || 'Unknown',
                avatar: String(userData.avatar || images.avatar),
              });
            } else {
              setOwnerInfo({ nickname: 'Unknown', avatar: images.avatar });
            }
          }

          // Fetch ratings
          await fetchRatings(1);
          const ratingResponse = await vehicleAPI.getAverageRating(parseInt(id));
          if (ratingResponse.status === 200 && ratingResponse.data?.data !== undefined) {
            setAverageRating(ratingResponse.data.data);
          } else {
            setAverageRating(null); // No ratings available
          }
        } else {
          throw new Error(vehicleResponse.data?.message || 'Failed to fetch vehicle data');
        }

        const token = await AsyncStorage.getItem('accessToken');
        if (token && vehicle?.id) { // Ensure vehicle.id is available before proceeding
          const userResponse = await authAPI.getUser();
          if (userResponse.status === 200 && userResponse.data?.data) {
            setUserId(userResponse.data.data.id.toString());
            setUserLevel(userResponse.data.data.accountLevel);

            // Fetch booked dates for the vehicle
            const monthsToCheck = getMonthsToCheck(new Date(), new Date(new Date().getFullYear() + 1, 0, 1));
            const allBookings: any[] = [];
            for (const { month, year } of monthsToCheck) {
              const response = await rentalAPI.checkVehicleAvailability({
                vehicleId: vehicle.id,
                month,
                year,
              });
              if (response.status === 200 && Array.isArray(response.data?.data)) {
                allBookings.push(...response.data.data);
              }
            }
            const dates = new Set<string>();
            allBookings.forEach((booking) => {
              const start = new Date(booking.startDateTime);
              const end = new Date(booking.endDateTime);
              let current = new Date(start);
              while (current <= end) {
                dates.add(current.toISOString().split('T')[0]); // Store as YYYY-MM-DD
                current.setDate(current.getDate() + 1);
              }
            });
            setBookedDates(dates);
          } else {
            throw new Error(userResponse.data?.message || 'User data not found');
          }
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errorCode === 2112
            ? 'Failed to get vehicle by ID.'
            : err.response?.data?.message || 'Could not load vehicle or user details';
        setError(errorMessage);
        console.error('Error fetching vehicle or user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleAndUser();
  }, [id]); // Depend on 'id' to refetch when vehicle ID changes

  const fetchRatings = async (page: number) => {
    if (!id || typeof id !== 'string') return;
    setRatingsLoading(true);
    try {
      const response = await vehicleAPI.getVehicleRatings({
        vehicleId: parseInt(id),
        page,
        limit: 10,
      });
      if (response.status === 200 && response.data?.data) {
        const ratingsData = response.data.data.ratings;
        // Fetch user nicknames for each rating
        const ratingsWithNicknames = await Promise.all(
          ratingsData.map(async (rating: Rating) => {
            try {
              const userResponse = await authAPI.getUserPublicInfo(rating.userId);
              if (userResponse.status === 200 && userResponse.data?.data) {
                return { ...rating, userNickname: userResponse.data.data.nickname || 'Anonymous' };
              }
              return { ...rating, userNickname: 'Anonymous' };
            } catch (err) {
              console.error(`Error fetching user info for userId ${rating.userId}:`, err);
              return { ...rating, userNickname: 'Anonymous' };
            }
          })
        );
        setRatings(ratingsWithNicknames);
        setHasNextPage(response.data.data.hasNextPage);
        setRatingsPage(page);
      } else {
        setRatings([]);
        setHasNextPage(false);
      }
    } catch (err: any) {
      console.error('Error fetching ratings:', err);
      showToast('error', err.response?.data?.message || 'Could not load vehicle ratings');
    } finally {
      setRatingsLoading(false);
    }
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} at ${hours}:${minutes}`;
  };

  const handleChooseTime = () => {
    setShowDatePicker(true);
    setSelectingStartDate(true);
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(new Date().getFullYear());
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };

  const generateTimeOptions = (startTimeStr: string, endTimeStr: string) => {
    const options: string[] = [];
    const start = parseTime(startTimeStr);
    const end = parseTime(endTimeStr);
    let currentHours = start.hours;
    let currentMinutes = start.minutes;

    while (
      currentHours < end.hours ||
      (currentHours === end.hours && currentMinutes <= end.minutes)
    ) {
      options.push(
        `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`
      );
      currentMinutes += 15;
      if (currentMinutes >= 60) {
        currentMinutes = 0;
        currentHours += 1;
      }
    }
    return options;
  };

  const handleDayPress = (day: number) => {
    const time = selectingStartDate ? parseTime(startTime) : parseTime(endTime);
    // Ensure the date string is in a format that Date constructor can reliably parse,
    // and include timezone offset if necessary for consistency.
    // For simplicity, assuming local time for now.
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:00`;
    const selectedDate = new Date(dateStr);

    if (selectingStartDate) {
      setStartDate(selectedDate);
      setStartDay(day);
      setSelectingStartDate(false);
    } else {
      if (startDate && selectedDate <= startDate) { // Check if startDate exists before comparison
        showToast('error', 'End date must be after start date.');
        return;
      }
      setEndDate(selectedDate);
      setEndDay(day);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
    const daysArray: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(null); // Fill leading empty spaces for days before the 1st
    }
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    const pickupTimeOptions = vehicle
      ? generateTimeOptions(vehicle.timePickupStart || '08:00', vehicle.timePickupEnd || '18:00')
      : [];
    const returnTimeOptions = vehicle
      ? generateTimeOptions(vehicle.timeReturnStart || '08:00', vehicle.timeReturnEnd || '18:00')
      : [];

    return (
      <View>
        <View className="flex-row justify-between mb-4 items-center">
          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text className="text-base font-RobotoMedium">
            {new Date(currentYear, currentMonth).toLocaleString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text
              key={day}
              className="w-[14.28%] text-center text-sm font-RobotoBold text-gray-500"
            >
              {day}
            </Text>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {daysArray.map((day, index) => {
            if (!day) {
              return (
                <View
                  key={index}
                  className="w-[14.28%] h-10 items-center justify-center"
                />
              );
            }
            const currentDate = new Date(currentYear, currentMonth, day);
            currentDate.setHours(0, 0, 0, 0); // Normalize for comparison
            const isDisabled = currentDate < today || bookedDates.has(currentDate.toISOString().split('T')[0]);
            const isSelected = (startDate && currentDate.toDateString() === startDate.toDateString()) ||
                             (endDate && currentDate.toDateString() === endDate.toDateString());
            const isInRange = startDate && endDate && currentDate > startDate && currentDate < endDate;


            return (
              <TouchableOpacity
                key={index}
                className={`w-[14.28%] h-10 items-center justify-center rounded-full
                  ${isSelected ? 'bg-[#2563EB]' : ''}
                  ${isInRange ? 'bg-blue-100' : ''}
                  ${isDisabled ? 'opacity-50' : ''}
                `}
                onPress={() => !isDisabled && day && handleDayPress(day)}
                disabled={isDisabled}
              >
                <Text
                  className={`text-sm font-RobotoMedium
                    ${isSelected ? 'text-white' : 'text-black'}
                    ${isDisabled ? 'text-gray-400' : ''}
                  `}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View className="flex-row justify-between mt-4">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-RobotoMedium mb-1">Pickup Time</Text>
            <View className="border border-gray-300 rounded-md">
              <Picker
                selectedValue={startTime}
                onValueChange={(value) => setStartTime(value)}
                style={{ height: 50 }}
              >
                {pickupTimeOptions.map((time) => (
                  <Picker.Item key={time} label={time} value={time} />
                ))}
              </Picker>
            </View>
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-RobotoMedium mb-1">Return Time</Text>
            <View className="border border-gray-300 rounded-md">
              <Picker
                selectedValue={endTime}
                onValueChange={(value) => setEndTime(value)}
                style={{ height: 50 }}
              >
                {returnTimeOptions.map((time) => (
                  <Picker.Item key={time} label={time} value={time} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    );
  };

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
    if (!vehicle?.id || !startDate || !endDate) return false;
    try {
      const monthsToCheck = getMonthsToCheck(startDate, endDate);
      const allBookings = [];
      for (const { month, year } of monthsToCheck) {
        const response = await rentalAPI.checkVehicleAvailability({
          vehicleId: vehicle.id,
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
        // Check for overlap, inclusive start, exclusive end for existing bookings
        // New rental (startDate, endDate) should not overlap with (bookingStart, bookingEnd)
        return (startDate < bookingEnd && endDate > bookingStart);
      });
      return !isBooked;
    } catch (err: any) {
      console.error('Error checking availability:', err);
      showToast('error', 'Could not check vehicle availability.');
      return false;
    }
  };

  const validateTime = (time: string, startWindow: string, endWindow: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const [startHours, startMinutes] = startWindow.split(':').map(Number);
    const [endHours, endMinutes] = endWindow.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startInMinutes = startHours * 60 + startMinutes;
    const endInMinutes = endHours * 60 + endMinutes;
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  };

  const handleBookNow = async () => {
    if (!vehicle || !startDate || !endDate) {
      showToast('error', 'Please select valid rental dates.');
      return;
    }
    if (endDate <= startDate) {
      showToast('error', 'End date must be after start date.');
      return;
    }
    if (!validateTime(startTime, vehicle.timePickupStart, vehicle.timePickupEnd)) {
      showToast('error', `Pickup time must be between ${vehicle.timePickupStart} and ${vehicle.timePickupEnd}.`);
      return;
    }
    if (!validateTime(endTime, vehicle.timeReturnStart, vehicle.timeReturnEnd)) {
      showToast('error', `Return time must be between ${vehicle.timeReturnStart} and ${vehicle.timeReturnEnd}.`);
      return;
    }

    if (userLevel === 1) {
      showToast('info', 'You need to be at level 2 to book a vehicle. Please update your account.');
      router.push('/user/update-to-level-2');
      return;
    }

    const isAvailable = await checkAvailability();
    if (isAvailable) {
      router.push({
        pathname: '/rental/rental-confirmation',
        params: {
          vehicleId: vehicle.id.toString(),
          title: vehicle.title,
          price: vehicle.price.toString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          imageFront: vehicle.imageFront || '',
          owner: ownerInfo?.nickname,
          avatar: ownerInfo?.avatar || '',
        },
      });
    } else {
      showToast('error', 'Vehicle is not available for the selected dates.');
    }
  };

  const handleDeleteVehicle = async () => {
    if (vehicle && vehicle.id) {
      try {
        const response = await vehicleAPI.deleteVehicle(vehicle.id.toString());
        if (response.data.status === 200) {
          showToast('success', 'Vehicle deleted successfully');
          router.push('/(root)/(tabs)/home');
        } else {
          throw new Error(response.data?.message || 'Failed to delete vehicle');
        }
      } catch (err: any) {
        const errorMessage = getErrorMessage(err);
        showToast('error', errorMessage);
        console.error('Error deleting vehicle:', errorMessage);
      }
    }
  };

  const getErrorMessage = (error: any) => {
    const code = error.response?.data?.errorCode;
    switch (code) {
      case 2002:
        return 'Vehicle not found.';
      case 2005:
        return 'You don\'t have permission to delete this vehicle.';
      case 2017:
        return 'Failed to delete vehicle.';
      case 9001:
        return 'Unknown error.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const totalPrice = vehicle ? (vehicle.price * calculateDays()) : 0;

  const mockLocation = {
    latitude: 10.7769,
    longitude: 106.7009,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error || !vehicle) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error || 'Vehicle not found'}</Text>
      </SafeAreaView>
    );
  }

  const vehicleImages = [
    vehicle.imageFront,
    vehicle.imageEnd,
    vehicle.imageRearRight,
    vehicle.imageRearLeft,
    vehicle.imagePic1,
    vehicle.imagePic2,
    vehicle.imagePic3,
    vehicle.imagePic4,
    vehicle.imagePic5,
  ].filter((img) => img && typeof img === 'string' && img !== images.vinfast); // Filter out placeholder if it's the only image

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center">{vehicle.title}</Text>
          {userId && vehicle.userId.toString() === userId && ( // Only show delete if current user is owner
            <TouchableOpacity className="p-2" onPress={handleDeleteVehicle}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Image Swiper */}
        <View className="rounded-xl overflow-hidden mt-4 mx-4 bg-white shadow-md">
          <Swiper
            style={{ height: 300 }}
            loop={false}
            showsButtons={false}
            dotStyle={{ backgroundColor: 'rgba(0,0,0,.2)', width: 8, height: 8, borderRadius: 4, marginHorizontal: 3 }}
            activeDotStyle={{ backgroundColor: '#2563EB', width: 8, height: 8, borderRadius: 4, marginHorizontal: 3 }}
            paginationStyle={{ bottom: 10 }}
            renderPagination={(index, total) => (
              <View className="absolute bottom-4 right-4 items-center justify-center py-1 px-3 bg-black/60 rounded-full">
                <Text className='text-white font-RobotoMedium text-xs'>
                  {index + 1} / {total}
                </Text>
              </View>
            )}
          >
            {vehicleImages.length > 0 ? vehicleImages.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={{ width: screenWidth - 32, height: 300, borderRadius: 12 }} // Adjusted for horizontal padding
                resizeMode="cover"
                onError={(e) => console.log(`Image load error for ${img}:`, e.nativeEvent.error)}
              />
            )) : (
              <Image
                source={images.vinfast}
                style={{ width: screenWidth - 32, height: 300, borderRadius: 12 }}
                resizeMode="cover"
              />
            )}
          </Swiper>
        </View>

        {/* Select Dates Card */}
        <TouchableOpacity
          onPress={handleChooseTime}
          className="mt-4 mx-4 p-4 rounded-xl border border-gray-200 bg-white flex-row items-center justify-between shadow-sm"
        >
          <Feather name="calendar" size={20} color="#6B7280" />
          <View className="flex-1 ml-4">
            <Text className="text-base font-RobotoMedium text-gray-800">
              {startDate && endDate
                ? `${formatDateTime(startDate).split(' at ')[0]} - ${formatDateTime(endDate).split(' at ')[0]}`
                : 'Select rental dates'}
            </Text>
            {startDate && endDate && (
              <Text className="text-sm font-RobotoRegular text-gray-500 mt-1">
                Pickup: {formatDateTime(startDate).split(' at ')[1]} | Return: {formatDateTime(endDate).split(' at ')[1]}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>

        {/* Vehicle Info Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-2xl font-RobotoBold text-gray-900 mb-2">{vehicle.title}</Text>
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: ownerInfo?.avatar || images.avatar }}
              className="w-10 h-10 rounded-full mr-3 border border-gray-200"
              resizeMode="cover"
            />
            <Text className="text-base text-gray-700 font-RobotoMedium">
              {ownerInfo?.nickname || 'Unknown'}
            </Text>
            {averageRating !== null && (
              <View className="flex-row items-center ml-auto">
                <Text className="text-base font-RobotoBold text-[#2563EB] mr-1">{averageRating.toFixed(1)}</Text>
                <Ionicons name="star" size={18} color="#2563EB" />
              </View>
            )}
          </View>
          {vehicle.description && (
            <Text className="text-sm text-gray-600 font-RobotoRegular leading-5">
              {vehicle.description}
            </Text>
          )}
        </View>

        {/* Specifications Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Specifications</Text>
          <View className="flex-row flex-wrap justify-between">
            {[
              { label: 'Brand', value: vehicle.brand },
              { label: 'Model', value: vehicle.model },
              { label: 'Year', value: vehicle.year },
              { label: 'Type', value: vehicle.vehicleType },
              { label: 'Engine', value: vehicle.engine },
              { label: 'Color', value: vehicle.color },
              { label: 'Transmission', value: vehicle.transmission },
              { label: 'Seating', value: vehicle.seatingCapacity },
              { label: 'Fuel Type', value: vehicle.fuelType },
            ].map((item, index) => (
              <View key={index} className="w-[48%] mb-4">
                <Text className="text-xs text-gray-500 font-RobotoMedium">{item.label}</Text>
                <Text className="text-base font-RobotoBold text-gray-800 mt-1">{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Vehicle Features</Text>
          <View className="flex-row flex-wrap">
            {[
              { label: 'Air Conditioning', icon: 'snow-outline', condition: vehicle.airConditioning },
              { label: 'GPS Navigation', icon: 'navigate-outline', condition: vehicle.gps },
              { label: 'Bluetooth', icon: 'bluetooth-outline', condition: vehicle.bluetooth },
              { label: 'In-car Map', icon: 'map-outline', condition: vehicle.map },
              { label: 'Dash Camera', icon: 'videocam-outline', condition: vehicle.dashCamera },
              { label: 'Rear Camera', icon: 'camera-outline', condition: vehicle.cameraBack },
              { label: 'Collision Sensors', icon: 'alert-circle-outline', condition: vehicle.collisionSensors },
              { label: 'Electronic Toll Collection', icon: 'card-outline', condition: vehicle.ETC },
              { label: 'Safety Airbags', icon: 'shield-outline', condition: vehicle.safetyAirBag }, // Changed Feather to Ionicons
            ].map((feature, index) => feature.condition && (
              <View key={index} className="w-1/2 flex-row items-center mb-3">
                <Ionicons name={feature.icon as any} size={20} color="#2563EB" className="mr-2" />
                <Text className="text-sm font-RobotoMedium text-gray-700">{feature.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Location Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Location</Text>
          <Text className="text-sm text-gray-600 font-RobotoMedium mb-3">
            {`${vehicle.address}, ${vehicle.ward}, ${vehicle.district}, ${vehicle.city}`}
          </Text>
          {vehicle.latitude && vehicle.longitude && !isNaN(vehicle.latitude) && !isNaN(vehicle.longitude) ? (
            <View style={{ borderRadius: 12, overflow: 'hidden', elevation: 2, height: 200 }}>
              <MapView
                style={{ width: '100%', height: '100%' }}
                initialRegion={{
                  latitude: vehicle.latitude,
                  longitude: vehicle.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={{ latitude: vehicle.latitude, longitude: vehicle.longitude }} />
              </MapView>
            </View>
          ) : (
            <View style={{ borderRadius: 12, overflow: 'hidden', elevation: 2, height: 200 }}>
              <MapView style={{ width: '100%', height: '100%' }} region={mockLocation}>
                <Marker
                  coordinate={mockLocation}
                  title={vehicle.title}
                  description={`${vehicle.address}, ${vehicle.ward}, ${vehicle.district}, ${vehicle.city}`}
                />
              </MapView>
            </View>
          )}
        </View>

        {/* Pickup and Return Times Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Operating Hours</Text>
          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={20} color="#2563EB" className="mr-2" />
            <Text className="text-base text-gray-700 font-RobotoMedium">
              Pickup: {vehicle.timePickupStart} - {vehicle.timePickupEnd}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={20} color="#2563EB" className="mr-2" />
            <Text className="text-base text-gray-700 font-RobotoMedium">
              Return: {vehicle.timeReturnStart} - {vehicle.timeReturnEnd}
            </Text>
          </View>
        </View>

        {/* User Reviews Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md mb-4">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">User Reviews</Text>
          {ratingsLoading ? (
            <ActivityIndicator size="small" color="#2563EB" className="mt-2" />
          ) : ratings.length > 0 ? (
            <View className="mt-2">
              {ratings.map((rating, index) => (
                <View key={index} className="border-b border-gray-100 py-3 last:border-b-0">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-base font-RobotoBold text-gray-800 mr-1">{rating.rating.toFixed(1)}</Text>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text className="text-sm text-gray-600 font-RobotoMedium ml-2">
                        by {rating.userNickname}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 font-RobotoRegular">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-sm font-RobotoRegular text-gray-700 mt-2">{rating.comment}</Text>
                </View>
              ))}
              {hasNextPage && (
                <Button
                  mode="text"
                  onPress={() => fetchRatings(ratingsPage + 1)}
                  textColor="#2563EB"
                  style={{ marginTop: 12 }}
                >
                  Load More Reviews
                </Button>
              )}
            </View>
          ) : (
            <Text className="text-sm text-gray-600 font-RobotoMedium mt-2">
              No reviews available for this vehicle yet. Be the first to review!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar for Booking */}
      <View
        className="bg-white p-4 flex-row items-center justify-between border-t border-gray-200 shadow-lg"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
      >
        <View>
          <Text className="text-sm text-gray-500 font-RobotoMedium">Total Cost</Text>
          <Text className="text-2xl font-RobotoBold text-[#2563EB]">
            {totalPrice.toLocaleString()} VND
          </Text>
          <Text className="text-xs text-gray-500 font-RobotoMedium">
            Duration: {calculateDays()} day{calculateDays() > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleBookNow}
          className="bg-[#2563EB] py-3 px-6 rounded-xl shadow-md active:bg-[#1D4ED8]"
        >
          <Text className="text-white text-lg font-RobotoBold">Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal transparent={true} visible={showDatePicker} animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-5 rounded-xl w-11/12 shadow-lg">
            <Text className="text-xl font-RobotoBold text-gray-800 mb-4 text-center">
              {selectingStartDate ? 'Select Pickup Date & Time' : 'Select Return Date & Time'}
            </Text>
            {renderCalendar()}
            <View className="flex-row justify-between mt-6">
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className="py-3 px-6 rounded-lg border border-gray-300"
              >
                <Text className="text-gray-700 font-RobotoMedium">CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (selectingStartDate) {
                    if (!startDate) {
                      showToast('error', 'Please select a pickup date.');
                      return;
                    }
                    setSelectingStartDate(false);
                  } else {
                    if (!endDate) {
                      showToast('error', 'Please select a return date.');
                      return;
                    }
                    setShowDatePicker(false);
                  }
                }}
                className="bg-[#2563EB] py-3 px-6 rounded-lg"
              >
                <Text className="text-white font-RobotoBold">
                  {selectingStartDate ? 'NEXT' : 'CONFIRM'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CarDetails;
