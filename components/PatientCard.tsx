import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AlertBadge } from './AlertBadge';
import { Colors } from '../constants/variables';
import {
  obtenerDonante,
  obtenerReceptorImplante,
  obtenerPostoperatorio,
} from '../lib/db/queries';

interface PatientCardProps {
  trasplante_id: number;
  codigo_anon: string;
  fecha_trasplante: number | null | undefined;
  estado: string | null | undefined;
  num_alertas: number | null | undefined;
  creado_por: string | null | undefined;
  completitud: number;
}

const ESTADO_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  completo:           { color: Colors.success,       icon: 'checkmark-circle', label: 'Completo' },
  incompleto:         { color: Colors.warning,        icon: 'time-outline',     label: 'Incompleto' },
  borrador:           { color: Colors.textSecondary,  icon: 'create-outline',   label: 'Borrador' },
  'donante-no-válido':{ color: Colors.danger,         icon: 'close-circle',     label: 'No válido' },
};

function SectionDot({ filled, color }: { filled: boolean; color: string }) {
  return (
    <View style={[
      dotS.dot,
      filled ? { backgroundColor: color } : { backgroundColor: Colors.border },
    ]} />
  );
}
const dotS = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});

export function PatientCard({
  trasplante_id,
  codigo_anon,
  fecha_trasplante,
  estado,
  num_alertas,
  creado_por,
  completitud,
}: PatientCardProps) {
  const alertas = num_alertas ?? 0;
  const cfg = ESTADO_CONFIG[estado ?? ''] ?? ESTADO_CONFIG['borrador']!;

  const hasDonante  = !!obtenerDonante(trasplante_id);
  const hasImplante = !!obtenerReceptorImplante(trasplante_id);
  const hasPostop   = !!obtenerPostoperatorio(trasplante_id);
  const isRejected  = estado === 'donante-no-válido';

  const fechaStr = fecha_trasplante
    ? new Date(fecha_trasplante).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sin fecha';

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.color }]}
      onPress={() => router.push(`/paciente/${trasplante_id}`)}
      activeOpacity={0.82}
    >
      <View style={styles.row}>
        {/* Left: code + meta */}
        <View style={styles.left}>
          <Text style={[styles.codigo, { color: cfg.color }]}>{codigo_anon}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={Colors.textSecondary} />
            <Text style={styles.meta}>{fechaStr}</Text>
            {creado_por ? (
              <>
                <Text style={styles.metaSep}>·</Text>
                <Ionicons name="person-outline" size={11} color={Colors.textSecondary} />
                <Text style={styles.meta}>{creado_por}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Right: status badge + alert */}
        <View style={styles.right}>
          {alertas > 0 && <AlertBadge count={alertas} size="md" />}
          <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      {/* Section dots + progress */}
      {!isRejected && (
        <View style={styles.footer}>
          <View style={styles.dots}>
            <SectionDot filled={hasDonante}  color={Colors.sectionDonante} />
            <SectionDot filled={hasImplante} color={Colors.sectionImplante} />
            <SectionDot filled={hasPostop}   color={Colors.sectionPostop} />
            <Text style={styles.dotsLabel}>
              {[hasDonante && 'Donante', hasImplante && 'Implante', hasPostop && 'Postop']
                .filter(Boolean).join(' · ') || 'Sin datos'}
            </Text>
          </View>
          <View style={styles.progWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${completitud}%` as any, backgroundColor: cfg.color }]} />
            </View>
            <Text style={[styles.progressPct, { color: cfg.color }]}>{completitud}%</Text>
          </View>
        </View>
      )}

      {isRejected && (
        <View style={styles.rejectedRow}>
          <Ionicons name="information-circle-outline" size={12} color={Colors.danger} />
          <Text style={styles.rejectedText}>Donante evaluado · Sin trasplante</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left:     { flex: 1, gap: 4 },
  right:    { alignItems: 'flex-end', gap: 5 },
  codigo:   { fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta:     { fontSize: 11, color: Colors.textSecondary },
  metaSep:  { fontSize: 11, color: Colors.border },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  footer:     { marginTop: 10, gap: 6 },
  dots:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dotsLabel:  { fontSize: 10, color: Colors.textSecondary, marginLeft: 2 },
  progWrap:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { flex: 1, height: 5, backgroundColor: Colors.border, borderRadius: 3 },
  progressFill:{ height: 5, borderRadius: 3 },
  progressPct:{ fontSize: 10, fontWeight: '800', minWidth: 28, textAlign: 'right' },
  rejectedRow:{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  rejectedText:{ fontSize: 11, color: Colors.danger },
});
