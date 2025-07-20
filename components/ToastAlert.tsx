import Toast, { BaseToastProps, ToastConfig } from 'react-native-toast-message';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Define the props for our custom toast, including the new onPress handler
interface CustomToastProps extends BaseToastProps {
  props: {
    onPress?: () => void;
    iconName: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    backgroundColor: string;
  };
}

// The layout is now a TouchableOpacity to make it clickable
const ToastLayout = ({
  text1,
  text2,
  onPress,
  props,
}: CustomToastProps) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    className={`
      flex-row items-center w-[90%] p-4 rounded-xl shadow-lg
      ${props.backgroundColor}
    `}
    style={{
      borderLeftWidth: 5,
      borderLeftColor: props.iconColor,
    }}
  >
    <Ionicons name={props.iconName} size={28} color={props.iconColor} />
    <View className="flex-1 ml-4">
      {text1 && <Text className="text-white font-RobotoBold text-base">{text1}</Text>}
      {text2 && <Text className="text-white font-RobotoRegular text-sm mt-1">{text2}</Text>}
    </View>
  </TouchableOpacity>
);

// Custom toast configurations now pass the onPress prop
const toastConfig: ToastConfig = {
  success: ({ text1, text2, props, onPress }) => (
    <ToastLayout
      text1={text1}
      text2={text2}
      onPress={onPress}
      props={{
        ...props,
        backgroundColor: 'bg-green-600',
        iconName: 'checkmark-circle',
        iconColor: '#FFFFFF',
      }}
    />
  ),
  error: ({ text1, text2, props, onPress }) => (
    <ToastLayout
      text1={text1}
      text2={text2}
      onPress={onPress}
      props={{
        ...props,
        backgroundColor: 'bg-red-600',
        iconName: 'alert-circle',
        iconColor: '#FFFFFF',
      }}
    />
  ),
  info: ({ text1, text2, props, onPress }) => (
    <ToastLayout
      text1={text1}
      text2={text2}
      onPress={onPress}
      props={{
        ...props,
        backgroundColor: 'bg-blue-600',
        iconName: 'information-circle',
        iconColor: '#FFFFFF',
      }}
    />
  ),
};

// The main ToastAlert component to be included in your app's root layout
const ToastAlert = () => {
  return <Toast config={toastConfig} />;
};

// MODIFIED: The function now accepts an optional onPress handler
export const showToast = (
  type: 'success' | 'error' | 'info',
  text1: string,
  text2?: string,
  onPress?: () => void
) => {
  Toast.show({
    type,
    text1,
    text2,
    onPress, // Pass the handler to the toast instance
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 60,
  });
};

export default ToastAlert;
