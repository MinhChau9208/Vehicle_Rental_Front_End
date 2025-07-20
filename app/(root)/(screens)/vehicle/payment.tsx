import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for icons

const Payment = () => {
  const params = useLocalSearchParams();
  const { rentalId, depositPrice } = params;
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'amex' | 'visa'>('paypal'); // State for selected payment method

  // Handle missing rentalId or depositPrice
  if (!rentalId || !depositPrice) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">Missing payment information</Text>
      </SafeAreaView>
    );
  }

  const depositPriceNum = parseFloat(depositPrice as string);
  const formattedPrice = depositPriceNum.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  // Handle the "Pay Now" action
  const handlePayNow = async () => {
    setLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      console.log('accesstoken: ', accessToken);
      const response = await rentalAPI.payDeposit(parseInt(rentalId as string));
      if (response.data.status === 200) {
        showToast('success', 'Payment successful');
        router.push('/history'); // Navigate to history on success
      } else {
        throw new Error(response.data.message || 'Failed to make payment');
      }
    } catch (err: any) {
      // Handle various error codes and display appropriate messages
      const errorMessage =
        err.response?.data?.errorCode === 8004
          ? 'Rental not found.'
          : err.response?.data?.errorCode === 8005
          ? 'Rental is cancelled.'
          : err.response?.data?.errorCode === 8006
          ? 'Rental is not deposit pending.'
          : err.response?.data?.errorCode === 8106
          ? 'Failed to deposit payment.'
          : err.response?.data?.message || 'Could not make payment.';
      showToast('error', err.response?.data?.errorCode, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Dummy function for clickable items
  const handleDummyClick = (item: string) => {
    showToast('info', 'Demo Feature', `${item} clicked! (This is a demo action)`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center">Checkout</Text>
        <TouchableOpacity onPress={() => handleDummyClick('More Options')} className="p-2">
          <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Summary Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
          <TouchableOpacity onPress={() => handleDummyClick('Summary Details')} className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-RobotoBold text-gray-800">Summary</Text>
            <Ionicons name="arrow-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
            <Text className="text-base font-RobotoRegular text-gray-700">Deposit</Text>
            <Text className="text-base font-RobotoMedium text-gray-800">{formattedPrice}</Text>
          </View>

          {/* Dummy clickable items for demo */}
          <TouchableOpacity onPress={() => handleDummyClick('Subtotal')} className="flex-row justify-between items-center py-2 border-b border-gray-200">
            <Text className="text-base font-RobotoRegular text-gray-700">Subtotal</Text>
            <Text className="text-base font-RobotoMedium text-gray-800">1,000,000 VND</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDummyClick('Delivery Fee')} className="flex-row justify-between items-center py-2 border-b border-gray-200">
            <Text className="text-base font-RobotoRegular text-gray-700">Delivery Fee</Text>
            <Text className="text-base font-RobotoMedium text-gray-800">50,000 VND</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDummyClick('Tip')} className="flex-row justify-between items-center py-2 border-b border-gray-200">
            <Text className="text-base font-RobotoRegular text-gray-700">Tip</Text>
            <Text className="text-base font-RobotoMedium text-gray-800">20,000 VND</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDummyClick('Discount')} className="flex-row justify-between items-center py-2">
            <Text className="text-base font-RobotoRegular text-gray-700">Discount</Text>
            <Text className="text-base font-RobotoMedium text-red-500">-100,000 VND</Text>
          </TouchableOpacity>

          <View className="flex-row justify-between items-center mt-4 pt-4 border-t-2 border-gray-300">
            <Text className="text-xl font-RobotoBold text-gray-900">Total</Text>
            <Text className="text-xl font-RobotoBold text-gray-900">1,100,000 VND</Text>
          </View>

          <View className="flex-row justify-between items-center mt-4 pt-4 border-t-2 border-gray-300">
            <Text className="text-xl font-RobotoBold text-gray-900">Deposit For Now:</Text>
            <Text className="text-xl font-RobotoBold text-[#2563EB]">{formattedPrice}</Text>
          </View>

          <TouchableOpacity onPress={() => handleDummyClick('Add more items')} className="mt-4 flex-row items-center justify-center py-2 border border-gray-300 rounded-lg">
            <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
            <Text className="text-[#2563EB] font-RobotoMedium ml-2">Add more items</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Methods Section */}
        <View className="bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Payment methods</Text>

          {/* PayPal */}
          <TouchableOpacity
            onPress={() => setPaymentMethod('paypal')}
            className={`flex-row items-center p-3 rounded-lg mb-3 ${paymentMethod === 'paypal' ? 'border-2 border-[#2563EB]' : 'border border-gray-300'}`}
          >
            <Ionicons
              name={paymentMethod === 'paypal' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={paymentMethod === 'paypal' ? '#2563EB' : '#D1D5DB'}
            />
            <Ionicons name="logo-paypal" size={24} color="#003087" style={{ marginLeft: 10, marginRight: 8 }} />
            <Text className="text-base font-RobotoMedium text-gray-800">PayPal</Text>
          </TouchableOpacity>

          {/* Amex */}
          <TouchableOpacity
            onPress={() => setPaymentMethod('amex')}
            className={`flex-row items-center p-3 rounded-lg mb-3 ${paymentMethod === 'amex' ? 'border-2 border-[#2563EB]' : 'border border-gray-300'}`}
          >
            <Ionicons
              name={paymentMethod === 'amex' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={paymentMethod === 'amex' ? '#2563EB' : '#D1D5DB'}
            />
            <Ionicons name="card" size={24} color="#007BC1" style={{ marginLeft: 10, marginRight: 8 }} />
            <Text className="text-base font-RobotoMedium text-gray-800">Amex ....89001</Text>
          </TouchableOpacity>

          {/* Visa */}
          <TouchableOpacity
            onPress={() => setPaymentMethod('visa')}
            className={`flex-row items-center p-3 rounded-lg mb-3 ${paymentMethod === 'visa' ? 'border-2 border-[#2563EB]' : 'border border-gray-300'}`}
          >
            <Ionicons
              name={paymentMethod === 'visa' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={paymentMethod === 'visa' ? '#2563EB' : '#D1D5DB'}
            />
            <Ionicons name="card" size={24} color="#1A237E" style={{ marginLeft: 10, marginRight: 8 }} />
            <Text className="text-base font-RobotoMedium text-gray-800">Visa ....3021</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDummyClick('Add payment method')} className="mt-4 flex-row items-center justify-center py-2 border border-gray-300 rounded-lg">
            <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
            <Text className="text-[#2563EB] font-RobotoMedium ml-2">Add payment method</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View className="p-4 bg-white border-t border-gray-200 shadow-lg">
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <TouchableOpacity
            className="bg-[#EF4444] py-4 rounded-xl shadow-md active:bg-[#DC2626]"
            onPress={handlePayNow}
          >
            <Text className="text-white text-lg font-RobotoBold text-center">Place Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Payment;
