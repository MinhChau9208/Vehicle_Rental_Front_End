import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { vehicleAPI, authAPI } from '@/services/api';
import { VehicleData, UserData } from '@/types/carData';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Cards from '@/components/Cards';
import { showToast } from '@/components/ToastAlert';
import { PaginationData } from '@/types/carData';
import FilterModal from '@/components/modal/FilterModal';

const CarListing = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    vehicleType?: string;
    brand?: string;
    model?: string;
    color?: string;
    city?: string;
    district?: string;
    startDate?: string;
    endDate?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [userCache, setUserCache] = useState<Record<number, UserData>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
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
    district: params.district || '',
  });
  const [favoriteVehicles, setFavoriteVehicles] = useState<Set<number>>(new Set());

  const fetchVehicles = useCallback(
    async (page: number = 1, limit: number = 10, isRefresh: boolean = false, append: boolean = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(!isRefresh);
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

          const ratingPromises = normalizedVehicles.map(async (vehicle) => {
            if (vehicle.id === undefined) return;
            try {
              const ratingResponse = await vehicleAPI.getAverageRating(vehicle.id);
              if (ratingResponse.status === 200 && ratingResponse.data?.data !== undefined) {
                setRatings((prev) => ({ ...prev, [vehicle.id]: ratingResponse.data.data }));
              } else {
                setRatings((prev) => ({ ...prev, [vehicle.id]: 0 }));
              }
            } catch {
              setRatings((prev) => ({ ...prev, [vehicle.id]: 0 }));
            }
          });

          await Promise.all([...userPromises, ...ratingPromises]);
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
        setLoadingMore(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [filters, userCache]
  );

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
      setFavoriteVehicles(favoriteVehicles);
      const errorMessage = err.response?.data?.message || 'An error occurred.';
      showToast('error', errorMessage);
      console.error('Error toggling favorite:', err);
    }
  };

  const onRefresh = useCallback(() => {
    setVehicles([]);
    setUserCache({});
    fetchVehicles(1, 10, true);
  }, [fetchVehicles]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const loadMoreVehicles = useCallback(() => {
    if (pagination.hasNextPage && !loading && !loadingMore) {
      fetchVehicles(pagination.currentPage + 1, 10, false, true);
    }
  }, [fetchVehicles, pagination.hasNextPage, pagination.currentPage, loading, loadingMore]);

  const applyFilters = () => {
    setVehicles([]);
    setUserCache({});
    fetchVehicles(1);
    setShowFilterModal(false);
  };

  const renderHeader = () => (
    <View className="bg-white">
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="font-RobotoMedium">Available Vehicles: </Text>
        </View>
        <TouchableOpacity onPress={() => setShowFilterModal(true)}>
          <MaterialIcons name="filter-list" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View className="py-4 px-4">
      {loadingMore ? <ActivityIndicator size="large" color="#2563EB" /> : null}
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
            rating={ratings[item.id] ?? null}
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
            <Text className="text-center text-gray-500 font-RobotoMedium mt-4">{error || 'No vehicles found'}</Text>
          )
        }
      />
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={applyFilters}
        showSearchTerm={true}
      />
    </SafeAreaView>
  );
};

export default CarListing;