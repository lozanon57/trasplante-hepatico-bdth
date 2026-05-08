import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../lib/db/queries';
import { configurarNotificaciones } from '../lib/alerts/checker';
import { Colors } from '../constants/variables';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
    configurarNotificaciones();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nuevo" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="paciente/[id]/donante" />
        <Stack.Screen name="paciente/[id]/implante" />
        <Stack.Screen name="paciente/[id]/postoperatorio" />
      </Stack>
    </>
  );
}
