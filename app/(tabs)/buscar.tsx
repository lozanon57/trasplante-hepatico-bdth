import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { anonimizarNHC } from '../../lib/anonymization/crypto';
import { listarTrasplantes, calcularCompletitud, buscarPacientePorHash } from '../../lib/db/queries';
import { PatientCard } from '../../components/PatientCard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Colors } from '../../constants/variables';

const BUSCAR_COLOR = '#00695C';

export default function Buscar() {
  const [query, setQuery]   = useState('');
  const [todos, setTodos]   = useState<ReturnType<typeof listarTrasplantes>>([]);
  const [filtros, setFiltros] = useState<ReturnType<typeof listarTrasplantes>>([]);
  const [buscandoNHC, setBuscandoNHC] = useState(false);

  useFocusEffect(useCallback(() => {
    const data = listarTrasplantes();
    setTodos(data);
    setFiltros(data);
  }, []));

  const filtrar = async (texto: string) => {
    setQuery(texto);
    if (!texto.trim()) { setFiltros(todos); return; }

    const lower = texto.toLowerCase();

    // Primero: búsqueda por código anon o cirujano
    let resultado = todos.filter(r =>
      r.codigo_anon.toLowerCase().includes(lower) ||
      (r.creado_por ?? '').toLowerCase().includes(lower)
    );

    // Si parece un NHC (solo dígitos o alfanumérico sin BDT-), buscar por hash
    if (resultado.length === 0 && !lower.startsWith('bdt-')) {
      setBuscandoNHC(true);
      const { nhc_hash } = await anonimizarNHC(texto.trim());
      const paciente = buscarPacientePorHash(nhc_hash);
      if (paciente) {
        resultado = todos.filter(r => r.trasplante.paciente_id === paciente.id);
      }
      setBuscandoNHC(false);
    }

    setFiltros(resultado);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <ScreenHeader
          icon="search-outline"
          title="Buscar casos"
          subtitle="Por NHC, código BDT o cirujano"
          color={BUSCAR_COLOR}
        />

        {/* Buscador */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={filtrar}
            placeholder="NHC o código BDT-…"
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {buscandoNHC && <Text style={styles.hint}>Buscando por NHC…</Text>}
          {query.length > 0 && (
            <TouchableOpacity onPress={() => filtrar('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.resultados}>
          {filtros.length} resultado{filtros.length !== 1 ? 's' : ''}
          {query ? ` para "${query}"` : ''}
        </Text>

        <FlatList
          data={filtros}
          keyExtractor={item => String(item.trasplante.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PatientCard
              trasplante_id={item.trasplante.id}
              codigo_anon={item.codigo_anon}
              fecha_trasplante={item.trasplante.fecha_trasplante}
              estado={item.trasplante.estado}
              num_alertas={item.trasplante.num_alertas}
              creado_por={item.creado_por}
              completitud={calcularCompletitud(item.trasplante.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Sin resultados</Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    color: Colors.textPrimary,
  },
  hint:       { fontSize: 11, color: Colors.textSecondary },
  resultados: { fontSize: 12, color: Colors.textSecondary, marginHorizontal: 16, marginBottom: 8 },
  list:       { paddingHorizontal: 16, paddingBottom: 40 },
  empty:      { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText:  { fontSize: 15, color: Colors.textSecondary },
});
