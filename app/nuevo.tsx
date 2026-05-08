import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { anonimizarNHC } from '../lib/anonymization/crypto';
import { crearPaciente, crearTrasplante, buscarPacientePorHash } from '../lib/db/queries';
import { Colors, OPTIONS_GRUPO_ABO } from '../constants/variables';

export default function NuevoCaso() {
  const [nhc, setNhc]           = useState('');
  const [grupoABO, setGrupoABO] = useState('');
  const [cirujano, setCirujano] = useState('');
  const [loading, setLoading]   = useState(false);

  const crear = async () => {
    if (!nhc.trim()) {
      Alert.alert('Campo requerido', 'Introduce el NHC del paciente receptor.');
      return;
    }

    setLoading(true);
    try {
      const { codigo_anon, nhc_hash } = await anonimizarNHC(nhc.trim());

      // Comprobar si el paciente ya existe
      let paciente = buscarPacientePorHash(nhc_hash);

      if (!paciente) {
        paciente = crearPaciente({
          codigo_anon,
          nhc_hash,
          grupo_abo:     grupoABO || null,
          fecha_creacion: Date.now(),
          creado_por:    cirujano.trim() || null,
        });
      }

      if (!paciente) throw new Error('No se pudo crear el paciente');

      const trasplante = crearTrasplante({
        paciente_id:      paciente.id,
        fecha_trasplante: Date.now(),
        estado:           'borrador',
        num_alertas:      0,
      });

      if (!trasplante) throw new Error('No se pudo crear el trasplante');

      Alert.alert(
        'Caso creado',
        `Código: ${codigo_anon}\n\nElige la sección a rellenar primero.`,
        [
          { text: 'Donante',  onPress: () => router.replace(`/paciente/${trasplante.id}/donante`) },
          { text: 'Implante', onPress: () => router.replace(`/paciente/${trasplante.id}/implante`) },
          { text: 'Postop',   onPress: () => router.replace(`/paciente/${trasplante.id}/postoperatorio`) },
        ]
      );
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo trasplante</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            El NHC nunca se almacena en texto plano. Se genera un código anónimo irreversible sin el PIN maestro.
          </Text>
        </View>

        {/* NHC */}
        <Text style={styles.label}>NHC del receptor *</Text>
        <TextInput
          style={styles.input}
          value={nhc}
          onChangeText={setNhc}
          placeholder="Número de historia clínica"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="default"
          autoCapitalize="none"
        />

        {/* Grupo ABO */}
        <Text style={styles.label}>Grupo ABO receptor</Text>
        <View style={styles.aboRow}>
          {OPTIONS_GRUPO_ABO.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.aboBtn, grupoABO === g && styles.aboBtnSelected]}
              onPress={() => setGrupoABO(grupoABO === g ? '' : g)}
            >
              <Text style={[styles.aboText, grupoABO === g && styles.aboTextSelected]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cirujano */}
        <Text style={styles.label}>Cirujano responsable</Text>
        <TextInput
          style={styles.input}
          value={cirujano}
          onChangeText={setCirujano}
          placeholder="Nombre del cirujano"
          placeholderTextColor={Colors.textSecondary}
        />

        <TouchableOpacity
          style={[styles.btnCreate, loading && styles.btnDisabled]}
          onPress={crear}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.btnCreateText}>
            {loading ? 'Creando…' : 'Crear caso y continuar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  content:     { padding: 20, paddingBottom: 50 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backBtn:     { padding: 4 },
  title:       { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText:    { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 18 },
  label:       { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    marginBottom: 20,
  },
  aboRow:      { flexDirection: 'row', gap: 10, marginBottom: 20 },
  aboBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  aboBtnSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  aboText:        { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  aboTextSelected:{ color: '#fff' },
  btnCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 10,
  },
  btnDisabled:    { opacity: 0.5 },
  btnCreateText:  { fontSize: 16, fontWeight: '800', color: '#fff' },
});
