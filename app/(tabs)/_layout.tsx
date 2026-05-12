import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useAuth } from '../../lib/auth/context';
import { Colors } from '../../constants/variables';

export default function TabsLayout() {
  const { user } = useAuth();
  const esJefe   = user?.rol === 'jefe';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Casos',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 26 : 22, marginBottom: -2 }}>🫀</Text>,
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 26 : 22, marginBottom: -2 }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="estadisticas"
        options={{
          title: 'Estadísticas',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 26 : 22, marginBottom: -2 }}>📊</Text>,
        }}
      />
      {esJefe && (
        <Tabs.Screen
          name="jefe"
          options={{
            title: 'Jefatura',
            tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 26 : 22, marginBottom: -2 }}>🔐</Text>,
          }}
        />
      )}
      <Tabs.Screen
        name="configuracion"
        options={{
          title: 'Config.',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 26 : 22, marginBottom: -2 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
