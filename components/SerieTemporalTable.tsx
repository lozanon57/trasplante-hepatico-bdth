import React from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '../constants/variables';

interface Column { key: string; label: string }

interface SerieTemporalTableProps {
  title: string;
  rowHeaders: string[];       // p.ej. TIMEPOINTS_INTRAOP o ['1','2',...,'7']
  columns: Column[];
  data: Record<string, Record<string, string | number | null>>;
  onChange: (rowKey: string, colKey: string, value: string) => void;
  rowLabel?: string;          // etiqueta de la columna de filas, ej. "Timepoint"
}

export function SerieTemporalTable({
  title,
  rowHeaders,
  columns,
  data,
  onChange,
  rowLabel = '',
}: SerieTemporalTableProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Cabecera */}
          <View style={styles.headerRow}>
            <View style={[styles.cell, styles.headerCell, styles.firstCol]}>
              <Text style={styles.headerText}>{rowLabel}</Text>
            </View>
            {columns.map(col => (
              <View key={col.key} style={[styles.cell, styles.headerCell]}>
                <Text style={styles.headerText}>{col.label}</Text>
              </View>
            ))}
          </View>

          {/* Filas de datos */}
          {rowHeaders.map((rowKey, ri) => (
            <View key={rowKey} style={[styles.dataRow, ri % 2 === 1 && styles.dataRowAlt]}>
              <View style={[styles.cell, styles.firstCol, styles.rowLabelCell]}>
                <Text style={styles.rowLabelText}>{rowKey}</Text>
              </View>
              {columns.map(col => {
                const val = data[rowKey]?.[col.key];
                return (
                  <View key={col.key} style={styles.cell}>
                    <TextInput
                      style={styles.cellInput}
                      value={val !== null && val !== undefined ? String(val) : ''}
                      onChangeText={txt => onChange(rowKey, col.key, txt)}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor="#B0BEC5"
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const CELL_W  = 68;
const FIRST_W = 72;

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 16 },
  title:      { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  headerRow:  { flexDirection: 'row' },
  dataRow:    { flexDirection: 'row', backgroundColor: Colors.surface },
  dataRowAlt: { backgroundColor: '#EEF2FF' },
  cell: {
    width: CELL_W,
    borderWidth: 0.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  firstCol:    { width: FIRST_W },
  headerCell:  { backgroundColor: Colors.primary, paddingVertical: 6 },
  headerText:  { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  rowLabelCell:{ backgroundColor: '#E8EAF6' },
  rowLabelText:{ fontSize: 11, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  cellInput: {
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
});
