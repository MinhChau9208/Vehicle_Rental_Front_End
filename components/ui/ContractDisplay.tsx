import React from 'react';
import { View, Text } from 'react-native';
import { ContractDetailsData } from '@/types/contractData';

/**
 * A reusable component to display a read-only, formatted contract document.
 * @param {object} props - The component props.
 * @param {ContractDetailsData} props.contract - The full contract details object to display.
 */
const ContractDisplay = ({ contract }: { contract: ContractDetailsData }) => {
    const { contractData, renterStatus, ownerStatus } = contract;

    return (
        <View className="bg-white p-5 m-4 shadow-md rounded-lg border border-gray-200">
            {/* Header */}
            <Text className="text-center font-RobotoBold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
            <Text className="text-center font-RobotoBold">Độc lập - Tự do - Hạnh phúc</Text>
            <Text className="text-center mt-1">---o0o---</Text>
            
            <Text className="text-center text-xl font-RobotoBold mt-8 mb-4">HỢP ĐỒNG THUÊ XE</Text>
            
            {/* Legal Basis */}
            <Text className="italic mb-1 text-sm">- Căn cứ Bộ Luật Dân sự 2015;</Text>
            <Text className="italic mb-1 text-sm">- Căn cứ Luật thương mại 2005;</Text>
            <Text className="italic mb-4 text-sm">- Căn cứ vào nhu cầu và sự thỏa thuận của hai bên.</Text>

            {/* Date and Place */}
            <Text className="text-right mb-4 italic">
                {`Hôm nay, ngày ${contractData.contractDate.day} tháng ${contractData.contractDate.month} năm ${contractData.contractDate.year}, tại ${contractData.contractAddress.address}, phường ${contractData.contractAddress.ward}, quận ${contractData.contractAddress.district}, ${contractData.contractAddress.city}, chúng tôi gồm:`}
            </Text>

            {/* Parties */}
            <Text className="font-RobotoBold mt-2">BÊN CHO THUÊ (BÊN A):</Text>
            <Text className="mt-1">Ông/Bà: {contractData.vehicleOwnerInformation.name}</Text>
            <Text className="mt-1">Số CCCD: {contractData.vehicleOwnerInformation.idCardNumber}</Text>
            <Text className="mt-1">Điện thoại: {contractData.vehicleOwnerInformation.phoneNumber}</Text>

            <Text className="font-RobotoBold mt-4">BÊN THUÊ (BÊN B):</Text>
            <Text className="mt-1">Ông/Bà: {contractData.renterInformation.name}</Text>
            <Text className="mt-1">Số CCCD: {contractData.renterInformation.idCardNumber}</Text>
            <Text className="mt-1">GPLX số: {contractData.renterInformation.driverLicenseNumber}</Text>
            <Text className="mt-1">Điện thoại: {contractData.renterInformation.phoneNumber}</Text>

            <Text className="mt-4">Sau khi bàn bạc, hai bên thống nhất ký kết hợp đồng thuê xe với các điều khoản sau:</Text>

            {/* Article 1: Vehicle */}
            <Text className="font-RobotoBold mt-4">ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</Text>
            <Text className="mt-1">Đối tượng của hợp đồng là chiếc xe với các đặc điểm sau:</Text>
            <Text className="ml-2">- Loại xe: {contractData.vehicleInformation.brand} {contractData.vehicleInformation.model}</Text>
            <Text className="ml-2">- Màu sơn: {contractData.vehicleInformation.color}</Text>
            <Text className="ml-2">- Năm sản xuất: {contractData.vehicleInformation.year}</Text>
            <Text className="ml-2">- Biển số đăng ký: {contractData.vehicleInformation.vehicleRegistrationId}</Text>

            {/* Article 2: Rental Term and Price */}
            <Text className="font-RobotoBold mt-4">ĐIỀU 2: THỜI HẠN, GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</Text>
            <Text className="mt-1 ml-2">2.1. Thời hạn thuê: {contractData.rentalInformation.totalDays} ngày, từ {new Date(contractData.rentalInformation.startDateTime).toLocaleString('vi-VN')} đến {new Date(contractData.rentalInformation.endDateTime).toLocaleString('vi-VN')}.</Text>
            <Text className="mt-1 ml-2">2.2. Giá thuê: {contractData.rentalInformation.totalPrice.toLocaleString('vi-VN')} VNĐ.</Text>
            <Text className="mt-1 ml-2">2.3. Tiền đặt cọc: {contractData.rentalInformation.depositPrice.toLocaleString('vi-VN')} VNĐ.</Text>
            <Text className="mt-1 ml-2">2.4. Phương thức thanh toán: Bên B thanh toán tiền cọc cho Bên A ngay sau khi ký hợp đồng và thanh toán phần còn lại khi nhận xe.</Text>

            {/* Article 3: Rights and Obligations */}
            <Text className="font-RobotoBold mt-4">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN</Text>
            <Text className="font-RobotoMedium mt-2">3.1. Quyền và nghĩa vụ của Bên A:</Text>
            <Text className="ml-2">- Giao xe và toàn bộ giấy tờ liên quan cho Bên B đúng thời gian và địa điểm.</Text>
            <Text className="ml-2">- Yêu cầu Bên B thanh toán đầy đủ tiền thuê xe.</Text>
            <Text className="ml-2">- Chịu trách nhiệm pháp lý về nguồn gốc và quyền sở hữu của xe.</Text>
            <Text className="font-RobotoMedium mt-2">3.2. Quyền và nghĩa vụ của Bên B:</Text>
            <Text className="ml-2">- Sử dụng xe đúng mục đích, không sử dụng vào việc phạm pháp.</Text>
            <Text className="ml-2">- Không được tự ý sửa chữa, thay đổi kết cấu xe.</Text>
            <Text className="ml-2">- Chịu trách nhiệm cho mọi hư hỏng, mất mát trong quá trình sử dụng.</Text>
            <Text className="ml-2">- Trả xe đúng hạn. Nếu quá hạn, phải chịu thêm phí phát sinh theo thỏa thuận.</Text>

            {/* Article 4: Vehicle Condition */}
            <Text className="font-RobotoBold mt-4">ĐIỀU 4: TÌNH TRẠNG XE KHI GIAO NHẬN</Text>
            <Text className="mt-1 ml-2">- Tình trạng bên ngoài: {contractData.vehicleCondition.outerVehicleCondition}</Text>
            <Text className="mt-1 ml-2">- Tình trạng bên trong: {contractData.vehicleCondition.innerVehicleCondition}</Text>
            <Text className="mt-1 ml-2">- Tình trạng lốp xe: {contractData.vehicleCondition.tiresCondition}</Text>
            <Text className="mt-1 ml-2">- Tình trạng động cơ: {contractData.vehicleCondition.engineCondition}</Text>
            <Text className="mt-1 ml-2">- Ghi chú thêm: {contractData.vehicleCondition.note || 'Không có'}</Text>

            {/* Article 5: General Clauses */}
            <Text className="font-RobotoBold mt-4">ĐIỀU 5: ĐIỀU KHOẢN CHUNG</Text>
            <Text className="mt-1 ml-2">- Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận.</Text>
            <Text className="mt-1 ml-2">- Mọi tranh chấp sẽ được giải quyết thông qua thương lượng. Nếu không thể giải quyết, sẽ đưa ra Tòa án có thẩm quyền.</Text>
            <Text className="mt-1 ml-2">- Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.</Text>

            {/* Signatures */}
            <View className="flex-row justify-around mt-10 mb-4">
                <View className="items-center w-1/2">
                    <Text className="font-RobotoBold">BÊN CHO THUÊ</Text>
                    <Text className="italic text-xs">(Ký, ghi rõ họ tên)</Text>
                    {ownerStatus === 'SIGNED' && (
                        <View className="mt-10 items-center">
                            <Text className="font-RobotoMedium text-green-600">Đã ký điện tử bởi</Text>
                            <Text className="font-RobotoBold text-green-600">{contractData.vehicleOwnerInformation.name}</Text>
                        </View>
                    )}
                </View>
                <View className="items-center w-1/2">
                    <Text className="font-RobotoBold">BÊN THUÊ</Text>
                    <Text className="italic text-xs">(Ký, ghi rõ họ tên)</Text>
                    {renterStatus === 'SIGNED' && (
                         <View className="mt-10 items-center">
                            <Text className="font-RobotoMedium text-green-600">Đã ký điện tử bởi</Text>
                            <Text className="font-RobotoBold text-green-600">{contractData.renterInformation.name}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default ContractDisplay;
