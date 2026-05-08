import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/variables';

interface Option {
  label: string;
  value: number | string;
}

interface RadioGroupProps {
  label: string;
  options: Option[];
  value: number | string | null | undefined;
  onChange: (val: number | string) => void;
  required?: boolean;
}

export function RadioGroup({ label, options, value, onChange, required }: RadioGroupProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.row}>
        {options.map(opt => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              onPress={() => onChange(opt.value)}
              style={[styles.option, selected && styles.optionSelected]}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label:     { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  required:  { color: Colors.danger },
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText:         { fontSize: 13, color: Colors.textPrimary },
  optionTextSelected: { color: '#fff', fontWeight: '700' },
});
