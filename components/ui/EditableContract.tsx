import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { ContractData } from '@/types/contractData';

/**
 * An editable version of the contract display for the creation screen.
 * It shows a preview of the contract and allows input for vehicle condition.
 * @param {object} props - The component props.
 * @param {ContractData} props.contractData - The contract data object being created.
 * @param {Function} props.handleInputChange - The function to call when an input value changes.
 */
const EditableContractDisplay = ({ contractData, handleInputChange }: { contractData: ContractData, handleInputChange: Function }) => {
    return (
        <View className="bg-white p-5 my-4 border border-gray-200 rounded-lg shadow-sm">
            <Text className="text-center text-xl font-RobotoBold mt-2 mb-4">HỢP ĐỒNG THUÊ XE</Text>
            
            <Text className="italic mb-4 text-sm text-center">- Xem lại thông tin và điền tình trạng xe -</Text>

            {/* Parties Information (read-only from prepared data) */}
            <Text className="font-RobotoBold mt-2">BÊN CHO THUÊ (BÊN A):</Text>
            <Text className="mt-1">Ông/Bà: {contractData.vehicleOwnerInformation.name}</Text>

            <Text className="font-RobotoBold mt-4">BÊN THUÊ (BÊN B):</Text>
            <Text className="mt-1">Ông/Bà: {contractData.renterInformation.name}</Text>

            <Text className="font-RobotoBold mt-4">ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</Text>
            <Text className="mt-1 ml-2">- Loại xe: {contractData.vehicleInformation.brand} {contractData.vehicleInformation.model}</Text>
            <Text className="mt-1 ml-2">- Biển số đăng ký: {contractData.vehicleInformation.vehicleRegistrationId}</Text>

            <Text className="font-RobotoBold mt-4">ĐIỀU 2: THỜI HẠN VÀ GIÁ THUÊ</Text>
            <Text className="mt-1 ml-2">- Thời hạn: {new Date(contractData.rentalInformation.startDateTime).toLocaleString('vi-VN')} đến {new Date(contractData.rentalInformation.endDateTime).toLocaleString('vi-VN')}</Text>
            <Text className="mt-1 ml-2">- Tổng giá: {contractData.rentalInformation.totalPrice.toLocaleString('vi-VN')} VNĐ</Text>

            {/* Article 4: Vehicle Condition (Editable) */}
            <Text className="font-RobotoBold mt-4">ĐIỀU 4: TÌNH TRẠNG XE KHI GIAO NHẬN</Text>
            <View className="mt-2">
                <Text className="font-RobotoMedium text-gray-700">Tình trạng bên ngoài:</Text>
                <TextInput className="border border-gray-300 rounded-md p-2 mt-1 bg-gray-50" placeholder="Mô tả tình trạng bên ngoài xe" value={contractData.vehicleCondition.outerVehicleCondition} onChangeText={(value) => handleInputChange('vehicleCondition', 'outerVehicleCondition', value)} />
            </View>
            <View className="mt-2">
                <Text className="font-RobotoMedium text-gray-700">Tình trạng bên trong:</Text>
                <TextInput className="border border-gray-300 rounded-md p-2 mt-1 bg-gray-50" placeholder="Mô tả tình trạng bên trong xe" value={contractData.vehicleCondition.innerVehicleCondition} onChangeText={(value) => handleInputChange('vehicleCondition', 'innerVehicleCondition', value)} />
            </View>
            <View className="mt-2">
                <Text className="font-RobotoMedium text-gray-700">Tình trạng lốp xe:</Text>
                <TextInput className="border border-gray-300 rounded-md p-2 mt-1 bg-gray-50" placeholder="Mô tả tình trạng lốp xe" value={contractData.vehicleCondition.tiresCondition} onChangeText={(value) => handleInputChange('vehicleCondition', 'tiresCondition', value)} />
            </View>
            <View className="mt-2">
                <Text className="font-RobotoMedium text-gray-700">Tình trạng động cơ:</Text>
                <TextInput className="border border-gray-300 rounded-md p-2 mt-1 bg-gray-50" placeholder="Mô tả tình trạng động cơ" value={contractData.vehicleCondition.engineCondition} onChangeText={(value) => handleInputChange('vehicleCondition', 'engineCondition', value)} />
            </View>
            <View className="mt-2">
                <Text className="font-RobotoMedium text-gray-700">Ghi chú thêm:</Text>
                <TextInput className="border border-gray-300 rounded-md p-2 mt-1 bg-gray-50" placeholder="Ghi chú thêm nếu có" value={contractData.vehicleCondition.note} onChangeText={(value) => handleInputChange('vehicleCondition', 'note', value)} />
            </View>
            
            {/* Signature placeholders */}
            <View className="flex-row justify-around mt-10 mb-4">
                <View className="items-center"><Text className="font-RobotoBold">BÊN CHO THUÊ</Text><Text className="italic text-xs">(Chữ ký điện tử)</Text></View>
                <View className="items-center"><Text className="font-RobotoBold">BÊN THUÊ</Text><Text className="italic text-xs">(Chữ ký điện tử)</Text></View>
            </View>
        </View>
    );
};

export default EditableContractDisplay;
