// New File: app/(root)/(screens)/user/favorites.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { vehicleAPI, authAPI } from '@/services/api';
import { VehicleData } from '@/types/carData';
import Cards from '@/components/Cards';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '@/components/ToastAlert';

interface UserPublicInfo {
  nickname: string;
  avatar?: string;
}

const FavoriteVehiclesScreen = () => {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [userCache, setUserCache] = useState<Record<number, UserPublicInfo>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, hasNextPage: false, total: 0 });

  const fetchFullVehicleData = async (vehicleIds: number[]) => {
    const vehicleDetailsPromises = vehicleIds.map(id => vehicleAPI.getVehicleById(id));
    const vehicleDetailsResponses = await Promise.all(vehicleDetailsPromises);
    return vehicleDetailsResponses.map(res => res.data?.data).filter(Boolean);
  };

  const fetchUsersAndRatings = async (fullVehicles: VehicleData[]) => {
    const userIds = [...new Set(fullVehicles.map(v => v.userId))];
    const userPromises = userIds.map(async id => {
      if (!userCache[id]) {
        const res = await authAPI.getUserPublicInfo(id);
        if (res.status === 200 && res.data?.data) {
          setUserCache(prev => ({ ...prev, [id]: res.data.data }));
        }
      }
    });

    const ratingIds = fullVehicles.map(v => v.id).filter(id => id !== undefined);
    const ratingPromises = ratingIds.map(async id => {
      if (id === undefined) return;
      try {
        const res = await vehicleAPI.getAverageRating(id);
        if (res.status === 200 && res.data?.data !== undefined) {
          setRatings(prev => ({ ...prev, [id]: res.data.data }));
        }
      } catch {
        setRatings(prev => ({ ...prev, [id]: 0 }));
      }
    });

    await Promise.all([...userPromises, ...ratingPromises]);
  };

  const fetchFavoriteVehicles = useCallback(async (page = 1, isRefresh = false) => {
    if (page > 1) setLoadingMore(true);
    else if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await vehicleAPI.getFavoriteVehicles(page, 10);
      if (response.status === 200 && response.data?.data) {
        const { favoriteVehicles: favs, hasNextPage, currentPage, total } = response.data.data;
        const vehicleIds = favs.map((fav: any) => fav.vehicleId);

        if (vehicleIds.length > 0) {
          const fullVehicles = await fetchFullVehicleData(vehicleIds);
          setVehicles(prev => (page === 1 ? fullVehicles : [...prev, ...fullVehicles]));
          await fetchUsersAndRatings(fullVehicles);
        } else if (page === 1) {
          setVehicles([]);
        }
        setPagination({ hasNextPage, currentPage, total });
      } else {
        showToast('error', 'Could not load favorite vehicles.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch favorites.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  const handleToggleFavorite = async (vehicleId: number) => {
    if (!vehicleId) return;

    // Optimistically remove the vehicle from the UI
    setVehicles((prevVehicles) => prevVehicles.filter((v) => v.id !== vehicleId));

    try {
      await vehicleAPI.deleteFavoriteVehicle(vehicleId);
      showToast('success', 'Removed from favorites.');
    } catch (err: any) {
      // If the API call fails, revert the change by re-fetching the list
      showToast('error', 'Failed to remove from favorites. Please try again.');
      fetchFavoriteVehicles(1, true); // Re-fetch to restore the item
      console.error('Error removing favorite:', err);
    }
  };

  useEffect(() => {
    fetchFavoriteVehicles(1, true);
  }, [fetchFavoriteVehicles]);

  const onRefresh = () => {
    setUserCache({});
    setRatings({});
    fetchFavoriteVehicles(1, true);
  };

  const loadMore = () => {
    if (pagination.hasNextPage && !loading && !loadingMore) {
      fetchFavoriteVehicles(pagination.currentPage + 1);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-100">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text numberOfLines={1} className="text-xl font-RobotoBold flex-1 text-center text-gray-900">
          My Favorites
        </Text>
        <View className="w-8" />
      </View>

      <FlatList
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
            rating={ratings[item.id] ?? null}
            onPress={() => router.push({ pathname: '/(root)/(screens)/vehicle/car-details', params: { id: item.id } })}
            isFavorite={true} // Always true on this screen
            onFavoriteToggle={handleToggleFavorite}
          />
        )}
        keyExtractor={(item:any) => item.id.toString()}
        numColumns={2}
        columnWrapperClassName="flex gap-3 px-5"
        contentContainerClassName="pt-4 pb-32"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && !refreshing && (
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-center text-gray-500 font-RobotoMedium">You have no favorite vehicles yet.</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator size="large" color="#2563EB" className="my-4" /> : null}
      />
    </SafeAreaView>
  );
};

export default FavoriteVehiclesScreen;