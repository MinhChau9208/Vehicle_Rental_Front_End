import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name='contract-management'/>
      <Stack.Screen name='contracts'/>
      <Stack.Screen name='create-contract'/>
      <Stack.Screen name='rental-confirmation'/>
      <Stack.Screen name='rental-contract-details'/>
      <Stack.Screen name='rental-details'/>
      <Stack.Screen name='rating'/>
    </Stack>
  );
}