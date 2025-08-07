import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import CustomDropdown from '@/components/CustomDropdown';
import { showToast } from '@/components/ToastAlert';
import { vehicleAPI } from '@/services/api';
import { VehicleConstants } from '@/types/carData';

const FilterModal = ({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  showSearchTerm = true,
}) => {
  const [constants, setConstants] = useState<VehicleConstants>({
    vehicleType: ['car', 'motorcycle'],
    carBrand: [],
    motorcycleBrand: [],
    color: [],
  });
  const [models, setModels] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<{ label: string; value: string; code: string }[]>([]);
  const [districts, setDistricts] = useState<{ label: string; value: string; code: string }[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');

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
      showToast('error', 'Could not load models.');
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
    fetchConstants();
    fetchProvinces();
  }, [fetchConstants]);

  useEffect(() => {
    fetchDistricts();
  }, [selectedProvinceCode]);

  useEffect(() => {
    fetchModels(filters.vehicleType, filters.brand);
  }, [filters.vehicleType, filters.brand, fetchModels]);

  const resetFilters = () => {
    onFiltersChange({
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-RobotoMedium">Filters</Text>
          <TouchableOpacity onPress={resetFilters}>
            <Text className="text-[#2563EB] font-RobotoMedium">Reset</Text>
          </TouchableOpacity>
        </View>
        <ScrollView className="p-4">
          {showSearchTerm && (
            <View className="mb-4">
              <Text className="text-sm font-RobotoMedium text-gray-500 mb-1">Search Term</Text>
              <TextInput
                className="border border-gray-300 rounded-md p-2 h-[50px]"
                value={filters.title}
                onChangeText={(text) => onFiltersChange({ ...filters, title: text })}
                placeholder="Enter vehicle title"
              />
            </View>
          )}
          <CustomDropdown
            label="Vehicle Type"
            data={vehicleTypeData}
            value={filters.vehicleType}
            onChange={(item) =>
              onFiltersChange({ ...filters, vehicleType: item.value, brand: '', model: '' })
            }
            placeholder="Select vehicle type"
          />
          <CustomDropdown
            label="Brand"
            data={brandData}
            value={filters.brand}
            onChange={(item) => onFiltersChange({ ...filters, brand: item.value, model: '' })}
            placeholder="Select a brand"
            search
            disable={filters.vehicleType === ''}
          />
          <CustomDropdown
            label="Model"
            data={modelData}
            value={filters.model}
            onChange={(item) => onFiltersChange({ ...filters, model: item.value })}
            placeholder="Select a model"
            search
            disable={filters.brand === ''}
          />
          <CustomDropdown
            label="Color"
            data={colorData}
            value={filters.color}
            onChange={(item) => onFiltersChange({ ...filters, color: item.value })}
            placeholder="Select a color"
            search
          />
          <CustomDropdown
            label="City"
            data={cityData}
            value={filters.city}
            onChange={(item) => {
              onFiltersChange({ ...filters, city: item.value, district: '' });
              setSelectedProvinceCode(item.code);
            }}
            placeholder="Select a city"
          />
          <CustomDropdown
            label="District"
            data={districtData}
            value={filters.district}
            onChange={(item) => onFiltersChange({ ...filters, district: item.value })}
            placeholder="Select a district"
            disable={filters.city === ''}
          />
          <TouchableOpacity
            className="bg-[#2563EB] py-3 rounded-md items-center mt-4"
            onPress={onApply}
          >
            <Text className="text-white font-RobotoMedium text-base">Apply</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default FilterModal;