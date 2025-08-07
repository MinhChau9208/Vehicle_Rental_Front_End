import React, { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Text, View, Image, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { icons, images } from '@/constants';
import { MaterialIcons } from '@expo/vector-icons';
import Cards from '@/components/Cards';
import Filters from '@/components/Filters';
import CustomDropdown from '@/components/CustomDropdown';
import { vehicleAPI, authAPI } from '@/services/api';
import { UserData, VehicleData } from '@/types/carData';
import { showToast } from '@/components/ToastAlert';
import { PaginationData, VehicleConstants } from '@/types/carData';
import FilterModal from '@/components/modal/FilterModal';

const SearchInput = forwardRef(({ onSearch }, ref) => {
  const [searchText, setSearchText] = useState('');

  const handleSubmit = () => {
    onSearch(searchText);
  };

  useImperativeHandle(ref, () => ({
    getSearchText: () => searchText,
  }));

  return (
    <TextInput
      className="flex-1 border border-gray-300 rounded-md p-2 mr-2 text-sm font-RobotoMedium text-black"
      value={searchText}
      onChangeText={setSearchText}
      placeholder="Search"
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
      onSubmitEditing={handleSubmit}
    />
  );
});

const Home = () => {
  const { filter = 'newest' } = useLocalSearchParams<{ filter?: string }>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    vehicleType: 'car',
    brand: '',
    model: '',
    color: '',
    city: '',
    district: '',
  });
  const [constants, setConstants] = useState<VehicleConstants>({
    vehicleType: ['car', 'motorcycle'],
    carBrand: [],
    motorcycleBrand: [],
    color: [],
  });
  const [models, setModels] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [userCache, setUserCache] = useState<Record<number, UserData>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    vehicles: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [provinces, setProvinces] = useState<{ label: string; value: string; code: string }[]>([]);
  const [districts, setDistricts] = useState<{ label: string; value: string; code: string }[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
  const [favoriteVehicles, setFavoriteVehicles] = useState<Set<number>>(new Set());

  const searchInputRef = useRef(null);

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

  const fetchVehicles = useCallback(
    async (page: number = 1, limit: number = 10, isRefresh: boolean = false, append: boolean = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(!isRefresh);
        if (isRefresh) setRefreshing(true);
        let response;
        if (filter === 'most_viewed_30_days') {
          response = await vehicleAPI.getMostViewedVehicles30Days({ page, limit });
        } else if (filter === 'most_viewed_all_time') {
          response = await vehicleAPI.getMostViewedVehicles({ page, limit });
        } else if (filter === 'random') {
          response = await vehicleAPI.getRandomApprovedVehicles({ page, limit });
        } else {
          response = await vehicleAPI.getRecentApprovedVehicles({ page, limit });
        }

        if (response.status === 200 && response.data?.data) {
          const { vehicles: rawVehicles, total, currentPage, totalPages, hasNextPage, hasPreviousPage } = response.data.data;
          const normalizedVehicles: VehicleData[] = rawVehicles.map((item: any) => ({
            ...item.vehicle,
            last30daysViews: item.last30daysViews || 0,
            totalViews: item.totalViews || 0,
          }));

          setVehicles((prev) => (append ? [...prev, ...normalizedVehicles] : normalizedVehicles));
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
                setUserCache((prev) => ({ ...prev, [userId]: userResponse.data.data }));
              } else {
                setUserCache((prev) => ({ ...prev, [userId]: { nickname: 'Unknown' } }));
              }
            }
          });

          const uniqueVehicleIds = [...new Set(normalizedVehicles.map((vehicle) => vehicle.id))];
          const ratingPromises = uniqueVehicleIds.map(async (vehicleId) => {
            if (vehicleId === undefined) return;
            const id = vehicleId as number;
            try {
              const ratingResponse = await vehicleAPI.getAverageRating(id);
              if (ratingResponse.status === 200 && ratingResponse.data?.data !== undefined) {
                setRatings((prev) => ({ ...prev, [id]: ratingResponse.data.data }));
              } else {
                setRatings((prev) => ({ ...prev, [id]: 0 }));
              }
            } catch (error) {
              setRatings((prev) => ({ ...prev, [id]: 0 }));
            }
          });

          await Promise.all([...userPromises, ...ratingPromises]);
        } else {
          throw new Error('Could not load vehicles');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Could not load vehicles';
        console.error('Error fetching vehicles:', err);
        setError(errorMessage);
        if (errorMessage.includes('sign in again')) {
          router.replace('/(auth)/sign-in');
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [filter, userCache]
  );

  const fetchUser = async () => {
    try {
      const response = await authAPI.getUser();
      if (response.status === 200 && response.data?.data) {
        const { id, nickname, avatar, accountLevel } = response.data.data;
        setUserData({ id: id.toString(), nickname: nickname || 'User', avatar: avatar || '', level: accountLevel || 1 });
        setError(null);
      } else {
        throw new Error('User data not found');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 1012
          ? 'Token not provided. Please sign in again.'
          : err.response?.data?.errorCode === 1111
            ? 'Failed to get user info.'
            : err.message || 'Could not load user data.';
      console.error('Error fetching user:', err);
      setError(errorMessage);
      if (errorMessage.includes('sign in again')) {
        router.replace('/(auth)/sign-in');
      }
    }
  };

  const fetchFavorites = useCallback(async () => {
    try {
      // We fetch a large limit to get all favorite IDs for the UI check.
      // The API supports pagination, but for checking hearts on the home screen,
      // we need all of them upfront.
      const response = await vehicleAPI.getFavoriteVehicles(1, 999);
      if (response.status === 200 && response.data?.data?.favoriteVehicles) {
        const favoriteIds = new Set(response.data.data.favoriteVehicles.map((fav: any) => fav.vehicleId));
        setFavoriteVehicles(favoriteIds);
      }
    } catch (err) {
      // We don't show a toast here to avoid bothering the user on app load.
      console.error('Could not fetch initial favorites list:', err);
    }
  }, []);

  const fetchProvinces = async () => {
    try {
      const response = await vehicleAPI.getProvinces();
      if (response.status === 200 && response.data?.data) {
        const provinceData = response.data.data.map(([code, name]: [string, string]) => ({
          label: name,
          value: name,
          code,
        }));
        setProvinces(provinceData);
      } else {
        showToast('error', 'Could not load cities.');
      }
    } catch (err) {
      console.error('Error fetching provinces:', err);
      showToast('error', 'Could not load cities.');
    }
  };

  const fetchDistricts = async () => {
    if (selectedProvinceCode) {
      try {
        const response = await vehicleAPI.getDistricts(selectedProvinceCode);
        if (response.status === 200 && response.data?.data) {
          const districtData = response.data.data.map(([code, name]: [string, string]) => ({
            label: name,
            value: name,
            code,
          }));
          setDistricts(districtData);
        } else {
          setDistricts([]);
          showToast('error', 'Could not load districts.');
        }
      } catch (err) {
        console.error('Error fetching districts:', err);
        setDistricts([]);
        showToast('error', 'Could not load districts.');
      }
    } else {
      setDistricts([]);
    }
  };
  useEffect(() => {
    fetchUser();
    fetchVehicles();
    fetchConstants();
    fetchProvinces();
    fetchFavorites();
  }, [fetchVehicles, fetchConstants, fetchFavorites]);

  useEffect(() => {
    fetchDistricts();
  }, [selectedProvinceCode]);

  useEffect(() => {
    fetchVehicles(1);
  }, [filter, fetchVehicles]);

  useEffect(() => {
    fetchModels(filters.vehicleType, filters.brand);
  }, [filters.vehicleType, filters.brand, fetchModels]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSearch = (text: string) => {
    if (!text.trim()) {
      showToast('error', 'Please enter a search term.');
      return;
    }
    router.push({
      pathname: '/(root)/(screens)/vehicle/car-listing',
      params: {
        title: text,
        vehicleType: filters.vehicleType,
        brand: filters.brand,
        model: filters.model,
        color: filters.color,
        city: filters.city,
        district: filters.district,
      },
    });
  };

  const handleApplyFilters = () => {
    const text = searchInputRef.current?.getSearchText() || '';
    router.push({
      pathname: '/(root)/(screens)/vehicle/car-listing',
      params: {
        title: text,
        ...filters,
      },
    });
    setShowFilterModal(false);
  };

  const handleToggleFavorite = async (vehicleId: number) => {
    if (!vehicleId) return;

    const isCurrentlyFavorite = favoriteVehicles.has(vehicleId);

    const newFavorites = new Set(favoriteVehicles);
    if (isCurrentlyFavorite) {
      newFavorites.delete(vehicleId);
    } else {
      newFavorites.add(vehicleId);
    }
    setFavoriteVehicles(newFavorites);

    try {
      if (isCurrentlyFavorite) {
        await vehicleAPI.deleteFavoriteVehicle(vehicleId);
        showToast('success', 'Removed from favorites.');
      } else {
        await vehicleAPI.createFavoriteVehicle(vehicleId);
        showToast('success', 'Added to favorites.');
      }
    } catch (err: any) {
      // If the API call fails, revert the UI change
      setFavoriteVehicles(favoriteVehicles);
      const errorMessage = err.response?.data?.message || 'An error occurred.';
      showToast('error', errorMessage);
      console.error('Error toggling favorite:', err);
    }
  };

  const onRefresh = useCallback(() => {
    setVehicles([]);
    setUserCache({});
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchUser();
    fetchVehicles(1, 10, true);
    fetchFavorites();
  }, [fetchVehicles]);

  const loadMoreVehicles = useCallback(() => {
    if (pagination.hasNextPage && !loading && !loadingMore) {
      fetchVehicles(pagination.currentPage + 1, 10, false, true);
    }
  }, [fetchVehicles, pagination.hasNextPage, pagination.currentPage, loading, loadingMore]);

  const resetFilters = () => {
    setFilters({
      vehicleType: 'car',
      brand: '',
      model: '',
      color: '',
      city: '',
      district: '',
    });
    setModels([]);
    setSelectedProvinceCode('');
    setDistricts([]);
  };

  const vehicleTypeData = constants.vehicleType.map((type) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type,
  }));

  const brandData = (filters.vehicleType === 'car' ? constants.carBrand : constants.motorcycleBrand).map((brand) => ({
    label: brand,
    value: brand,
  }));

  const modelData = models.map((model) => ({
    label: model,
    value: model,
  }));

  const colorData = constants.color.map((color) => ({
    label: color,
    value: color,
  }));

  const cityData = provinces;
  const districtData = districts;

  const renderHeader = () => (
    <>
      <View className="flex-row justify-between items-center px-4 py-2 bg-white">
        <View className="flex-row items-center">
          <Image
            source={userData?.avatar ? { uri: userData.avatar } : images.avatar}
            className="size-12 rounded-full"
          />
          <View className="flex flex-col items-start ml-2 justify-center">
            <Text className="text-sm font-RobotoMedium text-black">{getGreeting()}</Text>
            <Text className="font-RobotoMedium">{userData?.nickname || 'User'}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity className="bg-gray-200 rounded-full p-2" onPress={() => router.push('/(root)/(screens)/chat/notification')}>
            <Image source={icons.bell} className="size-6" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mx-4 mt-4 bg-white rounded-lg shadow-sm overflow-hidden p-4">
        <View className="flex-row items-center mb-4">
          <SearchInput ref={searchInputRef} onSearch={handleSearch} />
          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <MaterialIcons name="filter-list" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="bg-[#2563EB] py-3 rounded-md items-center"
          onPress={() => {
            const text = searchInputRef.current?.getSearchText() || '';
            handleSearch(text);
          }}
        >
          <Text className="text-white font-RobotoMedium text-base">Search</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-RobotoMedium">Discovers</Text>
        </View>
        <Filters />
      </View>
    </>
  );

  const renderFooter = () => (
    <View className="py-4 px-4">
      {loadingMore ? <ActivityIndicator size="large" color="#2563EB" /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-100">
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
              level: userCache[item.userId]?.level || 1,
            }}
            rating={ratings[item.id] ?? null}
            views={filter === 'most_viewed_30_days' ? item.last30daysViews : item.totalViews}
            onPress={() =>
              router.push({
                pathname: '/(root)/(screens)/vehicle/car-details',
                params: { id: item.id },
              })
            }
            // Pass the new props to the Cards component
            isFavorite={favoriteVehicles.has(item.id)}
            onFavoriteToggle={handleToggleFavorite}
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
        onEndReached={loadMoreVehicles}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading && pagination.currentPage === 1 ? (
            <ActivityIndicator size="large" color="#2563EB" />
          ) : (
            <Text className="text-center text-gray-500 font-RobotoMedium mt-4">
              {error || 'No vehicles available'}
            </Text>
          )
        }
      />
      {/* <Modal visible={showFilterModal} animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <MaterialIcons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-lg font-RobotoMedium">Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text className="text-[#2563EB] font-RobotoMedium">Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="p-4">
            <CustomDropdown
              label="Vehicle Type"
              data={vehicleTypeData}
              value={filters.vehicleType}
              onChange={(item) => setFilters({ ...filters, vehicleType: item.value, brand: '', model: '' })}
              placeholder="Select vehicle type"
            />
            <CustomDropdown
              label="Brand"
              data={brandData}
              value={filters.brand}
              onChange={(item) => setFilters({ ...filters, brand: item.value, model: '' })}
              placeholder="Select a brand"
              search
              disable={filters.vehicleType === ''}
            />
            <CustomDropdown
              label="Model"
              data={modelData}
              value={filters.model}
              onChange={(item) => setFilters({ ...filters, model: item.value })}
              placeholder="Select a model"
              search
              disable={filters.brand === ''}
            />
            <CustomDropdown
              label="Color"
              data={colorData}
              value={filters.color}
              onChange={(item) => setFilters({ ...filters, color: item.value })}
              placeholder="Select a color"
              search
            />
            <CustomDropdown
              label="City"
              data={cityData}
              value={filters.city}
              onChange={(item) => {
                setFilters({ ...filters, city: item.value, district: '' });
                setSelectedProvinceCode(item.code);
              }}
              placeholder="Select a city"
            />
            <CustomDropdown
              label="District"
              data={districtData}
              value={filters.district}
              onChange={(item) => setFilters({ ...filters, district: item.value })}
              placeholder="Select a district"
              disable={filters.city === ''}
            />
            <TouchableOpacity
              className="bg-[#2563EB] py-3 rounded-md items-center mt-4"
              onPress={() => setShowFilterModal(false)}
            >
              <Text className="text-white font-RobotoMedium text-base">Apply</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal> */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
        showSearchTerm={false}
      />
    </SafeAreaView>
  );
};

export default Home;