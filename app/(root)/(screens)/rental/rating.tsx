import React, { useState, useEffect } from 'react';
import { Text, View, Image, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '@/components/ToastAlert';
import { rentalAPI, vehicleAPI, authAPI } from '@/services/api';
import { images } from '@/constants';

// Define interfaces for data structures
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

interface Rating {
  vehicleId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

const RateRentalScreen = () => {
  // Get rentalId from URL parameters
  const { rentalId } = useLocalSearchParams();

  // State variables for loading, errors, rental data, rating, and comments
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rental, setRental] = useState<RentalDetails | null>(null);
  const [renterInfo, setRenterInfo] = useState<{ nickname: string; avatar: string | null } | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(0); // 0 means no rating selected
  const [comment, setComment] = useState<string>('');
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // Function to fetch all necessary data for the rating screen
    const fetchRatingDetails = async () => {
      if (!rentalId) {
        setError('Rental ID is missing');
        setLoading(false);
        return;
      }

      try {
        // Fetch rental details using the rentalId
        const rentalResponse = await rentalAPI.getRentalRecord(parseInt(rentalId as string));
        if (rentalResponse.data.status === 200) {
          const rentalData = rentalResponse.data.data;
          setRental(rentalData);

          // Fetch current user's ID
          const userResponse = await authAPI.getUser();
          if (userResponse.data.status === 200) {
            const currentUserId = userResponse.data.data.id;
            setUserId(currentUserId);

            // Fetch renter's public information
            const renterResponse = await authAPI.getUserPublicInfo(rentalData.renterId);
            if (renterResponse.data.status === 200) {
              setRenterInfo({
                nickname: renterResponse.data.data.nickname,
                avatar: renterResponse.data.data.avatar,
              });
            } else {
              setRenterInfo({ nickname: 'Unknown', avatar: null });
            }

            // Fetch vehicle details for the image and title
            const vehicleResponse = await vehicleAPI.getVehicleById(rentalData.vehicleId);
            if (vehicleResponse.data.status === 200) {
              setRental((prev) => ({
                ...(prev as RentalDetails),
                vehicle: { imageFront: vehicleResponse.data.data.imageFront, title: vehicleResponse.data.data.title },
              }));
            }

            // Check for existing rating by the current user for this vehicle
            if (rentalData.status === 'COMPLETED' && currentUserId === rentalData.renterId) {
              const ratingsResponse = await vehicleAPI.getVehicleRatings({ vehicleId: rentalData.vehicleId, page: 1, limit: 10 }); // Fetch more to find specific user's rating
              if (ratingsResponse.data.status === 200) {
                const userRating = ratingsResponse.data.data.ratings.find((r: Rating) => r.userId === currentUserId);
                if (userRating) {
                  setExistingRating(userRating);
                  setRatingValue(userRating.rating);
                  setComment(userRating.comment || '');
                }
              }
            }
          }
          setError(null);
        } else {
          throw new Error('Failed to fetch rental details');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load rating details');
        showToast('error', err.message || 'Could not load rating details');
      } finally {
        setLoading(false);
      }
    };

    fetchRatingDetails();
  }, [rentalId]); // Re-run effect if rentalId changes

  // Function to handle rating submission
  const handleRatingSubmit = async () => {
    if (!rental || !userId) {
      showToast('error', 'Rental details or user ID missing.');
      return;
    }
    if (ratingValue === 0) {
      showToast('error', 'Please select a star rating.');
      return;
    }

    try {
      const ratingData = {
        vehicleId: rental.vehicleId,
        rating: ratingValue,
        comment: comment.trim() || undefined, // Send comment only if not empty
      };

      let response;
      if (existingRating) {
        // If an existing rating is found, update it
        response = await vehicleAPI.editRating(ratingData);
      } else {
        // Otherwise, create a new rating
        response = await vehicleAPI.createRating(ratingData);
      }

      if (response.data.status === 200) {
        showToast('success', existingRating ? 'Rating updated successfully!' : 'Rating submitted successfully!');
        // Optionally navigate back or update UI
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to submit rating');
      }
    } catch (err: any) {
      // Handle specific error codes for better user feedback
      const errorCode = err.response?.data?.errorCode;
      let errorMessage = err.response?.data?.message || 'Failed to submit rating';
      switch (errorCode) {
        case 2015:
          errorMessage = 'Rating must be between 1 and 5.';
          break;
        case 2011:
          errorMessage = 'You have already rated this vehicle.';
          break;
        case 4003:
          errorMessage = 'You must complete the rental before rating.';
          break;
        case 2014:
          errorMessage = 'You have not rated this vehicle.';
          break;
        case 2109:
          errorMessage = 'Failed to process rating.';
          break;
      }
      showToast('error', errorMessage);
    }
  };

  // Display loading indicator while data is being fetched
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  // Display error message if data fetching fails
  if (error || !rental || !rental.vehicle) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error || 'No rental or vehicle data found for rating.'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2 rounded-md bg-blue-500">
          <Text className="text-white font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Format the completion date
  const completedDate = rental.statusWorkflowHistory.find(h => h.status === 'COMPLETED')?.date;
  const formattedCompletedDate = completedDate ? new Date(completedDate).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header section */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-RobotoBold ml-3">Rate Your Experience</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Vehicle/Renter Info Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
          <View className="flex-row items-center mb-3">
            <Image
              source={rental.vehicle.imageFront ? { uri: rental.vehicle.imageFront } : images.carPlaceholder} // Use vehicle image
              className="w-16 h-16 rounded-full mr-4 border border-gray-200"
              resizeMode="cover"
            />
            <View className="flex-1">
              <Text className="text-lg font-RobotoBold text-gray-800">{rental.vehicle.title}</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                <Text className="text-sm font-RobotoMedium text-gray-600 ml-1">Completed</Text>
              </View>
              <Text className="text-xs font-RobotoRegular text-gray-500 mt-0.5">
                Completed at: {formattedCompletedDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Rate Your Experience Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
          <Text className="text-lg font-RobotoBold text-gray-800 mb-4">Rate your experience</Text>
          <View className="flex-row justify-center mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRatingValue(star)}
                className="p-1"
              >
                <Ionicons
                  name={star <= ratingValue ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= ratingValue ? '#FFD700' : '#D1D5DB'} // Yellow for filled, gray for outline
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Additional Comments Section */}
          <Text className="text-base font-RobotoMedium text-gray-800 mb-2">Additional Comments (optional)</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-base font-RobotoRegular text-gray-700 h-28"
            value={comment}
            onChangeText={setComment}
            placeholder="Tell us more about your experience..."
            multiline
            textAlignVertical="top" // Ensures placeholder text starts at the top
          />
        </View>

        {/* Submit Review Button */}
        <TouchableOpacity
          onPress={handleRatingSubmit}
          className="bg-[#2563EB] py-4 rounded-xl shadow-md active:bg-[#1D4ED8]"
        >
          <Text className="text-white text-lg font-RobotoBold text-center">
            {existingRating ? 'Update Review' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RateRentalScreen;
