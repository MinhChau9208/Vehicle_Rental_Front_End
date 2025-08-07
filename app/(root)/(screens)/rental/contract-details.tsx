import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';
import { Ionicons } from '@expo/vector-icons';
import { ContractDetailsData } from '@/types/contractData'; // Import type
import ContractDisplay from '@/components/ui/ContractDisplay'; // Import component

const ContractDetails = () => {
    const { contractId } = useLocalSearchParams();
    const [contract, setContract] = useState<ContractDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContract = async () => {
            if (!contractId) {
                setError('Contract ID is missing');
                setLoading(false);
                return;
            }
            try {
                const response = await rentalAPI.getContractById(contractId as string);
                if (response.data.status === 200) {
                    setContract(response.data.data);
                } else {
                    throw new Error(response.data.message || 'Failed to fetch contract');
                }
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message || 'Could not load contract details';
                setError(errorMessage);
                showToast('error', errorMessage);
            } finally {
                setLoading(false);
            }
        };
        fetchContract();
    }, [contractId]);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </SafeAreaView>
        );
    }

    if (error || !contract) {
        return (
            <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
                <Text className="text-red-500 font-RobotoMedium text-center">{error || 'No contract data found'}</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
                    <Text className="text-white font-RobotoMedium">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-100">
            <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center">Chi Tiết Hợp Đồng</Text>
                <View className="w-10" />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Use the imported component */}
                <ContractDisplay contract={contract} />
            </ScrollView>
        </SafeAreaView>
    );
};

export default ContractDetails;
