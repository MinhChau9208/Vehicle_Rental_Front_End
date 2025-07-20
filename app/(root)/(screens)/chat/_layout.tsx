import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name='chat-detail'/>
      <Stack.Screen name='new-chat'/>
      <Stack.Screen name='notification'/>
    </Stack>
  );
}