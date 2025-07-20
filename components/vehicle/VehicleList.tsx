import React, { useState, useEffect } from 'react';
import { Text, View, Image, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehicleAPI } from '@/services/api';
import { images } from '@/constants';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../ToastAlert';
import { Portal, Dialog, Button, PaperProvider } from 'react-native-paper';

// Updated interface to include rejectedReason
interface Vehicle {
  id: string;
  title: string;
  imageFront: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  status: string;
  rejectedReason: string | null; // Add this line
}

const VehicleList = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the deletion confirmation modal
  const [isDialogVisible, setDialogVisible] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await vehicleAPI.getUserVehicles();
        if (response.data.status === 200) {
          setVehicles(response.data.data.vehicles);
        } else {
          throw new Error('Failed to fetch vehicles');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load vehicles');
        showToast('error', err.message || 'Could not load vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleVehiclePress = (vehicleId: string) => {
    router.push({
      pathname: '/(root)/(screens)/user/vehicle-rentals',
      params: { vehicleId },
    });
  };

  // Function to show the confirmation dialog
  const handleDeletePress = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setDialogVisible(true);
  };

  // Function to handle the actual deletion after confirmation
  const confirmDelete = async () => {
    if (!selectedVehicleId) return;

    try {
      await vehicleAPI.deleteVehicle(selectedVehicleId);
      // Remove the vehicle from the list in the UI
      setVehicles((prevVehicles) => prevVehicles.filter((v) => v.id !== selectedVehicleId));
      showToast('success', 'Vehicle deleted successfully.');
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
      showToast('error', 'Could not delete vehicle. Please try again.');
    } finally {
      // Hide the dialog and reset the selected ID
      setDialogVisible(false);
      setSelectedVehicleId(null);
    }
  };

  const renderVehicleItem = ({ item }: { item: Vehicle }) => (
    <View className="p-4 bg-white rounded-xl mb-4 shadow-md border border-gray-200">
      <TouchableOpacity onPress={() => handleVehiclePress(item.id)}>
        <Image
          source={{ uri: item.imageFront || images.vinfast }}
          className="w-full h-48 rounded-lg mb-3"
          resizeMode="cover"
        />
        <Text className="text-xl font-RobotoBold text-gray-900 mb-1">{item.title}</Text>
        <Text className="text-sm text-gray-600 font-RobotoRegular mb-2">
          {item.brand} {item.model} ({item.year})
        </Text>
      </TouchableOpacity>
      
      {/* START: Section for Rejected Status */}
      {item.status === 'REJECTED' && (
        <View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
              <Text className="text-base font-RobotoMedium text-red-700 ml-2">
                Status: Rejected
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeletePress(item.id)} className="p-2 bg-red-100 rounded-full">
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
          {item.rejectedReason && (
            <Text className="text-sm text-red-600 font-RobotoRegular mt-2">
              Reason: {item.rejectedReason}
            </Text>
          )}
        </View>
      )}
      {/* END: Section for Rejected Status */}

      {/* Section for other statuses */}
      {item.status !== 'REJECTED' && (
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-200">
          <View className="flex-row items-center">
            <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
            <Text className="text-base font-RobotoBold text-[#2563EB] ml-2">
              {item.price.toLocaleString()} VND/day
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text className="text-base font-RobotoMedium text-gray-700 ml-2 capitalize">
              Status: {item.status}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="font-RobotoMedium mt-2 text-gray-600">Loading your vehicles...</Text>
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

  if (vehicles.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-RobotoBold text-gray-900">My Vehicles</Text>
          <TouchableOpacity onPress={() => router.push('/addpost')} className="bg-[#2563EB] py-2 px-4 rounded-lg">
            <Text className="text-white font-RobotoMedium">Add New</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            source={images.noResult}
            alt="No Car Found"
            className="w-64 h-64"
            resizeMode="contain"
          />
          <Text className="text-2xl font-RobotoBold text-gray-800 mt-6">
            No Vehicles Found
          </Text>
          <Text className="text-base mt-2 text-center px-7 text-gray-600">
            Add your first vehicle to start tracking its history and performance.
          </Text>
          <TouchableOpacity onPress={() => router.push('/addpost')} className="mt-6 bg-[#2563EB] py-3 px-6 rounded-md">
            <Text className="text-white font-RobotoMedium">Add Your First Vehicle</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <PaperProvider>
      <SafeAreaView className="flex-1 bg-gray-100">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <Text className="text-xl font-RobotoBold text-gray-900">My Vehicles</Text>
          <TouchableOpacity onPress={() => router.push('/addpost')} className="bg-[#2563EB] py-2 px-4 rounded-lg active:bg-[#1D4ED8]">

            <Text className="text-white font-RobotoMedium">Add New</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          renderItem={renderVehicleItem}
        />

        {/* Deletion Confirmation Dialog */}
        <Portal>
          <Dialog visible={isDialogVisible} onDismiss={() => setDialogVisible(false)} style={{ borderRadius: 12 }}>
            <Dialog.Title style={{ fontFamily: 'Roboto-Bold', fontSize: 20, color: '#1F2937' }}>Delete Vehicle?</Dialog.Title>
            <Dialog.Content>
              <Text style={{ fontFamily: 'Roboto-Regular', fontSize: 16, color: '#4B5563' }}>
                Are you sure you want to permanently delete this vehicle? This action cannot be undone.
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)} textColor='#6B7280' labelStyle={{ fontFamily: 'Roboto-Medium' }}>Cancel</Button>
              <Button onPress={confirmDelete} textColor="#DC2626" labelStyle={{ fontFamily: 'Roboto-Bold' }}>Delete</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
};

export default VehicleList;
