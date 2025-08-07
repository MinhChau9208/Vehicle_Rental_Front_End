import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { vehicleAPI, authAPI } from '@/services/api';
import { VehicleData, UserData } from '@/types/carData';
import { images } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { showToast } from '@/components/ToastAlert';
import { Button } from 'react-native-paper';
import Swiper from 'react-native-swiper';
import { mockLocation } from '@/constants/constants';

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
  const { id, startDate: startDateParam, endDate: endDateParam } = useLocalSearchParams();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ nickname: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  useEffect(() => {
    if (startDateParam) setStartDate(new Date(startDateParam as string));
    if (endDateParam) setEndDate(new Date(endDateParam as string));
  }, [startDateParam, endDateParam]);

  useEffect(() => {
    const fetchVehicleAndUser = async () => {
      try {
        if (!id || typeof id !== 'string') throw new Error('Invalid vehicle ID');
        setLoading(true);
        const vehicleResponse = await vehicleAPI.getVehicleById(parseInt(id));

        if (vehicleResponse.status === 200 && vehicleResponse.data?.data) {
          const vehicleData = vehicleResponse.data.data;
          const sanitizedVehicleData: VehicleData = { ...vehicleData };
          setVehicle(sanitizedVehicleData);
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

          await fetchRatings(1);
          const ratingResponse = await vehicleAPI.getAverageRating(parseInt(id));
          if (ratingResponse.status === 200 && ratingResponse.data?.data !== undefined) {
            setAverageRating(ratingResponse.data.data);
          } else {
            setAverageRating(null);
          }
        } else {
          throw new Error(vehicleResponse.data?.message || 'Failed to fetch vehicle data');
        }

        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const userResponse = await authAPI.getUser();
          if (userResponse.status === 200 && userResponse.data?.data) {
            setUserId(userResponse.data.data.id.toString());
            setUserLevel(userResponse.data.data.accountLevel);
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
  }, [id]);

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
        const ratingsWithNicknames = await Promise.all(
          ratingsData.map(async (rating: Rating) => {
            try {
              const userResponse = await authAPI.getUserPublicInfo(rating.userId);
              return { ...rating, userNickname: userResponse.data?.data?.nickname || 'Anonymous' };
            } catch {
              return { ...rating, userNickname: 'Anonymous' };
            }
          })
        );
        setRatings((prev) => (page === 1 ? ratingsWithNicknames : [...prev, ...ratingsWithNicknames]));
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

  const handleChooseTime = () => {
    router.replace({
      pathname: '/vehicle/date-time-picker',
      params: {
        vehicleId: id,
        timePickupStart: vehicle?.timePickupStart,
        timePickupEnd: vehicle?.timePickupEnd,
        timeReturnStart: vehicle?.timeReturnStart,
        timeReturnEnd: vehicle?.timeReturnEnd,
      },
    });
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
    if (userLevel === 1) {
      showToast('info', 'You need to be at level 2 to book a vehicle. Please update your account.');
      router.push('/user/update-to-level-2');
      return;
    }

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
        rating: averageRating || 0,
      },
    });
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return { date: '', time: '' };
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return { date: `${day}/${month}/${year}`, time: `${hours}:${minutes}` };
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const totalPrice = vehicle ? vehicle.price * calculateDays() : 0;

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
  ].filter((img) => img && typeof img === 'string' && img !== images.vinfast);


  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center">{vehicle.title}</Text>
        </View>

        {/* Image Swiper */}
        <View className="rounded-xl overflow-hidden mt-4 mx-4 bg-white shadow-md">
          <Swiper
            style={{ height: 300 }}
            loop={false}
            dotStyle={{ backgroundColor: 'rgba(0,0,0,.2)' }}
            activeDotStyle={{ backgroundColor: '#2563EB' }}
            paginationStyle={{ bottom: 10 }}
          >
            {vehicleImages.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={{ width: screenWidth - 32, height: 300 }} resizeMode="cover" />
            ))}
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
                ? `${formatDateTime(startDate).date} - ${formatDateTime(endDate).date}`
                : 'Select rental dates'}
            </Text>
            {startDate && endDate && (
              <Text className="text-sm font-RobotoRegular text-gray-500 mt-1">
                Pickup: {formatDateTime(startDate).time} | Return: {formatDateTime(endDate).time}
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
                {averageRating > 0 ? (
                  <Text className="text-base font-RobotoBold text-yellow-600 ml-1">{averageRating.toFixed(1)}</Text>
                ) : (
                  <Text className="text-base font-RobotoMedium text-gray-500 ml-1">No rating</Text>
                )}
                <Ionicons name="star" size={18} color="#FFD700" />
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
              { label: 'Safety Airbags', icon: 'shield-outline', condition: vehicle.safetyAirBag },
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
          <Text className="font-RobotoBold text-gray-800 mb-3">Location</Text>
          <Text className="text-gray-600 font-RobotoMedium mb-3">
            {` ${vehicle.ward}, ${vehicle.district}, ${vehicle.city}`}
          </Text>
          <View style={{ borderRadius: 12, overflow: 'hidden', elevation: 2, height: 200 }}>
            <MapView style={{ width: '100%', height: '100%' }} region={mockLocation}>
              <Marker
                coordinate={mockLocation}
                title={vehicle.title}
                description={`${vehicle.address}, ${vehicle.ward}, ${vehicle.district}, ${vehicle.city}`}
              />
            </MapView>
          </View>
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

      {/* Bottom Bar for Booking */}
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
    </SafeAreaView>
  );
};

export default CarDetails;