import React, { useState, useEffect } from 'react';
import { Text, View, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI, vehicleAPI, authAPI, chatAPI } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import Modal from '@/components/Modal';
import { showToast } from '@/components/ToastAlert';

interface RentalDetails {
  id: number;
  vehicleId: number;
  vehicleOwnerId: number;
  renterId: number;
  renterPhoneNumber: string;
  startDateTime: string;
  endDateTime: string;
  totalDays: number;
  dailyPrice: number;
  totalPrice: number;
  depositPrice: number;
  status: string;
  statusWorkflowHistory: Array<{ date: string; status: string }>;
  createdAt: string;
  updatedAt: string;
  vehicle?: { imageFront: string; title: string };
}

interface Contract {
  id: string;
  rentalId: number;
  contractStatus: string;
  renterStatus: string;
  ownerStatus: string;
  createdAt: string;
}

const RentalContractDetails = () => {
  const { rentalId } = useLocalSearchParams();
  const [rental, setRental] = useState<RentalDetails | null>(null);
  const [renterInfo, setRenterInfo] = useState<{ nickname: string; avatar: string | null } | null>(null);
  const [userRole, setUserRole] = useState<'renter' | 'owner' | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentContractId, setCurrentContractId] = useState<string>('');
  const [actionType, setActionType] = useState<'sign' | 'reject'>('sign');

  useEffect(() => {
    const fetchRentalDetails = async () => {
      if (!rentalId) {
        setError('Rental ID is missing');
        setLoading(false);
        return;
      }
      try {
        const rentalResponse = await rentalAPI.getRentalRecord(parseInt(rentalId as string));
        if (rentalResponse.data.status === 200) {
          const rentalData = rentalResponse.data.data;
          setRental(rentalData);

          const userResponse = await authAPI.getUser();
          if (userResponse.data.status === 200) {
            const userId = userResponse.data.data.id;
            if (userId === rentalData.renterId) setUserRole('renter');
            else if (userId === rentalData.vehicleOwnerId) setUserRole('owner');
          }

          const renterResponse = await authAPI.getUserPublicInfo(rentalData.renterId);
          if (renterResponse.data.status === 200) {
            setRenterInfo({
              nickname: renterResponse.data.data.nickname,
              avatar: renterResponse.data.data.avatar,
            });
          } else {
            setRenterInfo({ nickname: 'Unknown', avatar: null });
          }

          const vehicleResponse = await vehicleAPI.getVehicleById(rentalData.vehicleId);
          if (vehicleResponse.data.status === 200) {
            setRental({
              ...rentalData,
              vehicle: { imageFront: vehicleResponse.data.data.imageFront, title: vehicleResponse.data.data.title },
            });
          }
        } else {
          throw new Error('Failed to fetch rental details');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load rental details');
      } finally {
        setLoading(false);
      }
    };

    fetchRentalDetails();
  }, [rentalId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPOSIT PENDING':
      case 'DEPOSIT PAID':
        return 'orange';
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return 'blue';
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return 'purple';
      case 'REMAINING PAYMENT PAID':
      case 'RENTER RECEIVED':
      case 'RENTER RETURNED':
        return 'green';
      case 'COMPLETED':
        return 'teal';
      case 'CANCELLED':
        return 'red';
      case 'DEPOSIT REFUNDED':
        return 'gray';
      default:
        return 'black';
    }
  };

  const handleChatWithRenter = async () => {
    if (!rental) return;
    try {
      const response = await chatAPI.createChatSession(rental.renterId);
      if (response.data.status === 201) {
        const sessionId = response.data.data.id;
        router.push({ pathname: '/chat/chat-detail', params: { sessionId: sessionId.toString(), receiverId: rental.renterId.toString() } });
      } else if (response.data.errorCode === 5001) {
        const existsessionId = response.data.data.id;
        router.push({ pathname: '/chat/chat-detail', params: { sessionId: existsessionId.toString(), receiverId: rental.renterId.toString() } });
      } else {
        showToast('error', response.data.message || 'Failed to create chat session');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create chat session');
    }
  };

  const handleFetchContracts = async () => {
    if (!rentalId) {
      showToast('error', 'Rental ID is missing');
      return;
    }
    setLoading(true);
    try {
      const response = await rentalAPI.getAllContractsFromRentalId(parseInt(rentalId as string));
      if (response.data.status === 200) {
        setContracts(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch contracts');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Could not load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = () => {
    if (!rentalId) {
      showToast('error', 'Rental ID is missing');
      return;
    }
    router.push({ pathname: '/rental/create-contract', params: { rentalId } });
  };

  const handleContractAction = (contractId: string, action: 'sign' | 'reject') => {
    setCurrentContractId(contractId);
    setActionType(action);
    setIsModalVisible(true);
  };

  const handleModalSubmit = async (password: string) => {
    try {
      const apiCall = userRole === 'renter' ? rentalAPI.renterSignContract : rentalAPI.ownerSignContract;
      const response = await apiCall(currentContractId, actionType === 'sign', password);
      if (response.data.status === 200) {
        showToast('success', `Contract ${actionType}ed successfully`);
        handleFetchContracts(); // Refresh contracts
      } else {
        throw new Error(response.data.message || `Failed to ${actionType} contract`);
      }
    } catch (err: any) {
      showToast('error', err.message || `Could not ${actionType} contract`);
    } finally {
      setIsModalVisible(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error || !rental) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error || 'No rental data found'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#2563EB] font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView>
        <View className="flex-row items-center px-4 py-2 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-Roboto font-bold ml-2">Rental & Contract Details</Text>
        </View>

        {rental.vehicle && (
          <View className="px-4 bg-white rounded-lg p-4">
            <Image
              source={{ uri: rental.vehicle.imageFront }}
              className="w-full h-80 rounded-lg"
              resizeMode="cover"
            />
            <Text className="text-xl font-Roboto font-bold mt-2">{rental.vehicle.title}</Text>
          </View>
        )}

        <View className="px-4 bg-white rounded-lg">
          <Text className="text-lg font-Roboto font-bold">Renter:</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image
                source={{ uri: renterInfo?.avatar || 'https://via.placeholder.com/40' }}
                className="w-10 h-10 rounded-full mr-2"
              />
              <Text className="text-base font-RobotoMedium">{renterInfo?.nickname || 'Unknown'}</Text>
            </View>
            <TouchableOpacity onPress={handleChatWithRenter}>
              <Ionicons name="chatbubble" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
          <Text className="text-base font-Roboto font-bold mt-4">Rental Information</Text>
          <View className="mt-2">
            <Text className="text-sm">Rental ID: {rental.id}</Text>
            <Text className="text-sm">Vehicle ID: {rental.vehicleId}</Text>
            <Text className="text-sm">Renter Phone: {rental.renterPhoneNumber}</Text>
            <Text className="text-sm">
              Start: {new Date(rental.startDateTime).toLocaleString()}
            </Text>
            <Text className="text-sm">
              End: {new Date(rental.endDateTime).toLocaleString()}
            </Text>
            <Text className="text-sm">Total Days: {rental.totalDays}</Text>
            <Text className="text-sm">
              Daily Price: {rental.dailyPrice.toLocaleString()} VND
            </Text>
            <Text className="text-sm">
              Total Price: {rental.totalPrice.toLocaleString()} VND
            </Text>
            <Text className="text-sm">
              Deposit Price: {rental.depositPrice.toLocaleString()} VND
            </Text>
            <Text style={{ color: getStatusColor(rental.status) }} className="text-sm">
              Status: {rental.status}
            </Text>
          </View>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-bold">Status Workflow History</Text>
          {rental.statusWorkflowHistory.map((history, index) => (
            <View key={index} className="mt-2">
              <Text className="text-sm text-gray-500">
                {new Date(history.date).toLocaleString()}
              </Text>
              <Text className="text-sm">{history.status}</Text>
            </View>
          ))}
        </View>

        <View className="px-4 mt-4">
          <TouchableOpacity
            onPress={handleFetchContracts}
            className="bg-[#2563EB] py-2 px-4 rounded-md mb-4"
          >
            <Text className="text-white font-RobotoMedium text-center">Fetch Contracts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreateContract}
            className="bg-[#2563EB] py-2 px-4 rounded-md mb-4"
          >
            <Text className="text-white font-RobotoMedium text-center">Create New Contract</Text>
          </TouchableOpacity>
        </View>

        {contracts.length > 0 && (
          <View className="px-4 mt-4">
            <Text className="text-base font-Roboto font-bold">Contracts</Text>
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
          </View>
        )}
      </ScrollView>
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

export default RentalContractDetails;