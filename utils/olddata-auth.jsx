import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://192.168.100.132:3000/api/auth',
  timeout: 5000, // 5 seconds timeout
  timeoutErrorMessage: 'Request timed out. Please try again.',
  headers: {
    'Content-Type': 'application/json',
  },
});

async function authenticate(mode, data) {
  const url = `/${mode}`;

  try {
    const response = await axiosInstance.post(url, data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Backend error:', error.response.data);
      throw new Error(error.response.data.message || 'An error occurred');
    } else {
      console.error('Error:', error.message);
      throw new Error(error.message || 'An unknown error occurred');
    }
  }
}

export function createUser(nickname, email, password ) {
  return authenticate('register', { nickname, email, password });
}

export function login(email, password) {
  return authenticate('login', { email, password });
}

// export function requestOTP(email) {
//   return authenticate('request-otp', { email });
// }

// export function OTPChangePassword(email, otp, newPassword) {
//   return authenticate('change-password-otp', { email, otp, newPassword });
// }