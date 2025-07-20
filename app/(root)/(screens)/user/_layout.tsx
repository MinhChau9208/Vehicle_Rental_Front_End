import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name='edit-phone'/>
      <Stack.Screen name='my-account'/>
      <Stack.Screen name='my-vehicles'/>
      <Stack.Screen name='update-to-level-2'/>
      <Stack.Screen name='vehicle-rentals'/>
    </Stack>
  );
}