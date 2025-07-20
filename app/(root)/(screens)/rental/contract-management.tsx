import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rentalAPI, authAPI } from '@/services/api';
import { router } from 'expo-router';
import Modal from '@/components/Modal';
import { showToast } from '@/components/ToastAlert';

interface Contract {
  id: string;
  rentalId: number;
  contractStatus: string;
  renterStatus: string;
  ownerStatus: string;
  createdAt: string;
}

const ContractManagement = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rentalId, setRentalId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'password' | 'rentalId'>('password');
  const [currentContractId, setCurrentContractId] = useState<string>('');
  const [actionType, setActionType] = useState<'sign' | 'reject'>('sign');
  const [userRole, setUserRole] = useState<'renter' | 'owner' | null>(null);

  const fetchContracts = async () => {
    if (!rentalId) {
      setError('Please enter a Rental ID');
      return;
    }
    setLoading(true);
    try {
      const response = await rentalAPI.getAllContractsFromRentalId(parseInt(rentalId));
      if (response.data.status === 200) {
        setContracts(response.data.data);
        setError(null);

        const userResponse = await authAPI.getUser();
        if (userResponse.data.status === 200) {
          const userId = userResponse.data.data.id;
          const rentalResponse = await rentalAPI.getRentalRecord(parseInt(rentalId));
          if (rentalResponse.data.status === 200) {
            const rentalData = rentalResponse.data.data;
            if (userId === rentalData.renterId) setUserRole('renter');
            else if (userId === rentalData.vehicleOwnerId) setUserRole('owner');
          }
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch contracts');
      }
    } catch (err: any) {
      setError(err.message || 'Could not load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = () => {
    if (!rentalId) {
      showToast('error', 'Please enter a Rental ID first');
      return;
    }
    router.push({ pathname: '/create-contract', params: { rentalId } });
  };

  const handleContractAction = (contractId: string, action: 'sign' | 'reject') => {
    setCurrentContractId(contractId);
    setActionType(action);
    setModalType('password');
    setIsModalVisible(true);
  };

  const handleModalSubmit = async (password: string) => {
    try {
      const apiCall = userRole === 'renter' ? rentalAPI.renterSignContract : rentalAPI.ownerSignContract;
      const response = await apiCall(currentContractId, actionType === 'sign', password);
      if (response.data.status === 200) {
        showToast('success', `Contract ${actionType}ed successfully`);
        fetchContracts();
      } else {
        throw new Error(response.data.message || `Failed to ${actionType} contract`);
      }
    } catch (err: any) {
      showToast('error', err.message || `Could not ${actionType} contract`);
    } finally {
      setIsModalVisible(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-5">
      <Text className="text-2xl font-RobotoBold">Contract Management</Text>
      <TextInput
        className="border border-gray-300 rounded-md p-2 mt-4"
        placeholder="Enter Rental ID"
        value={rentalId}
        onChangeText={setRentalId}
        keyboardType="numeric"
      />
      <TouchableOpacity
        onPress={fetchContracts}
        className="bg-[#2563EB] py-2 px-4 rounded-md mt-4"
      >
        <Text className="text-white font-RobotoMedium text-center">Fetch Contracts</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleCreateContract}
        className="bg-[#2563EB] py-2 px-4 rounded-md mt-4"
      >
        <Text className="text-white font-RobotoMedium text-center">Create New Contract</Text>
      </TouchableOpacity>
      {loading && <ActivityIndicator size="large" color="#2563EB" className="mt-4" />}
      {error && <Text className="text-red-500 font-RobotoMedium mt-4">{error}</Text>}
      <FlatList
        data={contracts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="p-4 bg-gray-100 rounded-lg mb-4">
            <Text>Contract ID: {item.id}</Text>
            <Text>Rental ID: {item.rentalId}</Text>
            <Text>Status: {item.contractStatus}</Text>
            <Text>Renter Status: {item.renterStatus}</Text>
            <Text>Owner Status: {item.ownerStatus}</Text>
            {item.contractStatus === 'PENDING' && (
              <View className="flex-row mt-2">
                <TouchableOpacity
                  onPress={() => handleContractAction(item.id, 'sign')}
                  className="bg-green-500 py-2 px-4 rounded-md mr-2"
                >
                  <Text className="text-white">Sign</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleContractAction(item.id, 'reject')}
                  className="bg-red-500 py-2 px-4 rounded-md"
                >
                  <Text className="text-white">Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
      <Modal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleModalSubmit}
        title="Enter Password"
        placeholder="Password"
        secureTextEntry
      />
    </SafeAreaView>
  );
};

export default ContractManagement;