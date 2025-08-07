import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const BASE_URL = 'https://vehicle.kietpep1303.com/api';
// const BASE_URL = 'http://ray9208.org:3000/api';


// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // Set a timeout for requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to include accessToken
apiClient.interceptors.request.use(
  async (config) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.error('No refresh token found in AsyncStorage');
          throw new Error('No refresh token available');
        }
        const response = await axios.post(`${BASE_URL}/auth/renew-access-token`, { refreshToken });
        if (response.data.status === 200) {
          const accessToken = response.data.accessToken;
          console.log('Token renewed successfully');
          await AsyncStorage.setItem('accessToken', accessToken);
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else {
          console.error('Failed to renew access token:', response.data);
          throw new Error('Failed to renew access token');
        }
      } catch (refreshError:any) {
        console.error('Token refresh failed:', refreshError.message, refreshError.response?.data);

        return Promise.reject(new Error('Session expired. Please sign in again.'));
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },

  register: (userData: any) =>
    apiClient.post('/auth/register', userData),

  resetPassword: (email: string, otp: number, newPassword: string) =>
    apiClient.post('/auth/forgot-password', { email, otp, newPassword }),

  requestOTP: (email: string) =>
    apiClient.post('/otp/request-otp', { email }),

  resendOTP: (email: string) =>
    apiClient.post('/otp/resend-otp', { email }),

  updateToLevel1: (email: string, otp: number) =>
    apiClient.post('/user/update-to-level1', { email, otp }),

  updateToLevel2: (userData: any) =>
    apiClient.post('/auth/update-user-to-level2', userData),

  requestUpdateToLevel2: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    idCardNumber: string;
    driverLicense: string;
    idCardFront: string;
    idCardBack: string;
    driverLicenseFront: string;
    driverLicenseBack: string;
  }) => {
    const formData = new FormData();
    formData.append('firstName', data.firstName);
    if (data.middleName) formData.append('middleName', data.middleName);
    formData.append('lastName', data.lastName);
    formData.append('idCardNumber', data.idCardNumber);
    formData.append('driverLicense', data.driverLicense);
    formData.append('idCardFront', {
      uri: data.idCardFront,
      name: 'idCardFront.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('idCardBack', {
      uri: data.idCardBack,
      name: 'idCardBack.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('driverLicenseFront', {
      uri: data.driverLicenseFront,
      name: 'driverLicenseFront.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('driverLicenseBack', {
      uri: data.driverLicenseBack,
      name: 'driverLicenseBack.jpg',
      type: 'image/jpeg',
    } as any);
    return apiClient.post('/user/request-update-to-level2', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getUser: () =>
    apiClient.get('/user/get-user-info'),

  getRefreshTokens: () => 
    apiClient.get('/auth/refresh-tokens'),

  logout: (deviceId: string) => 
    apiClient.delete('/auth/logout', { data: { deviceId } }),

  getUserPublicInfo: (userId: number) =>
    apiClient.get(`/user/get-user-public-info?userId=${userId}`),

  updateUser: (data: { nickname?: string; avatar?: string; phoneNumber?: string }) => {
  const formData = new FormData();
  if (data.nickname) {
    formData.append('nickname', data.nickname);
  }
  if (data.avatar) {
    formData.append('avatar', {
      uri: data.avatar,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as any);
  }
  if (data.phoneNumber) {
    formData.append('phoneNumber', data.phoneNumber);
  }
  return apiClient.put('/user/update-user-info', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
},
};

// Vehicle API
export const vehicleAPI = {
  uploadNewVehicle: (vehicleData: any) =>
    apiClient.post('/vehicle/request-upload-new-vehicle', vehicleData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  getRecentApprovedVehicles: ({ page = 1, limit = 10 } = {}) =>
    apiClient.get(`/vehicle/public/get-recent-approved-vehicles?page=${page}&limit=${limit}`),

  getRandomApprovedVehicles: ({ page = 1, limit = 10 } = {}) =>
    apiClient.get(`/vehicle/public/get-random-approved-vehicles?page=${page}&limit=${limit}`),

  getMostViewedVehicles: ({ page = 1, limit = 10 } = {}) =>
    apiClient.get(`/vehicle/public/get-most-views-vehicles?page=${page}&limit=${limit}`),

  getMostViewedVehicles30Days: ({ page = 1, limit = 10 } = {}) =>
    apiClient.get(`/vehicle/public/get-most-views-vehicles-30days?page=${page}&limit=${limit}`),

  getVehicleById: (vehicleId: number) =>
    apiClient.get(`/vehicle/public/get-vehicle-by-id?vehicleId=${vehicleId}`),

  getUserVehicleId: (vehicleId: number) =>
    apiClient.get(`/vehicle/private/get-user-vehicle-id?vehicleId=${vehicleId}`),

  updateVehicle: ( vehicleData: any) =>
    apiClient.put(`/vehicle/update-vehicle-info`, vehicleData),

  getFilteredVehicles: ({
    page = 1,
    limit = 10,
    title,
    vehicleType,
    brand,
    model,
    year,
    color,
    city,
    district,
  }: {
    page?: number;
    limit?: number;
    title?: string;
    vehicleType?: string;
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
    city?: string;
    district?: string;
  } = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (title) queryParams.append('title', title);
    if (vehicleType) queryParams.append('vehicleType', vehicleType);
    if (brand) queryParams.append('brand', brand);
    if (model) queryParams.append('model', model);
    if (year) queryParams.append('year', year.toString());
    if (color) queryParams.append('color', color);
    if (city) queryParams.append('city', city);
    if (district) queryParams.append('district', district);
    return apiClient.get(`/vehicle/public/get-filter-vehicles?${queryParams.toString()}`);
  },

  getUserVehicles: (page: number = 1, limit: number = 10) =>
    apiClient.get(`/vehicle/private/get-user-vehicles?page=${page}&limit=${limit}`),

  getVehicleRentals: (vehicleId: number) =>
    apiClient.get(`/vehicle/private/get-vehicle-rentals?vehicleId=${vehicleId}`),

  getVehicleConstants: () =>
    apiClient.get('/vehicle/constants'),

  getModelByBrand: (vehicleType: string, brand: string) =>
    apiClient.get(`/vehicle/constants/${vehicleType}/${encodeURIComponent(brand)}`),

  getProvinces: () => 
  apiClient.get('/vehicle/constants/province'),

  getDistricts: (provinceCode: string) =>
    apiClient.get(`/vehicle/constants/district?provinceCode=${provinceCode}`),

  getWards: (districtCode: string) =>
    apiClient.get(`/vehicle/constants/ward?districtCode=${districtCode}`),

  hideVehicle: (vehicleId: number) =>
    apiClient.put(`/vehicle/private/hide-vehicle-id?vehicleId=${vehicleId}`),

  unhideVehicle: (vehicleId: number) =>
    apiClient.put(`/vehicle/private/unhide-vehicle-id?vehicleId=${vehicleId}`),

  deleteVehicle: (id: string) =>
    apiClient.delete(`/vehicle/private/delete-vehicle-id?vehicleId=${id}`),

  getAverageRating: (vehicleId: number) =>
    apiClient.get(`/vehicle/public/get-average-rating?vehicleId=${vehicleId}`),

  getVehicleRatings: ({
    vehicleId,
    rating,
    page = 1,
    limit = 10,
  }: {
    vehicleId: number;
    rating?: number;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams({
      vehicleId: vehicleId.toString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    if (rating) queryParams.append('rating', rating.toString());
    return apiClient.get(`/vehicle/public/get-vehicle-ratings?${queryParams.toString()}`);
  },

  createRating: ({
    vehicleId,
    rating,
    comment,
  }: {
    vehicleId: number;
    rating: number;
    comment?: string;
  }) => {
    const body: { vehicleId: number; rating: number; comment?: string } = { vehicleId, rating };
    if (comment) body.comment = comment;
    return apiClient.post('/vehicle/private/create-rating', body);
  },

  editRating: ({
    vehicleId,
    rating,
    comment,
  }: {
    vehicleId: number;
    rating: number;
    comment?: string;
  }) => {
    const body: { vehicleId: number; rating: number; comment?: string } = { vehicleId, rating };
    if (comment) body.comment = comment;
    return apiClient.put('/vehicle/private/edit-rating', body);
  },

  createFavoriteVehicle: (vehicleId: number) =>
    apiClient.post('/vehicle/favorite-vehicle', { vehicleId }),

  deleteFavoriteVehicle: (vehicleId: number) =>
    apiClient.delete('/vehicle/favorite-vehicle', { data: { vehicleId } }),

  getFavoriteVehicles: (page: number = 1, limit: number = 10) =>
    apiClient.get(`/vehicle/favorite-vehicle?page=${page}&limit=${limit}`),
};

// Rental API
export const rentalAPI = {
  getRentalStatusConstants: () =>
    apiClient.get('/rental/constants/rental-status'),

  checkVehicleAvailability: ({
    vehicleId,
    month,
    year,
  }: {
    vehicleId: number;
    month?: number;
    year?: number;
  }) => {
    const queryParams = new URLSearchParams({ vehicleId: vehicleId.toString() });
    if (month) queryParams.append('month', month.toString());
    if (year) queryParams.append('year', year.toString());
    return apiClient.get(`/rental/check-availability?${queryParams.toString()}`);
  },

  createRentalConfirmation: ({
    vehicleId,
    startDateTime,
    endDateTime,
  }: {
    vehicleId: number;
    startDateTime: string;
    endDateTime: string;
  }) => apiClient.post('/rental/create-rental-confirmation', { vehicleId, startDateTime, endDateTime }),

  createNewRental: ({
    vehicleId,
    renterPhoneNumber,
    startDateTime,
    endDateTime,
  }: {
    vehicleId: number;
    renterPhoneNumber: string;
    startDateTime: string;
    endDateTime: string;
  }) => apiClient.post('/rental/create-new-rental', { vehicleId, renterPhoneNumber, startDateTime, endDateTime }),

  payDeposit: (rentalId: number) =>
    apiClient.post('/payment/deposit-payment', { rentalId }),

  getAllRentals: (page: number = 1, limit: number = 10) =>
    apiClient.get(`/rental/renter/all?page=${page}&limit=${limit}`),

  getAllRentalsOfVehicle: (vehicleId: string, page: number = 1, limit: number = 10) =>
    apiClient.get(`/rental/vehicle/all?vehicleId=${vehicleId}&page=${page}&limit=${limit}`),

  getRentalRecord: (rentalId: number) =>
    apiClient.get(`/rental/record?rentalId=${rentalId}`),

  getRentalsById: (vehicleId: string) =>
    apiClient.get(`/rental/get-rental/${vehicleId}`),

  updateRental: (vehicleId: string, rentalData: any) =>
    apiClient.put(`/rental/update-rental/${vehicleId}`, rentalData),

  getOwnerPendingRentals: (page: number = 1, limit: number = 10) =>
    apiClient.get(`/rental/vehicle-owner/status?status=OWNER PENDING&page=${page}&limit=${limit}`),

  ownerRentalDecision: (rentalId: number, status: boolean) =>
    apiClient.post('/rental/owner-rental-decision', { rentalId, status }),

  prepareContract: (rentalId: number) =>
    apiClient.get(`/rental/prepare-contract?rentalId=${rentalId}`),

  getAllContractsFromRentalId: (rentalId: number) =>
    apiClient.get(`/rental/get-all-contracts-from-rental-id?rentalId=${rentalId}`),

  getContractById: (contractId: string) =>
    apiClient.get(`/rental/get-contract-by-id?contractId=${contractId}`),

  createContract: (contractData: any, rentalId: number) =>
    apiClient.post(`/rental/create-contract?rentalId=${rentalId}`, contractData),

  renterSignContract: (contractId: string, decision: boolean, password: string) =>
    apiClient.post('/rental/renter-sign-contract', { contractId, decision, password }),

  ownerSignContract: (contractId: string, decision: boolean, password: string) =>
    apiClient.post('/rental/vehicle-owner-sign-contract', { contractId, decision, password }),

  confirmRenterReceivedVehicle: (rentalId: number) =>
    apiClient.post('/rental/confirm-renter-received-vehicle', { rentalId }),

  confirmRenterReturnedVehicle: (rentalId: number) =>
    apiClient.post('/rental/confirm-renter-returned-vehicle', { rentalId }),

  deleteRental: (vehicleId: string) =>
    apiClient.delete(`/rental/delete-rental/${vehicleId}`),

  remainingPayment: (rentalId: number) =>
    apiClient.post('/payment/remaining-payment-payment', { rentalId }),
};

export const chatAPI = {
  createChatSession: (userId: number[]) =>
    apiClient.post('/chat/create-chat-session', { userId }),

  createChatSessionAI: () =>
    apiClient.post('/chat/create-chat-session-ai'),

  getAllMessages: () =>
    apiClient.get('/chat/get-all-messages'),

  getMessagesInSession: (sessionId: number) =>
    apiClient.get(`/chat/get-messages-in-session?sessionId=${sessionId}`),

  sendMessage: async (data: { sessionId: number; type: 'text' | 'image'; content?: string; image?: any }) => {
    if (data.type === 'image') {
      const formData = new FormData();
      formData.append('sessionId', data.sessionId.toString());
      formData.append('type', data.type);
      formData.append('image', data.image);
      return apiClient.post('/chat/send-message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      return apiClient.post('/chat/send-message', {
        sessionId: data.sessionId,
        type: data.type,
        content: data.content,
      });
    }
  },
  
  sendMessageAI: (data: { sessionId: number; content: string }) =>{
    return apiClient.post('/chat/send-message-ai', {
      sessionId: data.sessionId,
      type: 'text',
      content: data.content,
    });
  }
  
};
// Notification API
export const notificationAPI = {
  setAsRead: (id: number) => apiClient.post('/notification/set-as-read', { id }),
};

export default {
  auth: authAPI,
  vehicle: vehicleAPI,
  rental: rentalAPI,
  chat: chatAPI,
  notification: notificationAPI,
};