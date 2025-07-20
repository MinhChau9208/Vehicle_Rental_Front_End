import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { vehicleAPI, authAPI } from '@/services/api';
import { VehicleData, UserData } from '@/types/carData';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Cards from '@/components/Cards';

interface PaginationData {
  vehicles: VehicleData[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface VehicleConstants {
  vehicleType: string[];
  carBrand: string[];
  motorcycleBrand: string[];
  color: string[];
}

const CarListing = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    vehicleType?: string;
    brand?: string;
    model?: string;
    color?: string;
    city?: string;
    startDate?: string;
    endDate?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [userCache, setUserCache] = useState<Record<number, UserData>>({});
  const [pagination, setPagination] = useState<PaginationData>({
    vehicles: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    title: params.title || '',
    vehicleType: params.vehicleType || 'car',
    brand: params.brand || '',
    model: params.model || '',
    color: params.color || '',
    year: '',
    city: params.city || '',
    district: '',
  });
  const [constants, setConstants] = useState<VehicleConstants>({
    vehicleType: ['car', 'motorcycle'],
    carBrand: [],
    motorcycleBrand: [],
    color: [],
  });
  const [models, setModels] = useState<string[]>([]);

  const fetchConstants = useCallback(async () => {
    try {
      const response = await vehicleAPI.getVehicleConstants();
      if (response.status === 200 && response.data?.data) {
        setConstants(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching constants:', err);
    }
  }, []);

  const fetchModels = useCallback(async (vehicleType: string, brand: string) => {
    if (!vehicleType || !brand) {
      setModels([]);
      return;
    }
    try {
      const response = await vehicleAPI.getModelByBrand(vehicleType, brand);
      if (response.status === 200 && response.data?.data) {
        setModels(response.data.data);
      } else {
        setModels([]);
      }
    } catch (err: any) {
      console.error('Error fetching models:', err);
      setModels([]);
      if (err.response?.data?.errorCode === 2001 || err.response?.data?.errorCode === 2002) {
        setError('Invalid vehicle type or brand.');
      }
    }
  }, []);

  const formatDateDisplay = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
    return `${hours}:00 ${dayOfWeek} ${day}/${month}`;
  }, []);

  const getDateRangeDisplay = useCallback(() => {
    if (params.startDate && params.endDate) {
      return `${formatDateDisplay(params.startDate)} • ${formatDateDisplay(params.endDate)}`;
    }
    return '';
  }, [params.startDate, params.endDate, formatDateDisplay]);

  const fetchVehicles = useCallback(
    async (page: number = 1, limit: number = 10, isRefresh: boolean = false) => {
      try {
        setLoading(!isRefresh);
        if (isRefresh) setRefreshing(true);
        const response = await vehicleAPI.getFilteredVehicles({
          page,
          limit,
          ...filters,
          year: filters.year ? parseInt(filters.year) : undefined,
        });

        if (response.status === 200 && response.data?.data) {
          const { vehicles: rawVehicles, total, currentPage, totalPages, hasNextPage, hasPreviousPage } =
            response.data.data;

          const normalizedVehicles: VehicleData[] = rawVehicles.map((item: any) => ({
            ...item.vehicle,
            last30daysViews: item.last30daysViews || 0,
            totalViews: item.totalViews || 0,
          }));

          setVehicles(normalizedVehicles);
          setPagination({
            vehicles: normalizedVehicles,
            total,
            currentPage,
            totalPages,
            hasNextPage,
            hasPreviousPage,
          });
          setError(null);

          const uniqueUserIds = [...new Set(normalizedVehicles.map((vehicle) => vehicle.userId))];
          const userPromises = uniqueUserIds.map(async (userId) => {
            if (!userCache[userId]) {
              const userResponse = await authAPI.getUserPublicInfo(userId);
              if (userResponse.status === 200 && userResponse.data?.data) {
                setUserCache((prev) => ({
                  ...prev,
                  [userId]: {
                    id: userId.toString(),
                    nickname: userResponse.data.data.nickname,
                    avatar: userResponse.data.data.avatar || '',
                    level: 1,
                  },
                }));
              } else {
                setUserCache((prev) => ({
                  ...prev,
                  [userId]: {
                    id: userId.toString(),
                    nickname: 'Unknown User',
                    avatar: '',
                    level: 1,
                  },
                }));
              }
            }
          });
          await Promise.all(userPromises);
        } else {
          throw new Error('Could not load vehicles');
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errorCode === 2115
            ? 'Failed to fetch filtered vehicles.'
            : err.response?.data?.message || 'Could not load vehicles';
        console.error('Error fetching vehicles:', err);
        setError(errorMessage);
        if (errorMessage.includes('sign in again')) {
          router.replace('/(auth)/sign-in');
        }
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [filters, userCache]
  );

  const onRefresh = useCallback(() => {
    setVehicles([]);
    setUserCache({});
    fetchVehicles(1, 10, true);
  }, [fetchVehicles]);

  useEffect(() => {
    fetchVehicles();
    fetchConstants();
  }, [fetchVehicles, fetchConstants]);

  useEffect(() => {
    fetchModels(filters.vehicleType, filters.brand);
  }, [filters.vehicleType, filters.brand, fetchModels]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages && !loading) {
      fetchVehicles(page);
    }
  };

  const applyFilters = () => {
    setVehicles([]);
    setUserCache({});
    fetchVehicles(1);
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setFilters({
      title: '',
      vehicleType: 'car',
      brand: '',
      model: '',
      color: '',
      year: '',
      city: '',
      district: '',
    });
    setModels([]);
  };

  const renderHeader = () => (
    <View className="bg-white">
      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="font-RobotoMedium text-base">{filters.city || 'TP. Hồ Chí Minh'}</Text>
          <Text className="text-xs text-gray-500">{getDateRangeDisplay()}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowFilterModal(true)}>
          <MaterialIcons name="filter-list" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View className="py-4 px-4 flex-row items-center justify-between">
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <>
          <TouchableOpacity
            className={`py-3 px-6 rounded-md ${pagination.hasPreviousPage ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
            onPress={() => goToPage(pagination.currentPage - 1)}
            disabled={!pagination.hasPreviousPage}
          >
            <Text
              className={`font-RobotoMedium text-base ${pagination.hasPreviousPage ? 'text-white' : 'text-gray-500'}`}
            >
              Previous
            </Text>
          </TouchableOpacity>
          <Text className="text-base font-RobotoMedium text-black">
            Page {pagination.currentPage} of {pagination.totalPages}
          </Text>
          <TouchableOpacity
            className={`py-3 px-6 rounded-md ${pagination.hasNextPage ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
            onPress={() => goToPage(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            <Text
              className={`font-RobotoMedium text-base ${pagination.hasPreviousPage ? 'text-white' : 'text-gray-500'}`}
            >
              Next
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <FlatList
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        data={vehicles}
        renderItem={({ item }) => (
          <Cards
            vehicle={item}
            user={{
              id: item.userId.toString(),
              nickname: userCache[item.userId]?.nickname || 'Unknown User',
              avatar: userCache[item.userId]?.avatar || '',
              level: 1,
            }}
            views={item.totalViews}
            onPress={() =>
              router.push({
                pathname: '/vehicle/car-details',
                params: { id: item.id },
              })
            }
          />
        )}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        numColumns={2}
        columnWrapperClassName="flex gap-3 px-5"
        contentContainerClassName="pb-32"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        ListEmptyComponent={
          loading && pagination.currentPage === 1 ? (
            <ActivityIndicator size="large" color="#2563EB" />
          ) : (
            <Text className="text-center text-gray-500 font-RobotoMedium mt-4">{error || 'No vehicles found'}</Text>
          )
        }
      />
      <Modal visible={showFilterModal} animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-lg font-RobotoMedium">Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text className="text-[#2563EB] font-RobotoMedium">Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="p-4">
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">Title</Text>
              <TextInput
                className="border border-gray-300 rounded-md p-2 h-[50px]"
                value={filters.title}
                onChangeText={(text) => setFilters({ ...filters, title: text })}
                placeholder="Enter vehicle title"
              />
            </View>
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">Vehicle Type</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.vehicleType}
                  onValueChange={(value) => setFilters({ ...filters, vehicleType: value, brand: '', model: '' })}
                  style={{ height: 50 }}
                >
                  {constants.vehicleType.map((type) => (
                    <Picker.Item
                      key={type}
                      label={type.charAt(0).toUpperCase() + type.slice(1)}
                      value={type}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">Brand</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.brand}
                  onValueChange={(value) => setFilters({ ...filters, brand: value, model: '' })}
                  style={{ height: 50 }}
                  enabled={filters.vehicleType !== ''}
                >
                  <Picker.Item label="Select a brand" value="" />
                  {(filters.vehicleType === 'car' ? constants.carBrand : constants.motorcycleBrand).map((brand) => (
                    <Picker.Item key={brand} label={brand} value={brand} />
                  ))}
                </Picker>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">Model</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.model}
                  onValueChange={(value) => setFilters({ ...filters, model: value })}
                  style={{ height: 50 }}
                  enabled={filters.brand !== ''}
                >
                  <Picker.Item label="Select a model" value="" />
                  {models.map((model) => (
                    <Picker.Item key={model} label={model} value={model} />
                  ))}
                </Picker>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">Color</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.color}
                  onValueChange={(value) => setFilters({ ...filters, color: value })}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="Select a color" value="" />
                  {constants.color.map((color) => (
                    <Picker.Item key={color} label={color} value={color} />
                  ))}
                </Picker>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">Year</Text>
              <TextInput
                className="border border-gray-300 rounded-md p-2 h-[50px]"
                value={filters.year}
                onChangeText={(text) => setFilters({ ...filters, year: text })}
                placeholder="Enter year (e.g., 2023)"
                keyboardType="numeric"
              />
            </View>
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">City</Text>
              <TextInput
                className="border border-gray-300 rounded-md p-2 h-[50px]"
                value={filters.city}
                onChangeText={(text) => setFilters({ ...filters, city: text })}
                placeholder="Enter city (e.g., TP. Hồ Chí Minh)"
              />
            </View>
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">District</Text>
              <TextInput
                className="border border-gray-300 rounded-md p-2 h-[50px]"
                value={filters.district}
                onChangeText={(text) => setFilters({ ...filters, district: text })}
                placeholder="Enter district (e.g., Quận 1)"
              />
            </View>
            <TouchableOpacity
              className="bg-[#2563EB] py-3 rounded-md items-center mt-4"
              onPress={applyFilters}
            >
              <Text className="text-white font-RobotoMedium text-base">Apply Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default CarListing;