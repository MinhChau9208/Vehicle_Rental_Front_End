import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';
import { Ionicons } from '@expo/vector-icons';
import { ContractData } from '@/types/contractData'; // Import type
import EditableContractDisplay from '@/components/ui/EditableContract'; // Import component

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
          const sanitizedData = {
            ...data,
            vehicleCondition: data.vehicleCondition || {
              outerVehicleCondition: '',
              innerVehicleCondition: '',
              tiresCondition: '',
              engineCondition: '',
              note: '',
            },
          };
          setContractData(sanitizedData);
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

  const handleInputChange = (section: keyof ContractData, field: string, value: string) => {
    if (!contractData) return;
    setContractData(prevData => {
        if (!prevData) return null;
        const sectionData = prevData[section];
        if (typeof sectionData === 'object' && sectionData !== null) {
            return {
                ...prevData,
                [section]: {
                    ...sectionData,
                    [field]: value,
                },
            };
        }
        return prevData;
    });
  };

  const handleCreateContract = async () => {
    if (!contractData) {
      showToast('error', 'Contract data is missing.');
      return;
    }
    // Basic validation for vehicle condition
    const { vehicleCondition } = contractData;
    if (!vehicleCondition.outerVehicleCondition || !vehicleCondition.innerVehicleCondition || !vehicleCondition.tiresCondition || !vehicleCondition.engineCondition) {
        showToast('error', 'Please fill in all vehicle condition fields.');
        return;
    }

    try {
      const response = await rentalAPI.createContract(contractData, rentalId ? parseInt(rentalId as string) : 0);
      if (response.data.status === 200) {
        showToast('success', 'Contract created successfully');
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to create contract');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Could not create contract.';
      showToast('error', errorMessage);
    }
  };

  if (loading) return <SafeAreaView className="flex-1 bg-white justify-center items-center"><ActivityIndicator size="large" color="#2563EB" /></SafeAreaView>;
  
  if (error || !contractData) return (
    <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
      <Text className="text-red-500 font-RobotoMedium">{error || 'No contract data found'}</Text>
      <TouchableOpacity onPress={() => router.back()} className="mt-4"><Text className="text-[#2563EB] font-RobotoMedium">Go Back</Text></TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
       <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2"><Ionicons name="arrow-back" size={24} color="#000" /></TouchableOpacity>
          <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center">Prepare Contract</Text>
          <View className="w-10" />
        </View>
      <ScrollView className="p-4">
        {/* Use the imported component */}
        <EditableContractDisplay contractData={contractData} handleInputChange={handleInputChange} />
        <TouchableOpacity onPress={handleCreateContract} className="bg-[#2563EB] py-3 px-4 rounded-md mt-2 mb-4 shadow-md active:bg-[#1D4ED8]">
          <Text className="text-white font-RobotoMedium text-center text-base">Create Contract</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateContract;
