import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 3;

// A single scrollable time picker wheel component
const TimePickerWheel = ({
  title,
  data,
  selectedValue,
  onValueChange,
}: {
  title: string;
  data: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Effect to scroll the wheel to the selected value when it appears
  useEffect(() => {
    // Find the index of the time value (e.g., "09:00") in the data array
    const index = data.findIndex(item => item === selectedValue);
    if (index > -1 && scrollViewRef.current) {
      // Use a brief timeout to ensure the layout is ready before scrolling
      setTimeout(() => scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false }), 100);
    }
  }, [selectedValue, data]);

  // Handler for when the user stops scrolling the wheel
  const handleMomentumScrollEnd = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    if (index >= 0 && index < data.length) {
      onValueChange(data[index]);
    }
  };

  const paddingHeight = (VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT;

  return (
    <View className="items-center flex-1">
      <Text className="font-RobotoBold text-lg mb-2 text-gray-700">{title}</Text>
      <View style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }} className="w-full relative">
        {/* Highlight bar for the center item */}
        <View
          className="absolute top-0 left-0 right-0 border-t border-b border-gray-300 bg-blue-50"
          style={{ height: ITEM_HEIGHT, top: paddingHeight }}
        />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingTop: paddingHeight, paddingBottom: paddingHeight }}
        >
          {data.map((time) => (
            <View key={time} style={{ height: ITEM_HEIGHT }} className="justify-center items-center">
              <Text
                className={`text-2xl ${
                  selectedValue === time
                    ? 'font-RobotoBold text-blue-600'
                    : 'font-RobotoRegular text-gray-400'
                }`}
              >
                {time}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

// The main modal component that contains the four time pickers
export const TimePickerModal = ({
  visible,
  onClose,
  onConfirm,
  initialValues,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (times: {
    pickupStart: string;
    pickupEnd: string;
    returnStart: string;
    returnEnd: string;
  }) => void;
  initialValues: {
    pickupStart: string;
    pickupEnd: string;
    returnStart: string;
    returnEnd: string;
  };
}) => {
  // Internal state to manage time changes before confirming
  const [pickupStart, setPickupStart] = useState('09:00');
  const [pickupEnd, setPickupEnd] = useState('17:00');
  const [returnStart, setReturnStart] = useState('09:00');
  const [returnEnd, setReturnEnd] = useState('17:00');
  
  // Update internal state when the modal is opened with new initial values
  useEffect(() => {
    if(visible) {
      setPickupStart(initialValues.pickupStart.substring(0, 5));
      setPickupEnd(initialValues.pickupEnd.substring(0, 5));
      setReturnStart(initialValues.returnStart.substring(0, 5));
      setReturnEnd(initialValues.returnEnd.substring(0, 5));
    }
  }, [visible, initialValues]);

  // Generate the time slots (e.g., "00:00", "00:30", ...)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  });

  const handleConfirm = () => {
    // Pass the selected times back to the parent component in the correct format
    onConfirm({
      pickupStart: `${pickupStart}:00`,
      pickupEnd: `${pickupEnd}:00`,
      returnStart: `${returnStart}:00`,
      returnEnd: `${returnEnd}:00`,
    });
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/50" onPress={onClose} activeOpacity={1} />
      <SafeAreaView className="bg-white rounded-t-2xl shadow-lg">
        <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
          <Text className="text-xl font-RobotoBold text-gray-900">Set Pickup & Return Times</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View className="p-4">
          <Text className="text-lg font-RobotoBold text-center mb-4 text-gray-800">Pickup Times</Text>
          <View className="flex-row justify-around mb-6">
            <TimePickerWheel title="Start" data={timeSlots} selectedValue={pickupStart} onValueChange={setPickupStart} />
            <TimePickerWheel title="End" data={timeSlots} selectedValue={pickupEnd} onValueChange={setPickupEnd} />
          </View>
          
          <Text className="text-lg font-RobotoBold text-center mb-4 text-gray-800">Return Times</Text>
          <View className="flex-row justify-around mb-6">
            <TimePickerWheel title="Start" data={timeSlots} selectedValue={returnStart} onValueChange={setReturnStart} />
            <TimePickerWheel title="End" data={timeSlots} selectedValue={returnEnd} onValueChange={setReturnEnd} />
          </View>
        </View>

        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={handleConfirm}
            className="bg-blue-600 py-4 rounded-xl shadow-md active:bg-blue-700"
          >
            <Text className="text-white text-center font-RobotoBold text-lg">Confirm Times</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
