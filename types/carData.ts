export interface UserData {
  id: string;
  nickname: string; 
  avatar: string;
  level: number;
}

export interface VehicleData {
  isHidden: any;
  id: number;
  userId?: any;
  title: string;
  brand: string;
  model: string;
  year: number;
  vehicleType: 'car' | 'motorcycle';
  description?: string;
  engine: string;
  transmission: string;
  fuelType: string;
  color: string;
  seatingCapacity: number;
  airConditioning: boolean;
  gps: boolean;
  bluetooth: boolean;
  map: boolean;
  dashCamera: boolean;
  cameraBack: boolean;
  collisionSensors: boolean;
  ETC: boolean;
  safetyAirBag: boolean;
  price: number;
  vehicleRegistrationId: string;
  city: string;
  district: string;
  ward: string;
  address: string;
  timePickupStart: string;
  timePickupEnd: string;
  timeReturnStart: string;
  timeReturnEnd: string;
  imageFront: string;
  imageEnd: string;
  imageRearRight: string;
  imageRearLeft: string;
  vehicleRegistrationFront: string;
  vehicleRegistrationBack: string;
  imagePic1?: string;
  imagePic2?: string;
  imagePic3?: string;
  imagePic4?: string;
  imagePic5?: string;
  last30daysViews?: number;
  totalViews?: number;
}

export interface Contract {
  id: string;
  rentalId: number;
  contractStatus: string;
  renterStatus: string;
  ownerStatus: string;
  createdAt: string;
}

export interface PaginationData {
  vehicles: VehicleData[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface VehicleConstants {
  vehicleType: string[];
  carBrand: string[];
  motorcycleBrand: string[];
  color: string[];
}