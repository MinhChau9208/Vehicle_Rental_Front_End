import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { showToast } from './ToastAlert';

interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder: string;
  secureTextEntry?: boolean;
}

const Modal = ({ isVisible, onClose, onSubmit, title, placeholder, secureTextEntry = false }: ModalProps) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value) {
      showToast('error', 'Please enter a value');
      return;
    }
    onSubmit(value);
    setValue('');
  };

  return (
    <ReactNativeModal isVisible={isVisible}>
      <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
        <Text className="text-2xl font-RobotoMedium mb-2">{title}</Text>
        <TextInput
          className="border border-gray-300 rounded-md p-2 mt-4"
          placeholder={placeholder}
          value={value}
          onChangeText={setValue}
          secureTextEntry={secureTextEntry}
        />
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-[#2563EB] py-2 px-4 rounded-md mt-4"
        >
          <Text className="text-white font-RobotoMedium text-center">Submit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} className="absolute top-4 left-4">
          <Text className="text-[#2563EB] font-RobotoMedium">Close</Text>
        </TouchableOpacity>
      </View>
    </ReactNativeModal>
  );
};

export default Modal;