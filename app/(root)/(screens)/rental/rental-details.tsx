import React, { useState, useEffect } from 'react';
import { Text, View, Image, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI, vehicleAPI, authAPI, chatAPI } from '@/services/api';
import { socketService } from '@/services/socketService';
import { Ionicons, Feather } from '@expo/vector-icons'; // Added Feather for icons
import Modal from '@/components/Modal';
import { showToast } from '@/components/ToastAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { images } from '@/constants';

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

interface Rating {
  vehicleId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

interface UserPublicInfo {
  nickname: string;
  avatar: string | null;
}

const RentalDetails = () => {
  const { rentalId } = useLocalSearchParams();
  const [rental, setRental] = useState<RentalDetails | null>(null);
  const [userInfo, setUserInfo] = useState<UserPublicInfo | null>(null);
  const [userRole, setUserRole] = useState<'renter' | 'owner' | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentContractId, setCurrentContractId] = useState<string>('');
  const [actionType, setActionType] = useState<'sign' | 'reject'>('sign');
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchRentalDetails = async () => {
      if (!rentalId) {
        setError('Rental ID is missing');
        setLoading(false);
        return;
      }
      try {
        // Fetch rental details
        const rentalResponse = await rentalAPI.getRentalRecord(parseInt(rentalId as string));
        if (rentalResponse.data.status === 200) {
          const rentalData = rentalResponse.data.data;
          setRental(rentalData);

          // Fetch user role and ID
          const userResponse = await authAPI.getUser();
          if (userResponse.data.status !== 200) throw new Error('Failed to fetch user data');

          const currentUserId = userResponse.data.data.id;
          setUserId(currentUserId);

          let role: 'renter' | 'owner' = 'renter';
          let userId: number;

          if (currentUserId === rentalData.renterId) {
            role = 'renter';
            userId = rentalData.vehicleOwnerId;
          } else {
            role = 'owner';
            userId = rentalData.renterId;
          }
          setUserRole(role);

          // Fetch renter info
          const userInfoResponse = await authAPI.getUserPublicInfo(userId);
          if (userInfoResponse.data.status === 200) {
            setUserInfo(userInfoResponse.data.data);
          } else {
            setUserInfo({ nickname: 'Unknown User', avatar: images.avatar });
          }

          // Fetch vehicle details
          const vehicleResponse = await vehicleAPI.getVehicleById(rentalData.vehicleId);
          if (vehicleResponse.data.status === 200) {
            setRental({
              ...rentalData,
              vehicle: { imageFront: vehicleResponse.data.data.imageFront, title: vehicleResponse.data.data.title },
            });
          }

          // Fetch contracts
          const contractResponse = await rentalAPI.getAllContractsFromRentalId(parseInt(rentalId as string));
          if (contractResponse.data.status === 200) {
            setContracts(contractResponse.data.data);
          } else {
            throw new Error(contractResponse.data.message || 'Failed to fetch contracts');
          }

          // Check for existing rating if renter and status is COMPLETED
          if (rentalData.status === 'COMPLETED' && userResponse.data.status === 200 && userResponse.data.data.id === rentalData.renterId) {
            const ratingsResponse = await vehicleAPI.getVehicleRatings({ vehicleId: rentalData.vehicleId, page: 1, limit: 1 });
            if (ratingsResponse.data.status === 200) {
              const userRating = ratingsResponse.data.data.ratings.find((r: Rating) => r.userId === userResponse.data.data.id);
              if (userRating) {
                setExistingRating(userRating);
              }
            }
          }

          setError(null);
        } else {
          throw new Error('Failed to fetch rental details');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load rental details');
        showToast('error', err.message || 'Could not load rental details or contracts');
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
        return '#F59E0B'; // Amber
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return '#3B82F6'; // Blue
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return '#8B5CF6'; // Purple
      case 'REMAINING PAYMENT PAID':
        return '#10B981'; // Green
      case 'RENTER RECEIVED':
        return '#3B82F6'; // Blue
      case 'RENTER RETURNED':
        return '#10B981'; // Green
      case 'COMPLETED':
        return '#0D9488'; // Teal
      case 'CANCELLED':
        return '#EF4444'; // Red
      case 'DEPOSIT REFUNDED':
        return '#6B7280'; // Gray
      default:
        return '#1F2937'; // Dark Gray
    }
  };

  const handleChat = async () => {
    if (!rental || !userRole) return;
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const receiverId = userRole === 'renter' ? rental.vehicleOwnerId : rental.renterId;

      const response = await chatAPI.createChatSession([receiverId]);
      if (response.data.status !== 201 && response.data.message !== "Chat session already exists.") {
        throw new Error(response.data.message || 'Failed to create chat session');
      }
      const sessionId = response.data.data.id;

      await socketService.connectChat(userId!, accessToken);
      socketService.joinSession(sessionId);

      router.push({
        pathname: '/chat/chat-detail',
        params: { sessionId: sessionId.toString(), receiverId: receiverId.toString() },
      });
    } catch (err: any) {
      showToast('error', err.message || 'Failed to initiate chat session');
    }
  };

