// create-contract.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';

interface ContractData {
  contractDate: {
    day: number;
    month: number;
    year: number;
  };
  renterInformation: {
    name: string;
    phoneNumber: string;
    idCardNumber: string;
    driverLicenseNumber: string;
  };
  vehicleOwnerInformation: {
    name: string;
    phoneNumber: string;
    idCardNumber: string;
  };
  vehicleInformation: {
    brand: string;
    model: string;
    year: number;
    color: string;
    vehicleRegistrationId: string;
  };
  contractAddress: {
    city: string;
    district: string;
    ward: string;
    address: string;
  };
  rentalInformation: {
    startDateTime: string;
    endDateTime: string;
    totalDays: number;
    totalPrice: number;
    depositPrice: number;
  };
  vehicleCondition: {
    outerVehicleCondition: string;
    innerVehicleCondition: string;
    tiresCondition: string;
    engineCondition: string;
    note: string;
  };
}

const CreateContract = () => {
  const { rentalId } = useLocalSearchParams();
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDraftContract = async () => {
      if (!rentalId) {
        setError('Rental ID is missing');
        setLoading(false);
        return;
      }
      try {
        const response = await rentalAPI.prepareContract(parseInt(rentalId as string));
        if (response.data.status === 200) {
          const data = response.data.data;
          setContractData({
            contractDate: {
              day: data.contractDate.day || 1,
              month: data.contractDate.month || 1,
              year: data.contractDate.year || new Date().getFullYear(),
            },
            renterInformation: {
              name: data.renterInformation.name || '',
              phoneNumber: data.renterInformation.phoneNumber || '',
              idCardNumber: data.renterInformation.idCardNumber || '',
              driverLicenseNumber: data.renterInformation.driverLicenseNumber || '',
            },
            vehicleOwnerInformation: {
              name: data.vehicleOwnerInformation.name || '',
              phoneNumber: data.vehicleOwnerInformation.phoneNumber || '',
              idCardNumber: data.vehicleOwnerInformation.idCardNumber || '',
            },
            vehicleInformation: {
              brand: data.vehicleInformation.brand || '',
              model: data.vehicleInformation.model || '',
              year: data.vehicleInformation.year || 0,
              color: data.vehicleInformation.color || '',
              vehicleRegistrationId: data.vehicleInformation.vehicleRegistrationId || '',
            },
            contractAddress: {
              city: data.contractAddress.city || '',
              district: data.contractAddress.district || '',
              ward: data.contractAddress.ward || '',
              address: data.contractAddress.address || '',
            },
            rentalInformation: {
              startDateTime: data.rentalInformation.startDateTime || '',
              endDateTime: data.rentalInformation.endDateTime || '',
              totalDays: data.rentalInformation.totalDays || 1,
              totalPrice: data.rentalInformation.totalPrice || 0,
              depositPrice: data.rentalInformation.depositPrice || 0,
            },
            vehicleCondition: {
              outerVehicleCondition: data.vehicleCondition?.outerVehicleCondition || '',
              innerVehicleCondition: data.vehicleCondition?.innerVehicleCondition || '',
              tiresCondition: data.vehicleCondition?.tiresCondition || '',
              engineCondition: data.vehicleCondition?.engineCondition || '',
              note: data.vehicleCondition?.note || '',
            },
          });
          setError(null);
        } else {
          throw new Error(response.data.message || 'Failed to prepare contract');
        }
      } catch (err: any) {
        setError(err.message || 'Could not prepare contract');
      } finally {
        setLoading(false);
      }
    };

    fetchDraftContract();
  }, [rentalId]);

  const handleInputChange = (section: keyof ContractData, field: string, value: string | number) => {
    if (!contractData) return;
    setContractData({
      ...contractData,
      [section]: {
        ...contractData[section],
        [field]: value,
      },
    });
  };

  const validateContractData = () => {
    if (!contractData) return false;
    const requiredFields = [
      contractData.contractDate.day,
      contractData.contractDate.month,
      contractData.contractDate.year,
      contractData.renterInformation.name,
      contractData.renterInformation.phoneNumber,
      contractData.renterInformation.idCardNumber,
      contractData.renterInformation.driverLicenseNumber,
      contractData.vehicleOwnerInformation.name,
      contractData.vehicleOwnerInformation.phoneNumber,
      contractData.vehicleOwnerInformation.idCardNumber,
      contractData.vehicleInformation.brand,
      contractData.vehicleInformation.model,
      contractData.vehicleInformation.year,
      contractData.vehicleInformation.color,
      contractData.vehicleInformation.vehicleRegistrationId,
      contractData.contractAddress.city,
      contractData.contractAddress.district,
      contractData.contractAddress.ward,
      contractData.contractAddress.address,
      contractData.rentalInformation.startDateTime,
      contractData.rentalInformation.endDateTime,
      contractData.rentalInformation.totalDays,
      contractData.rentalInformation.totalPrice,
      contractData.rentalInformation.depositPrice,
    ];
    return requiredFields.every((field) => field !== '' && field !== 0 && field != null);
  };

  const handleCreateContract = async () => {
    if (!contractData || !validateContractData()) {
      showToast('error', 'Please fill in all required fields.');
      return;
    }
    try {
      const response = await rentalAPI.createContract(contractData, rentalId ? parseInt(rentalId as string) : 0);
      console.log('rentalId', rentalId);
      if (response.data.status === 200) {
        showToast('success', 'Contract created successfully');
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to create contract');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 8004
          ? 'Rental not found.'
          : err.response?.data?.errorCode === 4007
          ? 'Rental is not in the correct status.'
          : err.response?.data?.errorCode === 4005
          ? 'User is not the owner of the rental.'
          : err.response?.data?.errorCode === 4113
          ? 'Failed to create contract.'
          : err.response?.data?.message || 'Could not create contract.';
      showToast('error', errorMessage);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error || !contractData) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error || 'No contract data found'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#2563EB] font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="p-5">
        <Text className="text-2xl font-RobotoBold mb-4">Create Contract</Text>

        {/* Contract Date */}
        <Text className="text-lg font-RobotoBold mt-4">Contract Date</Text>
        <View className="flex-row justify-between">
          <TextInput
            className="border border-gray-300 rounded-md p-2 mt-2 flex-1 mr-2"
            placeholder="Day"
            value={contractData.contractDate.day.toString()}
            onChangeText={(value) => handleInputChange('contractDate', 'day', parseInt(value) || 1)}
            keyboardType="numeric"
          />
          <TextInput
            className="border border-gray-300 rounded-md p-2 mt-2 flex-1 mr-2"
            placeholder="Month"
            value={contractData.contractDate.month.toString()}
            onChangeText={(value) => handleInputChange('contractDate', 'month', parseInt(value) || 1)}
            keyboardType="numeric"
          />
          <TextInput
            className="border border-gray-300 rounded-md p-2 mt-2 flex-1"
            placeholder="Year"
            value={contractData.contractDate.year.toString()}
            onChangeText={(value) => handleInputChange('contractDate', 'year', parseInt(value) || new Date().getFullYear())}
            keyboardType="numeric"
          />
        </View>

        {/* Renter Information */}
        <Text className="text-lg font-RobotoBold mt-4">Renter Information</Text>
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Name"
          value={contractData.renterInformation.name}
          onChangeText={(value) => handleInputChange('renterInformation', 'name', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Phone Number"
          value={contractData.renterInformation.phoneNumber}
          onChangeText={(value) => handleInputChange('renterInformation', 'phoneNumber', value)}
          keyboardType="phone-pad"
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="ID Card Number"
          value={contractData.renterInformation.idCardNumber}
          onChangeText={(value) => handleInputChange('renterInformation', 'idCardNumber', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Driver License Number"
          value={contractData.renterInformation.driverLicenseNumber}
          onChangeText={(value) => handleInputChange('renterInformation', 'driverLicenseNumber', value)}
        />

        {/* Vehicle Owner Information */}
        <Text className="text-lg font-RobotoBold mt-4">Vehicle Owner Information</Text>
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Name"
          value={contractData.vehicleOwnerInformation.name}
          onChangeText={(value) => handleInputChange('vehicleOwnerInformation', 'name', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Phone Number"
          value={contractData.vehicleOwnerInformation.phoneNumber}
          onChangeText={(value) => handleInputChange('vehicleOwnerInformation', 'phoneNumber', value)}
          keyboardType="phone-pad"
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="ID Card Number"
          value={contractData.vehicleOwnerInformation.idCardNumber}
          onChangeText={(value) => handleInputChange('vehicleOwnerInformation', 'idCardNumber', value)}
        />

        {/* Vehicle Information */}
        <Text className="text-lg font-RobotoBold mt-4">Vehicle Information</Text>
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Brand"
          value={contractData.vehicleInformation.brand}
          onChangeText={(value) => handleInputChange('vehicleInformation', 'brand', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Model"
          value={contractData.vehicleInformation.model}
          onChangeText={(value) => handleInputChange('vehicleInformation', 'model', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Year"
          value={contractData.vehicleInformation.year.toString()}
          onChangeText={(value) => handleInputChange('vehicleInformation', 'year', parseInt(value) || 0)}
          keyboardType="numeric"
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Color"
          value={contractData.vehicleInformation.color}
          onChangeText={(value) => handleInputChange('vehicleInformation', 'color', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Vehicle Registration ID"
          value={contractData.vehicleInformation.vehicleRegistrationId}
          onChangeText={(value) => handleInputChange('vehicleInformation', 'vehicleRegistrationId', value)}
        />

        {/* Contract Address */}
        <Text className="text-lg font-RobotoBold mt-4">Contract Address</Text>
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="City"
          value={contractData.contractAddress.city}
          onChangeText={(value) => handleInputChange('contractAddress', 'city', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="District"
          value={contractData.contractAddress.district}
          onChangeText={(value) => handleInputChange('contractAddress', 'district', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Ward"
          value={contractData.contractAddress.ward}
          onChangeText={(value) => handleInputChange('contractAddress', 'ward', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Address"
          value={contractData.contractAddress.address}
          onChangeText={(value) => handleInputChange('contractAddress', 'address', value)}
        />

        {/* Rental Information */}
        <Text className="text-lg font-RobotoBold mt-4">Rental Information</Text>
        <Text className="text-base mt-2">
          Start Date: {new Date(contractData.rentalInformation.startDateTime).toLocaleString()}
        </Text>
        <Text className="text-base mt-2">
          End Date: {new Date(contractData.rentalInformation.endDateTime).toLocaleString()}
        </Text>
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Total Days"
          value={contractData.rentalInformation.totalDays.toString()}
          onChangeText={(value) => handleInputChange('rentalInformation', 'totalDays', parseInt(value) || 1)}
          keyboardType="numeric"
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Total Price (VND)"
          value={contractData.rentalInformation.totalPrice.toString()}
          onChangeText={(value) => handleInputChange('rentalInformation', 'totalPrice', parseInt(value) || 0)}
          keyboardType="numeric"
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Deposit Price (VND)"
          value={contractData.rentalInformation.depositPrice.toString()}
          onChangeText={(value) => handleInputChange('rentalInformation', 'depositPrice', parseInt(value) || 0)}
          keyboardType="numeric"
        />

        {/* Vehicle Condition */}
        <Text className="text-lg font-RobotoBold mt-4">Vehicle Condition</Text>
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Outer Vehicle Condition"
          value={contractData.vehicleCondition.outerVehicleCondition}
          onChangeText={(value) => handleInputChange('vehicleCondition', 'outerVehicleCondition', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Inner Vehicle Condition"
          value={contractData.vehicleCondition.innerVehicleCondition}
          onChangeText={(value) => handleInputChange('vehicleCondition', 'innerVehicleCondition', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Tires Condition"
          value={contractData.vehicleCondition.tiresCondition}
          onChangeText={(value) => handleInputChange('vehicleCondition', 'tiresCondition', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Engine Condition"
          value={contractData.vehicleCondition.engineCondition}
          onChangeText={(value) => handleInputChange('vehicleCondition', 'engineCondition', value)}
        />
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-2"
          placeholder="Note"
          value={contractData.vehicleCondition.note}
          onChangeText={(value) => handleInputChange('vehicleCondition', 'note', value)}
        />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleCreateContract}
          className="bg-[#2563EB] py-3 px-4 rounded-md mt-6 mb-4"
        >
          <Text className="text-white font-RobotoMedium text-center text-base">Create Contract</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateContract;