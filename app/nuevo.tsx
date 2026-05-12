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

type TipoCaso = 'trasplante' | 'donante_no_valido';

function generarPlaceholder(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const ts   = Date.now().toString(36).toUpperCase();
  return {
    codigo_anon: `${prefix}-${ts}-${rand}`,
    nhc_hash:    `__${prefix.toLowerCase()}__${Date.now()}_${rand}`,
  };
}

export default function NuevoCaso() {
  const [tipoCaso, setTipoCaso] = useState<TipoCaso>('trasplante');
  const [nhc, setNhc]           = useState('');
  const [grupoABO, setGrupoABO] = useState('');
  const [cirujano, setCirujano] = useState('');
  const [loading, setLoading]   = useState(false);

  const esDnv = tipoCaso === 'donante_no_valido';

  const crear = async () => {
    setLoading(true);
    try {
      let ids: { codigo_anon: string; nhc_hash: string };

      if (nhc.trim()) {
        ids = await anonimizarNHC(nhc.trim());
      } else if (esDnv) {
        ids = generarPlaceholder('DNV');
      } else {
        ids = generarPlaceholder('PDTE');
      }

      let paciente = buscarPacientePorHash(ids.nhc_hash);

      if (!paciente) {
        paciente = crearPaciente({
          codigo_anon:    ids.codigo_anon,
          nhc_hash:       ids.nhc_hash,
          grupo_abo:      grupoABO || null,
          fecha_creacion: Date.now(),
          creado_por:     cirujano.trim() || null,
        });
      }

      if (!paciente) throw new Error('No se pudo crear el registro');

      const trasplante = crearTrasplante({
        paciente_id:      paciente.id,
        fecha_trasplante: Date.now(),
        estado:           esDnv ? 'donante-no-válido' : 'borrador',
        num_alertas:      0,
      });

      if (!trasplante) throw new Error('No se pudo crear el trasplante');

      router.replace(`/paciente/${trasplante.id}`);
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
          <Text style={styles.title}>Nuevo caso</Text>
        </View>

        {/* Tipo de caso */}
        <Text style={styles.sectionLabel}>Tipo de registro</Text>
        <View style={styles.tipoRow}>
          <TouchableOpacity
            style={[styles.tipoBtn, !esDnv && styles.tipoBtnActive]}
            onPress={() => setTipoCaso('trasplante')}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={16} color={!esDnv ? '#fff' : Colors.primary} />
            <Text style={[styles.tipoBtnText, !esDnv && styles.tipoBtnTextActive]}>
              Trasplante
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, styles.tipoBtnRed, esDnv && styles.tipoBtnRedActive]}
            onPress={() => setTipoCaso('donante_no_valido')}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={16} color={esDnv ? '#fff' : '#C62828'} />
            <Text style={[styles.tipoBtnText, { color: esDnv ? '#fff' : '#C62828' }]}>
              Donante no válido
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info box */}
        <View style={[styles.infoBox, esDnv && styles.infoBoxRed]}>
          <Ionicons
            name={esDnv ? 'information-circle-outline' : 'shield-checkmark-outline'}
            size={20}
            color={esDnv ? '#C62828' : Colors.primary}
          />
          <Text style={[styles.infoText, esDnv && { color: '#C62828' }]}>
            {esDnv
              ? 'Se registrarán los datos del donante. No se necesita NHC ni datos del receptor.'
              : 'El NHC nunca se almacena en texto plano. Puede añadirse después en el formulario de receptor/implante.'}
          </Text>
        </View>

        {/* NHC — solo para trasplante */}
        {!esDnv && (
          <>
            <Text style={styles.label}>
              NHC del receptor{' '}
              <Text style={styles.optional}>(opcional)</Text>
            </Text>
            <Text style={styles.hint}>
              Si no lo tienes ahora, puedes introducirlo al rellenar los datos del receptor.
            </Text>
            <TextInput
              style={styles.input}
              value={nhc}
              onChangeText={setNhc}
              placeholder="Número de historia clínica"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="default"
              autoCapitalize="none"
            />
          </>
        )}

        {/* Grupo ABO */}
        <Text style={styles.label}>
          Grupo ABO {esDnv ? 'del donante' : 'del receptor'}
        </Text>
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
          style={[styles.btnCreate, loading && styles.btnDisabled, esDnv && styles.btnCreateRed]}
          onPress={crear}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons
            name={esDnv ? 'close-circle-outline' : 'add-circle-outline'}
            size={20}
            color="#fff"
          />
          <Text style={styles.btnCreateText}>
            {loading
              ? 'Creando…'
              : esDnv
                ? 'Registrar donante no válido'
                : 'Crear caso y continuar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  content:      { padding: 20, paddingBottom: 50 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backBtn:      { padding: 4 },
  title:        { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  tipoRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.surface,
  },
  tipoBtnActive: { backgroundColor: Colors.primary },
  tipoBtnRed:    { borderColor: '#C62828' },
  tipoBtnRedActive: { backgroundColor: '#C62828', borderColor: '#C62828' },
  tipoBtnText:   { fontSize: 13, fontWeight: '700', color: Colors.primary },
  tipoBtnTextActive: { color: '#fff' },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#E3F2FD',
    borderRadius: 10, padding: 12, marginBottom: 24, alignItems: 'flex-start',
  },
  infoBoxRed: { backgroundColor: '#FFEBEE' },
  infoText:   { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 18 },
  label:    { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  optional: { fontWeight: '400', color: Colors.textSecondary, fontSize: 11 },
  hint:     { fontSize: 11, color: Colors.textSecondary, marginBottom: 10, lineHeight: 16 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8,
    padding: 12, fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.surface, marginBottom: 20,
  },
  aboRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  aboBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  aboBtnSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  aboText:        { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  aboTextSelected:{ color: '#fff' },
  btnCreate: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, marginTop: 10,
  },
  btnCreateRed: { backgroundColor: '#C62828' },
  btnDisabled:  { opacity: 0.5 },
  btnCreateText:{ fontSize: 16, fontWeight: '800', color: '#fff' },
});