  const handleOwnerDecision = async (status: boolean) => {
    if (!rental) return;

    const action = status ? 'approve' : 'reject';
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} this rental request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await rentalAPI.ownerRentalDecision(rental.id, status);
              if (response.data.status === 200) {
                showToast('success', `Rental ${action}ed successfully.`);
                router.back();
              } else {
                throw new Error(response.data.message || `Failed to ${action} rental`);
              }
            } catch (err: any) {
              showToast('error', err.message || `Could not ${action} rental`);
            }
          },
        },
      ]
    );
  };

  const handleConfirmReturn = async () => {
    if (!rental) return;
    try {
      const response = await rentalAPI.confirmRenterReturnedVehicle(rental.id);
      if (response.data.status === 200) {
        showToast('success', 'Vehicle return confirmed.');
        setRental({ ...rental, status: 'RENTER RETURNED' });
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to confirm return');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Could not confirm return');
    }
  };

  const handleConfirmReceived = async () => {
    if (!rental) return;
    try {
      const response = await rentalAPI.confirmRenterReceivedVehicle(rental.id);
      if (response.data.status === 200) {
        showToast('success', 'Vehicle receipt confirmed.');
        setRental({ ...rental, status: 'RENTER RECEIVED' });
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to confirm receipt');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Could not confirm receipt');
    }
  };

  const handleFinalPayment = async () => {
    if (!rental) return;
    try {
      const response = await rentalAPI.remainingPayment(rental.id);
      if (response.data.status === 200) {
        showToast('success', 'Final payment successful');
        setRental({ ...rental, status: 'REMAINING PAYMENT PAID' });
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to process final payment');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Could not process final payment');
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
        const contractResponse = await rentalAPI.getAllContractsFromRentalId(parseInt(rentalId as string));
        if (contractResponse.data.status === 200) {
          setContracts(contractResponse.data.data);
          router.back();
        }
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
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error || !rental) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error || 'No rental data found'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center">Rental Details</Text>
        </View>

        {/* Vehicle Info Card */}
        {rental.vehicle && (
          <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
            <Image
              source={{ uri: rental.vehicle.imageFront }}
              className="w-full h-52 rounded-lg mb-3"
              resizeMode="cover"
              onError={(e) => console.log(`Image load error for ${rental.vehicle?.imageFront}:`, e.nativeEvent.error)}
            />
            <Text className="text-xl font-RobotoBold text-gray-900">{rental.vehicle.title}</Text>
            <View className="flex-row items-center mt-2">
              <Ionicons name="car-outline" size={20} color="#6B7280" />
              <Text className="text-sm text-gray-600 font-RobotoMedium ml-2">Vehicle ID: {rental.vehicleId}</Text>
            </View>
          </View>
        )}

        {/* Renter Info Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">
            {userRole === 'renter' ? 'Owner Information' : 'Renter Information'}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image
                source={userInfo?.avatar ? { uri: userInfo.avatar } : images.avatar}
                className="w-12 h-12 rounded-full mr-3 border border-gray-200"
              />
              <Text className="text-base font-RobotoBold text-gray-800">{userInfo?.nickname || 'Unknown'}</Text>
            </View>
            <TouchableOpacity onPress={handleChat} className="p-2 rounded-full bg-blue-50">
              <Ionicons name="chatbubble-outline" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center mt-3">
            <Ionicons name="call-outline" size={20} color="#6B7280" />
            <Text className="text-base text-gray-700 font-RobotoMedium ml-2">Phone: {rental.renterPhoneNumber}</Text>
          </View>
        </View>

        {/* Rental Information Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Rental Information</Text>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">Rental ID</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">{rental.id}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">Start Date</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">
              {new Date(rental.startDateTime).toLocaleString()}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">End Date</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">
              {new Date(rental.endDateTime).toLocaleString()}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">Total Days</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">{rental.totalDays}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">Daily Price</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">
              {rental.dailyPrice.toLocaleString()} VND
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-base text-gray-700 font-RobotoRegular">Deposit Price</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">
              {rental.depositPrice.toLocaleString()} VND
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-base text-gray-700 font-RobotoRegular">Total Price</Text>
            <Text className="text-base text-gray-800 font-RobotoMedium">
              {rental.totalPrice.toLocaleString()} VND
            </Text>
          </View>
          <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-200">
            <Text className="text-lg font-RobotoBold text-gray-800">Current Status</Text>
            <Text style={{ color: getStatusColor(rental.status) }} className="text-lg font-RobotoBold">
              {rental.status}
            </Text>
          </View>
        </View>



        {/* Action Buttons */}
        <View className="mx-4 mt-4">
          {userRole === 'renter' && rental.status === 'DEPOSIT PENDING' && (
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/vehicle/payment',
                params: { rentalId: rental.id.toString(), depositPrice: rental.depositPrice.toString() }
              })}
              className="bg-green-500 py-3 rounded-xl mb-3 shadow-md active:bg-green-600"
            >
              <Text className="text-white font-RobotoBold text-center text-base">Pay Deposit</Text>
            </TouchableOpacity>
          )}

          {(userRole === 'renter' && ['DEPOSIT REFUNDED', 'COMPLETED'].includes(rental.status)) ? (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/rental/rating', params: { rentalId: rental.id.toString() } })}
              className="bg-[#2563EB] py-3 rounded-xl mb-3 shadow-md active:bg-[#1D4ED8]"
            >
              <Text className="text-white font-RobotoBold text-center text-base">
                {existingRating ? 'Edit Rating' : 'Rate Vehicle'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {userRole === 'renter' && rental.status === 'CONTRACT SIGNED' && (
            <TouchableOpacity
              onPress={handleFinalPayment}
              className="bg-[#2563EB] py-3 rounded-xl mb-3 shadow-md active:bg-[#1D4ED8]"
            >
              <Text className="text-white font-RobotoBold text-center text-base">Make Final Payment</Text>
            </TouchableOpacity>
          )}
          {userRole === 'owner' && rental.status === 'OWNER PENDING' && (
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => handleOwnerDecision(true)}
                className="bg-green-500 py-3 rounded-xl flex-1 mr-2 shadow-md active:bg-green-600"
              >
                <Text className="text-white font-RobotoBold text-center text-base">Approve Request</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleOwnerDecision(false)}
                className="bg-red-500 py-3 rounded-xl flex-1 ml-2 shadow-md active:bg-red-600"
              >
                <Text className="text-white font-RobotoBold text-center text-base">Reject Request</Text>
              </TouchableOpacity>
            </View>
          )}
          {userRole === 'owner' && rental.status === 'REMAINING PAYMENT PAID' && (
            <TouchableOpacity
              onPress={handleConfirmReceived}
              className="bg-[#2563EB] py-3 rounded-xl mb-3 shadow-md active:bg-[#1D4ED8]"
            >
              <Text className="text-white font-RobotoBold text-center text-base">Confirm Renter Received Vehicle</Text>
            </TouchableOpacity>
          )}
          {userRole === 'owner' && rental.status === 'RENTER RECEIVED' && (
            <TouchableOpacity
              onPress={handleConfirmReturn}
              className="bg-[#2563EB] py-3 rounded-xl mb-3 shadow-md active:bg-[#1D4ED8]"
            >
              <Text className="text-white font-RobotoBold text-center text-base">Confirm Vehicle Returned</Text>
            </TouchableOpacity>
          )}
          {userRole === 'owner' && ['OWNER APPROVED', 'CONTRACT PENDING'].includes(rental.status) && (
            <TouchableOpacity
              onPress={handleCreateContract}
              className="bg-[#2563EB] py-3 rounded-xl mb-3 shadow-md active:bg-[#1D4ED8]"
            >
              <Text className="text-white font-RobotoBold text-center text-base">Create New Contract</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Workflow History Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Status Workflow History</Text>
          {rental.statusWorkflowHistory.map((history, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <View className="ml-3 flex-1">
                <Text className="text-sm text-gray-500 font-RobotoRegular">
                  {new Date(history.date).toLocaleString()}
                </Text>
                <Text className="text-base font-RobotoMedium text-gray-800">{history.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Contracts Section */}
        {contracts.length > 0 && (
          <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
            <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Contracts</Text>
            {contracts.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push({ pathname: '/rental/contract-details', params: { contractId: item.id } })}
                className="p-4 bg-gray-50 rounded-lg mb-3 border border-gray-200 active:bg-gray-100"
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-base font-RobotoBold text-blue-600">Contract #{item.id.substring(item.id.length - 10)}</Text>
                    <Text className="text-sm text-gray-600 mt-1">Status: <Text className="font-RobotoMedium" style={{ color: getStatusColor(item.contractStatus) }}>{item.contractStatus}</Text></Text>
                    <Text className="text-xs text-gray-500 mt-2">Day Created: {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#6B7280" />
                </View>
                {item.contractStatus === 'PENDING' && (
                  <View className="flex-row mt-4 pt-3 border-t border-gray-200 justify-end">
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleContractAction(item.id, 'sign'); }} className="bg-green-500 py-2 px-4 rounded-md mr-2 shadow-sm"><Text className="text-white font-RobotoMedium">Sign</Text></TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleContractAction(item.id, 'reject'); }} className="bg-red-500 py-2 px-4 rounded-md shadow-sm"><Text className="text-white font-RobotoMedium">Reject</Text></TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
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

export default RentalDetails;
