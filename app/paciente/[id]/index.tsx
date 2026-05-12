import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/variables';
import {
  obtenerTrasplante,
  obtenerDonante,
  obtenerReceptorImplante,
  obtenerPostoperatorio,
} from '../../../lib/db/queries';

type SectionStatus = 'completo' | 'borrador' | 'vacío';

function sectionStatus(data: Record<string, unknown> | undefined): SectionStatus {
  if (!data) return 'vacío';
  const vals = Object.entries(data).filter(([k]) => k !== 'id' && k !== 'trasplante_id');
  const filled = vals.filter(([, v]) => v !== null && v !== undefined && v !== '').length;
  return filled > 3 ? 'completo' : 'borrador';
}

const STATUS_COLORS: Record<SectionStatus, string> = {
  completo: Colors.success,
  borrador: Colors.warning,
  'vacío':  Colors.textSecondary,
};

const STATUS_ICONS: Record<SectionStatus, string> = {
  completo: 'checkmark-circle',
  borrador: 'create-outline',
  'vacío':  'add-circle-outline',
};

export default function PacienteOverview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tid = Number(id);

  const [donante,    setDonante]    = useState<Record<string, unknown> | undefined>();
  const [implante,   setImplante]   = useState<Record<string, unknown> | undefined>();
  const [postop,     setPostop]     = useState<Record<string, unknown> | undefined>();
  const [trasplante, setTrasplante] = useState<{ fecha_trasplante: number | null; estado: string | null } | undefined>();

  useFocusEffect(useCallback(() => {
    setTrasplante(obtenerTrasplante(tid) as any);
    setDonante(obtenerDonante(tid));
    setImplante(obtenerReceptorImplante(tid));
    setPostop(obtenerPostoperatorio(tid));
  }, [tid]));

  const fechaStr = trasplante?.fecha_trasplante
    ? new Date(trasplante.fecha_trasplante).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Sin fecha';

  const sections = [
    {
      key: 'donante',
      label: 'Donante',
      icon: 'person-outline' as const,
      color: Colors.sectionDonante,
      status: sectionStatus(donante),
      route: `/paciente/${tid}/donante`,
    },
    {
      key: 'implante',
      label: 'Receptor e Implante',
      icon: 'medkit-outline' as const,
      color: Colors.sectionImplante,
      status: sectionStatus(implante),
      route: `/paciente/${tid}/implante`,
    },
    {
      key: 'postoperatorio',
      label: 'Postoperatorio',
      icon: 'pulse-outline' as const,
      color: Colors.sectionPostop,
      status: sectionStatus(postop),
      route: `/paciente/${tid}/postoperatorio`,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Trasplante #{tid}</Text>
          <Text style={styles.subtitle}>{fechaStr}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Secciones del registro</Text>

      {sections.map(s => (
        <TouchableOpacity
          key={s.key}
          style={styles.sectionCard}
          onPress={() => router.push(s.route as any)}
          activeOpacity={0.82}
        >
          <View style={[styles.iconBox, { backgroundColor: s.color + '18' }]}>
            <Ionicons name={s.icon} size={26} color={s.color} />
          </View>
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionLabel}>{s.label}</Text>
            <View style={styles.statusRow}>
              <Ionicons
                name={STATUS_ICONS[s.status] as any}
                size={14}
                color={STATUS_COLORS[s.status]}
              />
              <Text style={[styles.statusText, { color: STATUS_COLORS[s.status] }]}>
                {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.border} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  content:      { padding: 20, paddingBottom: 50 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  backBtn:      { padding: 4 },
  title:        { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  subtitle:     { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sectionHeader:{ fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox:      { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionInfo:  { flex: 1 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  statusText:   { fontSize: 12, fontWeight: '600' },
});
