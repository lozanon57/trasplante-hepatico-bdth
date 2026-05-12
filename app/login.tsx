import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth/context';
import { setServerUrl } from '../lib/api/client';
import { Colors } from '../constants/variables';

export default function LoginScreen() {
  const { login, loginDemo } = useAuth();
  const [serverUrl, setServerUrlState] = useState('');
  const [email,     setEmail]          = useState('');
  const [password,  setPassword]       = useState('');
  const [loading,   setLoading]        = useState(false);
  const [showServer, setShowServer]    = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return Alert.alert('Campos vacíos', 'Introduce email y contraseña');
    setLoading(true);
    try {
      if (serverUrl.trim()) {
        const url = serverUrl.startsWith('http') ? serverUrl.trim() : `https://${serverUrl.trim()}`;
        await setServerUrl(url);
      }
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Error de acceso', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.logo}>🫀</Text>
        <Text style={styles.title}>BDTH</Text>
        <Text style={styles.subtitle}>Base de Datos de Trasplante Hepático{'\n'}H. Gregorio Marañón</Text>

        <View style={styles.hint}>
          <Text style={styles.hintText}>👤 usuario@hgm.es · 🔑 BDTH_HGM_2026</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="usuario@hgm.es"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.serverToggle} onPress={() => setShowServer(v => !v)}>
          <Text style={styles.serverToggleText}>{showServer ? '▲ Ocultar servidor' : '▼ Conectar a servidor externo'}</Text>
        </TouchableOpacity>

        {showServer && (
          <TextInput
            style={styles.input}
            placeholder="https://tu-servidor.com"
            placeholderTextColor={Colors.textSecondary}
            value={serverUrl}
            onChangeText={setServerUrlState}
            autoCapitalize="none"
            keyboardType="url"
          />
        )}

        <TouchableOpacity
          style={styles.demoBtn}
          onPress={() => { loginDemo(); router.replace('/(tabs)'); }}
        >
          <Text style={styles.demoBtnText}>🧪 Modo demo (sin servidor)</Text>
        </TouchableOpacity>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔒 Conexión cifrada TLS · Datos protegidos RGPD</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  logo:     { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  title:    { fontSize: 28, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    padding: 14, marginBottom: 12, fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  demoBtn: {
    marginTop: 12, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  demoBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  hint: {
    backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12,
  },
  hintText: { fontSize: 12, color: '#2E7D32', textAlign: 'center', fontWeight: '600' },
  serverToggle: { marginTop: 4, marginBottom: 4, alignItems: 'center' },
  serverToggleText: { fontSize: 12, color: Colors.textSecondary },
  badge: {
    marginTop: 16, backgroundColor: '#E3F2FD', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  badgeText: { fontSize: 11, color: '#1565C0', textAlign: 'center' },
});
