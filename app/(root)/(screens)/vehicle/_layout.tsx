import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name='car-details'/>
      <Stack.Screen name='car-listing'/>
      <Stack.Screen name='edit-vehicle' />
      <Stack.Screen name='payment' />
      <Stack.Screen name='date-time-picker' />
    </Stack>
  );
}