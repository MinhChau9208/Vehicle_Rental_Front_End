import React from 'react';
import { View, Text } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

interface DropdownItem {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  label?: string;
  data: DropdownItem[];
  value: string;
  onChange: (item: DropdownItem) => void;
  placeholder?: string;
  search?: boolean;
  disable?: boolean;
  containerStyle?: string;
  isRequired?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  data,
  value,
  onChange,
  placeholder = 'Select an option',
  search = false,
  disable = false,
  containerStyle = '',
  isRequired = false,
}) => {
  return (
    <View className={`my-2 w-full ${containerStyle}`}>
      {label && (
        <View className="flex-row items-center mb-3">
          <Text className="text-lg font-RobotoSemiBold">{label}</Text>
          {isRequired && <Text className="text-danger-500 text-lg ml-2">*</Text>}
        </View>
      )}
      <Dropdown
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 6,
          padding: 12,
          height: 56,
          backgroundColor: disable ? '#E5E7EB' : '#FFFFFF',
        }}
        placeholderStyle={{
          fontSize: 15,
          color: value ? '#000000' : '#999999',
          fontFamily: 'Roboto-Regular',
          opacity: value ? 1 : 0.5,
        }}
        selectedTextStyle={{
          fontSize: 15,
          color: '#000000',
          fontFamily: 'Roboto-Regular',
        }}
        inputSearchStyle={{
          height: 40,
          fontSize: 15,
          fontFamily: 'Roboto-Regular',
        }}
        data={data}
        search={search}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={placeholder}
        searchPlaceholder="Search..."
        value={value}
        onChange={onChange}
        disable={disable}
      />
    </View>
  );
};

export default CustomDropdown;