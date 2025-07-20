import { View, Text, Image } from "react-native"
import CustomButton from "./CustomButton";

import { icons, images } from "@/constants"

const OAuth = () => {
  const handleAppleAuthentication = async () => { };
  
  return (
    <View>
      <CustomButton
        title="Log In with Apple"
        className="mt-5 w-full shadow-none"
        IconLeft={() => (
          <Image source={images.appleLogo} resizeMode="contain" className="w-5 h-5 mx-2" />
        )}
        bgVariant="outline"
        textVariant="primary"
        onPress={handleAppleAuthentication}
      />
    </View>
  )
};

export default OAuth;