import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AlertBadge } from './AlertBadge';
import { Colors } from '../constants/variables';

interface PatientCardProps {
  trasplante_id: number;
  codigo_anon: string;
  fecha_trasplante: number | null | undefined;
  estado: string | null | undefined;
  num_alertas: number | null | undefined;
  creado_por: string | null | undefined;
  completitud: number;    // 0-100
}

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

  const fechaStr = fecha_trasplante
    ? new Date(fecha_trasplante).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Sin fecha';

  const estadoColor =
    estado === 'completo'   ? Colors.success :
    estado === 'incompleto' ? Colors.warning :
    Colors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/paciente/${trasplante_id}/donante`)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.codigo}>{codigo_anon}</Text>
          <Text style={styles.fecha}>{fechaStr}</Text>
          {creado_por && <Text style={styles.cirujano}>Dr/a. {creado_por}</Text>}
        </View>
        <View style={styles.right}>
          {alertas > 0 && <AlertBadge count={alertas} size="md" />}
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '22' }]}>
            <Text style={[styles.estadoText, { color: estadoColor }]}>
              {estado ?? 'borrador'}
            </Text>
          </View>
        </View>
      </View>

      {/* Barra de completitud */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${completitud}%` as any }]} />
      </View>
      <Text style={styles.progressLabel}>{completitud}% completado</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left:      { flex: 1 },
  right:     { alignItems: 'flex-end', gap: 6 },
  codigo:    { fontSize: 16, fontWeight: '800', color: Colors.primary },
  fecha:     { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cirujano:  { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  estadoBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  estadoText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  progressBg:{ height: 6, backgroundColor: Colors.border, borderRadius: 3, marginTop: 10 },
  progressFill:{ height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  progressLabel:{ fontSize: 10, color: Colors.textSecondary, marginTop: 3 },
});
