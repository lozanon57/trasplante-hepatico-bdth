import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PatientCard } from '../../components/PatientCard';
import { AlertBadge } from '../../components/AlertBadge';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  listarTrasplantes,
  calcularCompletitud,
  totalAlertasCriticasPendientes,
} from '../../lib/db/queries';
import { generarAlertas } from '../../lib/alerts/checker';
import { Colors } from '../../constants/variables';

interface CasoItem {
  trasplante_id: number;
  codigo_anon: string;
  fecha_trasplante: number | null | undefined;
  estado: string | null | undefined;
  num_alertas: number | null | undefined;
  creado_por: string | null | undefined;
  completitud: number;
}

export default function Dashboard() {
  const [casos, setCasos]           = useState<CasoItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCriticas, setTotalCriticas] = useState(0);

  const cargar = useCallback(() => {
    const rows = listarTrasplantes();
    const items: CasoItem[] = rows.map(r => ({
      trasplante_id: r.trasplante.id,
      codigo_anon:   r.codigo_anon,
      fecha_trasplante: r.trasplante.fecha_trasplante,
      estado:        r.trasplante.estado,
      num_alertas:   r.trasplante.num_alertas,
      creado_por:    r.creado_por,
      completitud:   calcularCompletitud(r.trasplante.id),
    }));
    setCasos(items);
    setTotalCriticas(totalAlertasCriticasPendientes());
  }, []);

  useFocusEffect(cargar);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Re-generar alertas para todos los casos
    const rows = listarTrasplantes();
    for (const r of rows) {
      await generarAlertas(r.trasplante.id);
    }
    cargar();
    setRefreshing(false);
  }, [cargar]);

  const totalAlertas = casos.reduce((acc, c) => acc + (c.num_alertas ?? 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ScreenHeader
        icon="list-outline"
        title="Casos BDTH"
        subtitle="H. Gregorio Marañón · Trasplante Hepático"
        color={Colors.primary}
        right={<AlertBadge count={totalAlertas} tipo={totalCriticas > 0 ? 'critica' : 'normal'} />}
      />

      {/* Banner alertas críticas */}
      {totalCriticas > 0 && (
        <TouchableOpacity style={styles.bannerCritico}>
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={styles.bannerText}>
            {totalCriticas} alerta{totalCriticas > 1 ? 's' : ''} crítica{totalCriticas > 1 ? 's' : ''} sin resolver
          </Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="heart-outline" size={16} color={Colors.primary} />
          <Text style={styles.statNum}>{casos.length}</Text>
          <Text style={styles.statLabel}>Casos</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
          <Text style={[styles.statNum, { color: Colors.success }]}>
            {casos.filter(c => c.estado === 'completo').length}
          </Text>
          <Text style={styles.statLabel}>Completos</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="time-outline" size={16} color={Colors.warning} />
          <Text style={[styles.statNum, { color: Colors.warning }]}>
            {casos.filter(c => c.estado === 'borrador' || c.estado === 'incompleto').length}
          </Text>
          <Text style={styles.statLabel}>Borradores</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="warning-outline" size={16} color={Colors.danger} />
          <Text style={[styles.statNum, { color: Colors.danger }]}>
            {casos.filter(c => (c.num_alertas ?? 0) > 0).length}
          </Text>
          <Text style={styles.statLabel}>Alertas</Text>
        </View>
      </View>

      {/* Lista de casos */}
      <FlatList
        data={casos}
        keyExtractor={item => String(item.trasplante_id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <PatientCard
            trasplante_id={item.trasplante_id}
            codigo_anon={item.codigo_anon}
            fecha_trasplante={item.fecha_trasplante}
            estado={item.estado}
            num_alertas={item.num_alertas}
            creado_por={item.creado_por}
            completitud={item.completitud}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyText}>Sin casos registrados</Text>
            <Text style={styles.emptyHint}>Pulsa + para añadir el primer trasplante</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/nuevo')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  bannerCritico: {
    backgroundColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerText:    { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  statNum:   { fontSize: 20, fontWeight: '900', color: Colors.primary },
  statLabel: { fontSize: 10, color: Colors.textSecondary },
  list:          { padding: 16, paddingBottom: 90 },
  empty:         { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText:     { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptyHint:     { fontSize: 13, color: Colors.textSecondary },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
