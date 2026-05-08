import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '../constants/variables';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  hint?: string;
  hasValue?: boolean;
}

export function FormField({ label, required, hint, hasValue, style, ...props }: FormFieldProps) {
  const filled = hasValue !== undefined ? hasValue : !!props.value;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
        {filled && <Text style={styles.checkmark}> ✓</Text>}
      </Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <TextInput
        style={[styles.input, !filled && required && styles.inputEmpty, style]}
        placeholderTextColor={Colors.textSecondary}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  required:   { color: Colors.danger },
  checkmark:  { color: Colors.success },
  hint:       { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  inputEmpty: { borderColor: '#FFB74D' },
});
