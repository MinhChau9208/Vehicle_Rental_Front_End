import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { vehicleAPI } from '@/services/api';
import InputField from '@/components/InputField';
import CustomDropdown from '@/components/CustomDropdown';
import { VehicleData } from '@/types/carData';
import { Chip } from 'react-native-paper'; // Only Chip is used from react-native-paper
import { showToast } from '@/components/ToastAlert';
import { images } from '@/constants'; // Import images for placeholder
import { TimePickerModal } from '@/components/modal/TimePickerModal';

const VehicleRegistration = () => {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<VehicleData>({
    title: '',
    brand: '',
    model: '',
    year: 0,
    vehicleType: 'car',
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
    vehicleRegistrationId: '',
    city: '',
    district: '',
    ward: '',
    address: '',
    timePickupStart: '',
    timePickupEnd: '',
    timeReturnStart: '',
    timeReturnEnd: '',
    imageFront: '',
    imageEnd: '',
    imageRearRight: '',
    imageRearLeft: '',
    vehicleRegistrationFront: '',
    vehicleRegistrationBack: '',
    imagePic1: '',
    imagePic2: '',
    imagePic3: '',
    imagePic4: '',
    imagePic5: '',
    timePickupStart: '06:00:00', 
    timePickupEnd: '23:00:00',
    timeReturnStart: '06:00:00',
    timeReturnEnd: '23:00:00',
  });

  // State for image uploads
  const [vehicleImages, setVehicleImages] = useState<string[]>([]);
  const [registrationImages, setRegistrationImages] = useState<string[]>([]);

  // Loading and constants states
  const [loading, setLoading] = useState(false);
  const [constants, setConstants] = useState({
    vehicleType: ['car', 'motorcycle'],
    carBrand: [],
    motorcycleBrand: [],
    color: [],
  });
  const [models, setModels] = useState<string[]>([]);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

  // States for province, district, and ward data
  const [provinces, setProvinces] = useState<{ label: string; value: string; code: string }[]>([]);
  const [districts, setDistricts] = useState<{ label: string; value: string; code: string }[]>([]);
  const [wards, setWards] = useState<{ label: string; value: string; code: string }[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');

  // Time slots for picker (00:00 to 23:30, every 30 minutes)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  });

  // Fuel type options
  const fuelTypes = ['Electric', 'Hybrid', 'Petrol', 'Diesel'];

  // Fetch constants and permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', 'Permission Denied', 'We need media library permissions to proceed.');
      }
    };

    const fetchConstants = async () => {
      try {
        const response = await vehicleAPI.getVehicleConstants();
        if (response.status === 200 && response.data?.data) {
          setConstants(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching constants:', err);
        showToast('error', 'Could not load vehicle constants.');
      }
    };

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
          showToast('error', 'Could not load provinces.');
        }
      } catch (err) {
        console.error('Error fetching provinces:', err);
        showToast('error', 'Could not load provinces.');
      }
    };

    requestPermissions();
    fetchConstants();
    fetchProvinces();
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
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
            setFormData((prev) => ({ ...prev, district: '', ward: '' }));
            setWards([]);
            setSelectedDistrictCode('');
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
        setWards([]);
        setFormData((prev) => ({ ...prev, district: '', ward: '' }));
        setSelectedDistrictCode('');
      }
    };
    fetchDistricts();
  }, [selectedProvinceCode]);

  // Fetch wards when district changes
  useEffect(() => {
    const fetchWards = async () => {
      if (selectedDistrictCode) {
        try {
          const response = await vehicleAPI.getWards(selectedDistrictCode);
          if (response.status === 200 && response.data?.data) {
            const wardData = response.data.data.map(([code, name]: [string, string]) => ({
              label: name,
              value: name,
              code,
            }));
            setWards(wardData);
            setFormData((prev) => ({ ...prev, ward: '' }));
          } else {
            setWards([]);
            showToast('error', 'Could not load wards.');
          }
        } catch (err) {
          console.error('Error fetching wards:', err);
          setWards([]);
          showToast('error', 'Could not load wards.');
        }
      } else {
        setWards([]);
        setFormData((prev) => ({ ...prev, ward: '' }));
      }
    };
    fetchWards();
  }, [selectedDistrictCode]);

  // Fetch models when vehicleType or brand changes
  useEffect(() => {
    const fetchModels = async () => {
      if (formData.vehicleType && formData.brand) {
        try {
          const response = await vehicleAPI.getModelByBrand(formData.vehicleType, formData.brand);
          if (response.status === 200 && response.data?.data) {
            setModels(response.data.data);
          } else {
            setModels([]);
          }
        } catch (err) {
          console.error('Error fetching models:', err);
          setModels([]);
        }
      } else {
        setModels([]);
      }
    };
    fetchModels();
  }, [formData.vehicleType, formData.brand]);

  // Image picker functions
  const pickVehicleImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const selectedUris = result.assets.map((asset) => asset.uri);
        if (selectedUris.length >= 4 && selectedUris.length <= 9) {
          setVehicleImages(selectedUris);
        } else {
          showToast('error', 'Please select between 4 and 9 images for the vehicle.');
        }
      }
    } catch (err) {
      console.error('Error picking vehicle images:', err);
      showToast('error', 'Could not select images.');
    }
  };

  const pickRegistrationImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const selectedUris = result.assets.map((asset) => asset.uri);
        if (selectedUris.length === 2) {
          setRegistrationImages(selectedUris);
        } else {
          showToast('error', 'Please select exactly 2 images for registration.');
        }
      }
    } catch (err) {
      console.error('Error picking registration images:', err);
      showToast('error', 'Could not select images.');
    }
  };

  // Format price with commas
  const formatPrice = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Handle price input
  const handlePriceChange = (text: string) => {
    const numericValue = parseFloat(text.replace(/,/g, '')) || 0;
    setFormData((prev) => ({ ...prev, price: numericValue }));
  };

  // Form submission
  const handleSubmit = async () => {
    const requiredFields = [
      formData.title,
      formData.brand,
      formData.model,
      formData.year.toString(),
      formData.vehicleType,
      formData.engine,
      formData.transmission,
      formData.fuelType,
      formData.color,
      formData.seatingCapacity.toString(),
      formData.vehicleRegistrationId,
      formData.city,
      formData.district,
      formData.ward,
      formData.address,
      formData.timePickupStart,
      formData.timePickupEnd,
      formData.timeReturnStart,
      formData.timeReturnEnd,
    ];

    if (requiredFields.some((field) => !field) || vehicleImages.length < 4 || registrationImages.length !== 2) {
      showToast('error', 'Please fill out all required fields and upload the required number of images.');
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
      const apiFormData = new FormData();

      // Append non-file fields
      const nonFileFields: (keyof VehicleData)[] = [
        'title',
        'brand',
        'model',
        'year',
        'vehicleType',
        'description',
        'engine',
        'transmission',
        'fuelType',
        'color',
        'seatingCapacity',
        'airConditioning',
        'gps',
        'bluetooth',
        'map',
        'dashCamera',
        'cameraBack',
        'collisionSensors',
        'ETC',
        'safetyAirBag',
        'price',
        'vehicleRegistrationId',
        'city',
        'district',
        'ward',
        'address',
        'timePickupStart',
        'timePickupEnd',
        'timeReturnStart',
        'timeReturnEnd',
      ];

      nonFileFields.forEach((key) => {
        const value = formData[key];
        if (value !== undefined && value !== null) {
          apiFormData.append(key, value.toString());
        }
      });

      // Append vehicle images
      const imageFieldNames = [
        'imageFront',
        'imageEnd',
        'imageRearRight',
        'imageRearLeft',
        'imagePic1',
        'imagePic2',
        'imagePic3',
        'imagePic4',
        'imagePic5',
      ];

      vehicleImages.forEach((uri, index) => {
        if (imageFieldNames[index]) {
          const fileName = `${imageFieldNames[index]}.jpg`;
          const fileType = 'image/jpeg';
          const formattedUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;
          apiFormData.append(imageFieldNames[index], {
            uri: formattedUri,
            name: fileName,
            type: fileType,
          } as any);
        }
      });

      const registrationFieldNames = ['vehicleRegistrationFront', 'vehicleRegistrationBack'];

      // Append registration images
      registrationImages.forEach((uri, index) => {
        if (registrationFieldNames[index]) {
          const fileName = `${registrationFieldNames[index]}.jpg`;
          const fileType = 'image/jpeg';
          const formattedUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;
          apiFormData.append(registrationFieldNames[index], {
            uri: formattedUri,
            name: fileName,
            type: fileType,
          } as any);
        }
      });

      const response = await vehicleAPI.uploadNewVehicle(apiFormData);

      if (response.data.message === 'Request to upload new vehicle successfully.') {
        showToast('success', 'Vehicle registration request submitted successfully.');
        router.push('/profile');
      } else {
        throw new Error('Failed to store vehicle: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Could not register vehicle';
      showToast('error', errorMessage);
      console.error('Error storing vehicle:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dropdown data formatting
  const vehicleTypeData = constants.vehicleType.map((type) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type,
  }));

  const brandData = (formData.vehicleType === 'car' ? constants.carBrand : constants.motorcycleBrand).map((brand) => ({
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

  const fuelTypeData = fuelTypes.map((type) => ({
    label: type,
    value: type,
  }));

  const cityData = provinces;
  const districtData = districts;
  const wardData = wards;

  const timeSlotData = timeSlots.map((time) => ({
    label: time.substring(0, 5), // Display HH:MM
    value: time,
  }));

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold flex-1 text-center text-gray-900">Add Vehicle</Text>
          <View className="w-10" />{/* Placeholder for alignment */}
        </View>

        {/* Warning */}
        <View className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex-row items-center">
          <Ionicons name="alert-circle-outline" size={20} color="#D97706" />
          <Text className="text-sm text-yellow-800 font-RobotoMedium ml-2 flex-1">
            All required fields must be filled. You cannot change this information after registration.
          </Text>
        </View>

        {/* Vehicle Images Section */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Vehicle Images (4-9 images)</Text>
          <TouchableOpacity
            className="bg-blue-500 py-3 rounded-lg flex-row items-center justify-center mb-4 shadow-sm active:bg-blue-600"
            onPress={pickVehicleImages}
          >
            <Ionicons name="image-outline" size={20} color="#fff" />
            <Text className="text-white text-center font-RobotoBold text-base ml-2">Choose Vehicle Images</Text>
          </TouchableOpacity>
          {vehicleImages.length > 0 && (
            <View className="flex-row flex-wrap justify-center">
              {vehicleImages.map((uri, index) => (
                <Image key={index} source={{ uri }} className="w-24 h-24 m-1 rounded-lg border border-gray-200" resizeMode="cover" />
              ))}
            </View>
          )}
          {vehicleImages.length === 0 && (
            <View className="w-full h-24 bg-gray-100 rounded-lg justify-center items-center">
              <Text className="text-gray-400 font-RobotoRegular">No vehicle images selected</Text>
            </View>
          )}
        </View>

        {/* Registration Images Section */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Registration Images (2 images)</Text>
          <TouchableOpacity
            className="bg-blue-500 py-3 rounded-lg flex-row items-center justify-center mb-4 shadow-sm active:bg-blue-600"
            onPress={pickRegistrationImages}
          >
            <Ionicons name="document-outline" size={20} color="#fff" />
            <Text className="text-white text-center font-RobotoBold text-base ml-2">Choose Registration Images</Text>
          </TouchableOpacity>
          {registrationImages.length > 0 && (
            <View className="flex-row flex-wrap justify-center">
              {registrationImages.map((uri, index) => (
                <Image key={index} source={{ uri }} className="w-24 h-24 m-1 rounded-lg border border-gray-200" resizeMode="cover" />
              ))}
            </View>
          )}
          {registrationImages.length === 0 && (
            <View className="w-full h-24 bg-gray-100 rounded-lg justify-center items-center">
              <Text className="text-gray-400 font-RobotoRegular">No registration images selected</Text>
            </View>
          )}
        </View>

        {/* Basic Information */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Basic Information</Text>
          <InputField
            label="Title"
            placeholder="Enter vehicle title"
            value={formData.title}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <CustomDropdown
            label="Vehicle Type"
            data={vehicleTypeData}
            value={formData.vehicleType}
            onChange={(item) => setFormData((prev) => ({ ...prev, vehicleType: item.value, brand: '', model: '' }))}
            placeholder="Select vehicle type"
            isRequired
          />
          <CustomDropdown
            label="Brand"
            data={brandData}
            value={formData.brand}
            onChange={(item) => setFormData((prev) => ({ ...prev, brand: item.value, model: '' }))}
            placeholder="Select a brand"
            search
            isRequired
            disable={formData.vehicleType === ''}
          />
          <CustomDropdown
            label="Model"
            data={modelData}
            value={formData.model}
            onChange={(item) => setFormData((prev) => ({ ...prev, model: item.value }))}
            placeholder="Select a model"
            search
            isRequired
            disable={formData.brand === ''}
          />
          <InputField
            label="Year"
            placeholder="e.g., 2020"
            value={formData.year ? formData.year.toString() : ''}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, year: parseInt(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
            isRequired
          />
          <CustomDropdown
            label="Color"
            data={colorData}
            value={formData.color}
            onChange={(item) => setFormData((prev) => ({ ...prev, color: item.value }))}
            placeholder="Select a color"
            search
            isRequired
          />
          <InputField
            label="Engine"
            placeholder="Enter vehicle engine"
            value={formData.engine}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, engine: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Number of Seats"
            placeholder="Enter number of seats"
            value={formData.seatingCapacity ? formData.seatingCapacity.toString() : ''}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, seatingCapacity: parseInt(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
            isRequired
          />
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-base font-RobotoSemiBold text-gray-800">Transmission</Text>
              <Text className="text-red-500 text-base ml-1">*</Text>
            </View>
            <View className="flex-row flex-wrap">
              {['Automatic', 'Manual'].map((type) => (
                <Chip
                  key={type}
                  selected={formData.transmission === type}
                  showSelectedCheck={false}
                  onPress={() => setFormData((prev) => ({ ...prev, transmission: type }))}
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    backgroundColor: formData.transmission === type ? '#2563EB' : '#E5E7EB',
                    borderRadius: 8,
                  }}
                  textStyle={{
                    color: formData.transmission === type ? '#FFFFFF' : '#4B5563',
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
            data={fuelTypeData}
            value={formData.fuelType}
            onChange={(item) => setFormData((prev) => ({ ...prev, fuelType: item.value }))}
            placeholder="Select fuel type"
            isRequired
          />
          <InputField
            label="Daily Rental Price (VND)"
            placeholder="e.g., 500,000"
            value={formData.price ? formatPrice(formData.price) : ''}
            onChangeText={handlePriceChange}
            containerStyle="mb-4"
            keyboardType="numeric"
            isRequired
          />
          <InputField
            label="Plate ID"
            placeholder="Enter vehicle plate ID"
            value={formData.vehicleRegistrationId}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, vehicleRegistrationId: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-base font-RobotoSemiBold text-gray-800">Description (Optional)</Text>
            </View>
            <View className="border border-gray-300 rounded-lg p-2 h-32">
              <TextInput
                placeholder="Enter vehicle description"
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={6}
                style={{ height: '100%', textAlignVertical: 'top', fontFamily: 'Roboto-Regular', fontSize: 15, color: '#1F2937' }}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Features */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Features</Text>
          <View className="flex-row flex-wrap">
            {[
              { label: 'Air Conditioning', key: 'airConditioning', icon: 'snow-outline' },
              { label: 'GPS', key: 'gps', icon: 'navigate-outline' },
              { label: 'Bluetooth', key: 'bluetooth', icon: 'bluetooth-outline' },
              { label: 'In-car Map', key: 'map', icon: 'map-outline' },
              { label: 'Dash Camera', key: 'dashCamera', icon: 'videocam-outline' },
              { label: 'Rear Camera', key: 'camera-reverse-outline' }, // Changed to Ionicons
              { label: 'Collision Sensors', key: 'collisionSensors', icon: 'alert-circle-outline' },
              { label: 'Electronic Toll Collection', key: 'ETC', icon: 'card-outline' },
              { label: 'Safety Airbags', key: 'safetyAirBag', icon: 'shield-outline' },
            ].map(({ label, key, icon }) => (
              <Chip
                key={key}
                selected={formData[key as keyof VehicleData] as boolean}
                showSelectedCheck={false}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, [key]: !prev[key as keyof VehicleData] }))
                }
                icon={() => <Ionicons name={icon as any} size={18} color={formData[key as keyof VehicleData] ? '#FFFFFF' : '#4B5563'} />}
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: formData[key as keyof VehicleData] ? '#2563EB' : '#E5E7EB',
                  borderRadius: 8,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                }}
                textStyle={{
                  color: formData[key as keyof VehicleData] ? '#FFFFFF' : '#4B5563',
                  fontFamily: 'Roboto-Medium',
                  fontSize: 14,
                }}
              >
                {label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Vehicle Location Information */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Vehicle Location Information</Text>
          <CustomDropdown
            label="City"
            data={cityData}
            value={formData.city}
            onChange={(item) => {
              setFormData((prev) => ({ ...prev, city: item.value }));
              setSelectedProvinceCode(item.code);
            }}
            placeholder="Select a city"
            search
            isRequired
          />
          <CustomDropdown
            label="District"
            data={districtData}
            value={formData.district}
            onChange={(item) => {
              setFormData((prev) => ({ ...prev, district: item.value }));
              setSelectedDistrictCode(item.code);
            }}
            placeholder="Select a district"
            search
            isRequired
            disable={formData.city === ''}
          />
          <CustomDropdown
            label="Ward"
            data={wardData}
            value={formData.ward}
            onChange={(item) => setFormData((prev) => ({ ...prev, ward: item.value }))}
            placeholder="Select a ward"
            search
            isRequired
            disable={formData.district === ''}
          />
          <InputField
            label="Street Address"
            placeholder="Enter street address"
            value={formData.address}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, address: text }))}
            isRequired
          />
        </View>

        {/* Pickup and Return Times */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md mb-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-RobotoBold text-gray-800">Pickup & Return Times</Text>
            <TouchableOpacity onPress={() => setIsTimePickerVisible(true)}>
              <Text className="text-blue-600 font-RobotoBold">Edit</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setIsTimePickerVisible(true)} className="mt-4 space-y-2">
            <View className="flex-row justify-between p-3 bg-gray-50 rounded-lg items-center">
              <Text className="font-RobotoMedium text-gray-600">Pickup Time Range:</Text>
              <Text className="font-RobotoBold text-gray-800 text-base">
                {formData.timePickupStart.substring(0, 5)} - {formData.timePickupEnd.substring(0, 5)}
              </Text>
            </View>
            <View className="flex-row justify-between p-3 bg-gray-50 rounded-lg items-center">
              <Text className="font-RobotoMedium text-gray-600">Return Time Range:</Text>
              <Text className="font-RobotoBold text-gray-800 text-base">
                {formData.timeReturnStart.substring(0, 5)} - {formData.timeReturnEnd.substring(0, 5)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="px-4 py-4 bg-white border-t border-gray-200 shadow-lg"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
      >
        <TouchableOpacity
          className="bg-[#2563EB] py-4 rounded-xl flex-row items-center justify-center shadow-md active:bg-[#1D4ED8]"
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading && <ActivityIndicator size="small" color="#fff" className="mr-2" />}
          <Text className="text-white text-center font-RobotoBold text-lg">
            {loading ? 'Submitting...' : 'Submit Vehicle Registration'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Render the new Time Picker Modal */}
      <TimePickerModal
        visible={isTimePickerVisible}
        onClose={() => setIsTimePickerVisible(false)}
        initialValues={{
          pickupStart: formData.timePickupStart,
          pickupEnd: formData.timePickupEnd,
          returnStart: formData.timeReturnStart,
          returnEnd: formData.timeReturnEnd,
        }}
        onConfirm={(times) => {
          setFormData((prev) => ({
            ...prev,
            timePickupStart: times.pickupStart,
            timePickupEnd: times.pickupEnd,
            timeReturnStart: times.returnStart,
            timeReturnEnd: times.returnEnd,
          }));
        }}
      />
    </SafeAreaView>
  );
};

export default VehicleRegistration;
