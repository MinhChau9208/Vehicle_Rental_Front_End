/**
 * This interface defines the structure for the data used when creating a new contract.
 * It is primarily populated by the `prepareContract` API call and includes editable fields 
 * for the vehicle's condition.
 */
export interface ContractData {
  contractDate: { day: number; month: number; year: number };
  renterInformation: { name: string; phoneNumber: string; idCardNumber: string; driverLicenseNumber: string };
  vehicleOwnerInformation: { name: string; phoneNumber: string; idCardNumber: string };
  vehicleInformation: { brand: string; model: string; year: number; color: string; vehicleRegistrationId: string };
  contractAddress: { city: string; district: string; ward: string; address: string };
  rentalInformation: { startDateTime: string; endDateTime: string; totalDays: number; totalPrice: number; depositPrice: number };
  vehicleCondition: { outerVehicleCondition: string; innerVehicleCondition: string; tiresCondition: string; engineCondition: string; note: string };
}

/**
 * This interface defines the structure for a complete, retrieved contract.
 * It is used when fetching a contract by its ID and includes the nested `ContractData` 
 * along with metadata like status and signatures.
 */
export interface ContractDetailsData {
  id: string;
  rentalId: number;
  contractData: ContractData; // Reuses the ContractData interface for the main body
  renterStatus: string;
  ownerStatus: string;
  contractStatus: string;
  createdAt: string;
}
