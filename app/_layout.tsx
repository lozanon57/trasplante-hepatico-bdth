import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { initDatabase } from '../lib/db/queries';
import { configurarNotificaciones } from '../lib/alerts/checker';
import { AuthProvider, useAuth } from '../lib/auth/context';
import { Colors } from '../constants/variables';

function AppNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/login');
      else       router.replace('/(tabs)');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nuevo" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="paciente/[id]/donante" />
        <Stack.Screen name="paciente/[id]/implante" />
        <Stack.Screen name="paciente/[id]/postoperatorio" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
    configurarNotificaciones();
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
