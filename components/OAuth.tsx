import { View, Text, Image } from "react-native"
import CustomButton from "./CustomButton";

import { icons } from "@/constants"

const OAuth = () => {
  const handleGoogleSignIn = async () => { };
  
  return (
    <View>

      <CustomButton
        title="Log In with Google"
        className="mt-5 w-full shadow-none"
        IconLeft={() => (
          <Image source={icons.google} resizeMode="contain" className="w-5 h-5 mx-2" />
        )}
        bgVariant="outline"
        textVariant="primary"
        onPress={handleGoogleSignIn}
      />
    </View>
  )
};

export default OAuth;