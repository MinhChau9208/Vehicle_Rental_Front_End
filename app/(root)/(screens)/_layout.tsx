import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="user" />
      <Stack.Screen name="rental" />
      <Stack.Screen name="vehicle" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}