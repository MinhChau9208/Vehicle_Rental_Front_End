export interface UserProfileData {
  email: string;
  firstName: string | null;
  lastName: string | null;
  idCardNumber: string | null;
  driverLicense: string | null;
  status: string;
  phoneNumber: string | null;
}

interface UserPublicInfo {
  nickname: string;
  avatar?: string;
}

export interface SessionData {
  deviceId: string;
  deviceName: string;
  expiresAt: string;
}