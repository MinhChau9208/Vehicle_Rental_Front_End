import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { vehicleAPI } from '@/services/api';
import InputField from '@/components/InputField';
import CustomDropdown from '@/components/CustomDropdown';
import { Chip, Button } from 'react-native-paper';
import { showToast } from '@/components/ToastAlert';

interface VehicleData {
  vehicleId: number;
  title: string;
  description?: string;
  engine: string;
  transmission: string;
  fuelType: string;
  color: string;
  seatingCapacity: number;
  airConditioning: boolean;
  gps: boolean;
  bluetooth: boolean;
  map: boolean;
  dashCamera: boolean;
  cameraBack: boolean;
  collisionSensors: boolean;
  ETC: boolean;
  safetyAirBag: boolean;
  price: number;
  city: string;
  district: string;
  ward: string;
  address: string;
  timePickupStart: string;
  timePickupEnd: string;
  timeReturnStart: string;
  timeReturnEnd: string;
}

interface DropdownItem {
  label: string;
  value: string;
}

const EditVehicle = () => {
  const { vehicleId } = useLocalSearchParams();

  const [formData, setFormData] = useState<VehicleData>({
    vehicleId: vehicleId ? parseInt(vehicleId as string) : 0,
    title: '',
    description: '',
    engine: '',
    transmission: '',
    fuelType: '',
    color: '',
    seatingCapacity: 0,
    airConditioning: false,
    gps: false,
    bluetooth: false,
    map: false,
    dashCamera: false,
    cameraBack: false,
    collisionSensors: false,
    ETC: false,
    safetyAirBag: false,
    price: 0,
    city: '',
    district: '',
    ward: '',
    address: '',
    timePickupStart: '',
    timePickupEnd: '',
    timeReturnStart: '',
    timeReturnEnd: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colors, setColors] = useState<DropdownItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<DropdownItem[]>([]);

  const fuelTypes: DropdownItem[] = [
    { label: 'Electric', value: 'Electric' },
    { label: 'Hybrid', value: 'Hybrid' },
    { label: 'Petrol', value: 'Petrol' },
    { label: 'Diesel', value: 'Diesel' },
    { label: 'Others', value: 'Others' },
  ];

  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!vehicleId) {
        setError('Vehicle ID is missing');
        setLoading(false);
        return;
      }

      try {
        const response = await vehicleAPI.getVehicleById(parseInt(vehicleId as string));
        if (response.data.status === 200) {
          const vehicle = response.data.data;
          setFormData({
            vehicleId: vehicle.id,
            title: vehicle.title || '',
            description: vehicle.description || '',
            engine: vehicle.engine || '',
            transmission: vehicle.transmission || '',
            fuelType: vehicle.fuelType || '',
            color: vehicle.color || '',
            seatingCapacity: vehicle.seatingCapacity || 0,
            airConditioning: vehicle.airConditioning || false,
            gps: vehicle.gps || false,
            bluetooth: vehicle.bluetooth || false,
            map: vehicle.map || false,
            dashCamera: vehicle.dashCamera || false,
            cameraBack: vehicle.cameraBack || false,
            collisionSensors: vehicle.collisionSensors || false,
            ETC: vehicle.ETC || false,
            safetyAirBag: vehicle.safetyAirBag || false,
            price: vehicle.price || 0,
            city: vehicle.city || '',
            district: vehicle.district || '',
            ward: vehicle.ward || '',
            address: vehicle.address || '',
            timePickupStart: vehicle.timePickupStart || '',
            timePickupEnd: vehicle.timePickupEnd || '',
            timeReturnStart: vehicle.timeReturnStart || '',
            timeReturnEnd: vehicle.timeReturnEnd || '',
          });
        } else {
          throw new Error('Failed to fetch vehicle data');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load vehicle data');
      } finally {
        setLoading(false);
      }
    };

    const fetchConstants = async () => {
      try {
        const response = await vehicleAPI.getVehicleConstants();
        if (response.data.status === 200) {
          const constants = response.data.data;
          setColors(constants.color.map((color: string) => ({ label: color, value: color })));
        }
      } catch (err) {
        console.error('Error fetching constants:', err);
        showToast('error', 'Could not load vehicle colors.');
      }
    };

    const generateTimeSlots = () => {
      const slots = Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2);
        const minutes = i % 2 === 0 ? '00' : '30';
        const time = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
        return { label: time, value: time };
      });
      setTimeSlots(slots);
    };

    fetchVehicleData();
    fetchConstants();
    generateTimeSlots();
  }, [vehicleId]);

  const handleSubmit = async () => {
    const timeFormat = /^\d{2}:\d{2}:\d{2}$/;
    const times = [formData.timePickupStart, formData.timePickupEnd, formData.timeReturnStart, formData.timeReturnEnd];
    if (!times.every(time => timeFormat.test(time))) {
      showToast('error', 'All time fields must be in HH:MM:SS format.');
      return;
    }

    const toSeconds = (time: string) => {
      const [h, m, s] = time.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };

    const pickupStartSec = toSeconds(formData.timePickupStart);
    const pickupEndSec = toSeconds(formData.timePickupEnd);
    const returnStartSec = toSeconds(formData.timeReturnStart);
    const returnEndSec = toSeconds(formData.timeReturnEnd);

    if (pickupEndSec - pickupStartSec < 2 * 3600 || returnEndSec - returnStartSec < 2 * 3600) {
      showToast('error', 'Pickup and return time ranges must be at least 2 hours apart.');
      return;
    }

    setLoading(true);
    try {
      const response = await vehicleAPI.updateVehicle(formData);
      if (response.data.status === 200) {
        showToast('success', 'Vehicle information updated successfully.');
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to update vehicle');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 2002
          ? 'Vehicle not found.'
          : err.response?.data?.errorCode === 2005
          ? 'You are not the owner of the vehicle.'
          : err.response?.data?.errorCode === 2004
          ? 'Vehicle is not approved.'
          : err.response?.data?.errorCode === 2106
          ? 'Failed to update vehicle.'
          : err.message || 'Could not update vehicle';
      showToast('error', err.response?.data?.errorCode, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#2563EB] font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-2 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold">Edit Vehicle</Text>
          <View className="w-6" />
        </View>

        <View className="px-4 py-2 bg-yellow-100 mt-2">
          <Text className="text-sm text-gray-600">
            Only the fields below can be changed. Images and vehicle registration cannot be updated.
          </Text>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-xl font-bold mb-4">Basic Information</Text>
          <InputField
            label="Title"
            placeholder="Enter vehicle title"
            value={formData.title}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, title: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Description"
            placeholder="Enter vehicle description (optional)"
            value={formData.description}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, description: text }))}
            containerStyle="mb-4"
            multiline
          />
          <InputField
            label="Engine"
            placeholder="Enter vehicle engine"
            value={formData.engine}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, engine: text }))}
            containerStyle="mb-4"
          />
          <View className="mb-4">
            <Text className="text-lg font-RobotoSemiBold mb-1">Transmission</Text>
            <View className="flex-row flex-wrap">
              {['Automatic', 'Manual'].map((type) => (
                <Chip
                  key={type}
                  selected={formData.transmission === type}
                  showSelectedCheck={false}
                  onPress={() => setFormData(prev => ({ ...prev, transmission: type }))}
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    backgroundColor: formData.transmission === type ? '#2563EB' : '#E5E7EB',
                  }}
                  textStyle={{
                    color: formData.transmission === type ? '#FFFFFF' : '#000000',
                    fontFamily: 'Roboto-Medium',
                    fontSize: 14,
                  }}
                >
                  {type}
                </Chip>
              ))}
            </View>
          </View>
          <CustomDropdown
            label="Fuel Type"
            data={fuelTypes}
            value={formData.fuelType}
            onChange={(item) => setFormData(prev => ({ ...prev, fuelType: item.value }))}
            placeholder="Select fuel type"
            search
            containerStyle="mb-4"
          />
          <CustomDropdown
            label="Color"
            data={colors}
            value={formData.color}
            onChange={(item) => setFormData(prev => ({ ...prev, color: item.value }))}
            placeholder="Select a color"
            search
            containerStyle="mb-4"
          />
          <InputField
            label="Number of Seats"
            placeholder="Enter number of seats"
            value={formData.seatingCapacity.toString()}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, seatingCapacity: parseInt(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
          />
          <InputField
            label="Price"
            placeholder="Enter price per day"
            value={formData.price.toString()}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
          />
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-xl font-bold mb-4">Features</Text>
          <View className="flex-row flex-wrap">
            {[
              { label: 'Air Conditioning', key: 'airConditioning' },
              { label: 'GPS', key: 'gps' },
              { label: 'Bluetooth', key: 'bluetooth' },
              { label: 'In-car Map', key: 'map' },
              { label: 'Dash Camera', key: 'dashCamera' },
              { label: 'Rear Camera', key: 'cameraBack' },
              { label: 'Collision Sensors', key: 'collisionSensors' },
              { label: 'Electronic Toll Collection', key: 'ETC' },
              { label: 'Safety Airbags', key: 'safetyAirBag' },
            ].map(({ label, key }) => (
              <Chip
                key={key}
                selected={formData[key as keyof VehicleData] as boolean}
                showSelectedCheck={false}
                onPress={() =>
                  setFormData(prev => ({ ...prev, [key]: !prev[key as keyof VehicleData] }))
                }
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: formData[key as keyof VehicleData] ? '#2563EB' : '#E5E7EB',
                }}
                textStyle={{
                  color: formData[key as keyof VehicleData] ? '#FFFFFF' : '#000000',
                  fontFamily: 'Roboto-Medium',
                  fontSize: 14,
                }}
              >
                {label}
              </Chip>
            ))}
          </View>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-xl font-bold mb-4">Vehicle Location Information</Text>
          <InputField
            label="City"
            placeholder="Enter city"
            value={formData.city}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, city: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="District"
            placeholder="Enter district"
            value={formData.district}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, district: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Ward"
            placeholder="Enter ward"
            value={formData.ward}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, ward: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Address"
            placeholder="Enter street address"
            value={formData.address}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, address: text }))}
            containerStyle="mb-4"
          />
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-xl font-bold mb-4">Pickup and Return Times</Text>
          <CustomDropdown
            label="Pickup Start Time"
            data={timeSlots}
            value={formData.timePickupStart}
            onChange={(item) => setFormData(prev => ({ ...prev, timePickupStart: item.value }))}
            placeholder="Select time"
            search
            containerStyle="mb-4"
          />
          <CustomDropdown
            label="Pickup End Time"
            data={timeSlots}
            value={formData.timePickupEnd}
            onChange={(item) => setFormData(prev => ({ ...prev, timePickupEnd: item.value }))}
            placeholder="Select time"
            search
            containerStyle="mb-4"
          />
          <CustomDropdown
            label="Return Start Time"
            data={timeSlots}
            value={formData.timeReturnStart}
            onChange={(item) => setFormData(prev => ({ ...prev, timeReturnStart: item.value }))}
            placeholder="Select time"
            search
            containerStyle="mb-4"
          />
          <CustomDropdown
            label="Return End Time"
            data={timeSlots}
            value={formData.timeReturnEnd}
            onChange={(item) => setFormData(prev => ({ ...prev, timeReturnEnd: item.value }))}
            placeholder="Select time"
            search
            containerStyle="mb-4"
          />
        </View>

        <View className="px-4 py-4 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="bg-[#2563EB] py-3 rounded-full flex-row items-center justify-center"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading && <ActivityIndicator size="small" color="#fff" className="mr-2" />}
            <Text className="text-white text-center font-bold text-base">
              {loading ? 'Submitting...' : 'Update Vehicle'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditVehicle;