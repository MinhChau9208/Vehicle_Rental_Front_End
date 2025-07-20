import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '@/components/ToastAlert';
import { rentalAPI } from '@/services/api';

const ITEM_HEIGHT = 50; // Height for each time slot
const VISIBLE_ITEMS = 3; // Number of items visible in the picker window

// A custom vertical time picker component
const VerticalTimePicker = ({
  availableTimes,
  selectedTime,
  onSelectTime,
  title,
}: {
  availableTimes: string[];
  selectedTime: string;
  onSelectTime: (time: string) => void;
  title: string;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to the initially selected time
  useEffect(() => {
    const index = availableTimes.indexOf(selectedTime);
    if (index > -1 && scrollViewRef.current) {
      // Use a timeout to ensure the scrollview is ready
      setTimeout(() => scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false }), 0);
    }
  }, [availableTimes]);

  const handleMomentumScrollEnd = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < availableTimes.length) {
      onSelectTime(availableTimes[index]);
    }
  };

  // Add padding to the top and bottom to allow the first and last items to be centered
  const paddingHeight = (VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT;

  return (
    <View className="items-center flex-1">
      <Text className="font-RobotoBold text-lg mb-2">{title}</Text>
      <View style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }} className="border-y border-gray-200">
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingTop: paddingHeight, paddingBottom: paddingHeight }}
        >
          {availableTimes.map((time) => (
            <View key={time} style={{ height: ITEM_HEIGHT }} className="justify-center items-center">
              <Text
                className={`text-2xl ${selectedTime === time
                    ? 'font-RobotoBold text-blue-500'
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

const DateTimePickerScreen = () => {
  const {
    vehicleId,
    timePickupStart = '00:00',
    timePickupEnd = '23:59',
    timeReturnStart = '00:00',
    timeReturnEnd = '23:59',
  } = useLocalSearchParams();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState('09:00');
  const [returnTime, setReturnTime] = useState('09:00');
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);

  // Temporary state for the modal to not affect the main state until confirmed
  const [tempPickupTime, setTempPickupTime] = useState(pickupTime);
  const [tempReturnTime, setTempReturnTime] = useState(returnTime);

  const generateTimes = (start: string, end: string) => {
    const times = [];
    let [h, m] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(h, m, 0, 0);
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);
    while (startTime <= endTime) {
      times.push(
        `${String(startTime.getHours()).padStart(2, '0')}:${String(
          startTime.getMinutes()
        ).padStart(2, '0')}`
      );
      startTime.setMinutes(startTime.getMinutes() + 30);
    }
    return times;
  };

  const pickupTimes = useMemo(() => generateTimes(timePickupStart as string, timePickupEnd as string), [timePickupStart, timePickupEnd]);
  const returnTimes = useMemo(() => generateTimes(timeReturnStart as string, timeReturnEnd as string), [timeReturnStart, timeReturnEnd]);

  useEffect(() => {
    if (pickupTimes.length > 0) {
      setPickupTime(pickupTimes[0]);
      setTempPickupTime(pickupTimes[0]);
    }
    if (returnTimes.length > 0) {
      setReturnTime(returnTimes[0]);
      setTempReturnTime(returnTimes[0]);
    }
  }, [pickupTimes, returnTimes]);

  useEffect(() => {
    const fetchBookedDates = async () => {
      if (!vehicleId) return;
      setLoading(true);
      try {
        const promises = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() + i);
          promises.push(
            rentalAPI.checkVehicleAvailability({
              vehicleId: Number(vehicleId),
              month: date.getMonth() + 1,
              year: date.getFullYear(),
            })
          );
        }
        const results = await Promise.all(promises);
        const dates = new Set<string>();
        results.forEach((response) => {
          if (response.status === 200 && Array.isArray(response.data?.data)) {
            response.data.data.forEach((booking: any) => {
              const start = new Date(booking.startDateTime);
              const end = new Date(booking.endDateTime);
              let current = new Date(start.setUTCHours(0, 0, 0, 0));
              while (current <= end) {
                dates.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
              }
            });
          }
        });
        setBookedDates(dates);
      } catch (error) {
        console.error('Failed to fetch booked dates:', error);
        showToast('error', 'Could not load vehicle availability.');
      } finally {
        setLoading(false);
      }
    };
    fetchBookedDates();
  }, [vehicleId]);

  const handleDayPress = (day: Date) => {
    if (isDateDisabled(day)) {
      showToast('error', 'This date is unavailable.');
      return;
    }
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (day < startDate) {
      setStartDate(day);
    } else {
      let current = new Date(startDate);
      current.setDate(current.getDate() + 1);
      while (current < day) {
        if (isDateDisabled(current)) {
          showToast('error', 'The selected range includes unavailable dates.');
          setStartDate(day);
          setEndDate(null);
          return;
        }
        current.setDate(current.getDate() + 1);
      }
      setEndDate(day);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return bookedDates.has(date.toISOString().split('T')[0]);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} className="w-[14.28%] h-12" />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const disabled = isDateDisabled(dayDate);
      const isStart = startDate && dayDate.toDateString() === startDate.toDateString();
      const isEnd = endDate && dayDate.toDateString() === endDate.toDateString();
      const inRange = startDate && endDate && dayDate > startDate && dayDate < endDate;
      days.push(
        <TouchableOpacity
          key={i}
          disabled={disabled}
          onPress={() => handleDayPress(dayDate)}
          className={`w-[14.28%] h-12 items-center justify-center 
            ${isStart || isEnd ? 'bg-blue-500 rounded-full' : ''} 
            ${inRange ? 'bg-blue-100' : ''}
            ${disabled ? 'opacity-30' : ''}`}
        >
          <Text
            className={`font-RobotoMedium ${isStart || isEnd ? 'text-white' : 'text-black'} ${disabled ? 'text-gray-400' : ''
              }`}
          >
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View className="bg-white p-4 rounded-lg shadow">
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month - 1, 1))}>
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-RobotoBold">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}>
            <Ionicons name="chevron-forward" size={24} color="black" />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} className="w-[14.28%] text-center font-RobotoBold text-gray-500">
              {day}
            </Text>
          ))}
        </View>
        <View className="flex-row flex-wrap">{days}</View>
      </View>
    );
  };

  const handleConfirm = () => {
    if (!startDate || !endDate) {
      showToast('error', 'Please select a start and end date.');
      return;
    }
    const finalStartDate = new Date(startDate);
    const [startH, startM] = pickupTime.split(':').map(Number);
    finalStartDate.setHours(startH, startM);
    const finalEndDate = new Date(endDate);
    const [endH, endM] = returnTime.split(':').map(Number);
    finalEndDate.setHours(endH, endM);
    if (finalEndDate <= finalStartDate) {
      showToast('error', 'Return date and time must be after pickup date and time.');
      return;
    }
    router.replace({
      pathname: `/vehicle/car-details`,
      params: {
        id: vehicleId,
        startDate: finalStartDate.toISOString(),
        endDate: finalEndDate.toISOString(),
      },
    });
  };

  const handleTimeModalConfirm = () => {
    setPickupTime(tempPickupTime);
    setReturnTime(tempReturnTime);
    setIsTimeModalVisible(false);
  }

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 1 ? 1 : diffDays;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-RobotoBold ml-4">Select Dates & Times</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {loading ? <ActivityIndicator size="large" color="#3B82F6" /> : renderCalendar()}

        <View className="mt-6 bg-white p-4 rounded-lg shadow">
          <TouchableOpacity onPress={() => setIsTimeModalVisible(true)} className="flex-row justify-between items-center">
            <View>
              <Text className="font-RobotoBold text-base text-gray-500">Pickup</Text>
              <Text className="font-RobotoBold text-3xl text-blue-500 mt-1">{pickupTime}</Text>
            </View>
            <Ionicons name="time-outline" size={32} color="#9CA3AF" />
            <View className="items-end">
              <Text className="font-RobotoBold text-base text-gray-500">Return</Text>
              <Text className="font-RobotoBold text-3xl text-blue-500 mt-1">{returnTime}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pickup and Return Times Card */}
        <View className="mt-4 bg-white rounded-xl p-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-3">Operating Hours</Text>
          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={20} color="#2563EB" className="mr-2" />
            <Text className="text-base text-gray-700 font-RobotoMedium">
              Pickup: {timePickupStart} - {timePickupEnd}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={20} color="#2563EB" className="mr-2" />
            <Text className="text-base text-gray-700 font-RobotoMedium">
              Return: {timeReturnStart} - {timeReturnEnd}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="font-RobotoBold text-lg">
              {startDate && endDate ? `${calculateDays()} day(s)` : 'Select dates'}
            </Text>
            {startDate && endDate && (
              <Text className="text-sm text-gray-600">
                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!startDate || !endDate}
            className={`py-3 px-8 rounded-xl shadow-md ${!startDate || !endDate ? 'bg-gray-400' : 'bg-blue-500'
              }`}
          >
            <Text className="text-white text-lg font-RobotoBold">Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isTimeModalVisible}
        onRequestClose={() => setIsTimeModalVisible(false)}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsTimeModalVisible(false)} />
        <View className="bg-white p-4 rounded-t-2xl shadow-lg">
          <View className="flex-row justify-center items-center mb-4">
            <Text className="text-xl font-RobotoBold">Select Time</Text>
          </View>
          <View className="flex-row justify-around mb-4">
            <VerticalTimePicker
              title="Pickup"
              availableTimes={pickupTimes}
              selectedTime={tempPickupTime}
              onSelectTime={setTempPickupTime}
            />
            <VerticalTimePicker
              title="Return"
              availableTimes={returnTimes}
              selectedTime={tempReturnTime}
              onSelectTime={setTempReturnTime}
            />
          </View>
          <TouchableOpacity
            onPress={handleTimeModalConfirm}
            className="bg-blue-500 py-3 rounded-lg mt-4"
          >
            <Text className="text-white text-center font-RobotoBold text-lg">Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DateTimePickerScreen;
