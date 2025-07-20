import { Tabs } from 'expo-router';
import { Image, ImageSourcePropType, View, Platform } from 'react-native';
import { icons } from "@/constants";

const TabIcon = ({ source, focused }: { source: ImageSourcePropType; focused: boolean }) => (
  <View className="items-center justify-center py-1">
    <Image
      source={source}
      resizeMode='contain'
      className='w-7 h-7'
      tintColor={focused ? "#2563EB" : "#888888"}
    />
  </View>
);

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: "#888888",
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
          height: Platform.OS === "ios" ? 80 : 65,
          paddingTop: 5,
          paddingBottom: 5,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={icons.home} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={icons.chat} />,
        }}
      />
      <Tabs.Screen
        name="addpost"
        options={{
          title: 'Add Post',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={icons.email} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={icons.list} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={icons.profile} />,
        }}
      />
    </Tabs>
  );
}