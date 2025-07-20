import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { PaperProvider } from "react-native-paper";
import { AppProvider } from "@/components/AppContext";
import { NavigationContainer } from "@react-navigation/native";

const Page = () => {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        setRedirectTo("/(auth)/sign-in");
      } else {
        setRedirectTo("/(root)/(tabs)/home");
      }
    };
    checkToken();
  }, []);

  if (redirectTo) {
    return (
      <AppProvider>
        <NavigationContainer>
          <PaperProvider>
            <Redirect href={redirectTo} />
          </PaperProvider>
        </NavigationContainer>
      </AppProvider>
    );
  }
  return null;
};

export default Page;