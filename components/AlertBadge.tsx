import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/variables';

interface AlertBadgeProps {
  count: number;
  tipo?: 'critica' | 'normal';
  size?: 'sm' | 'md';
}

export function AlertBadge({ count, tipo = 'normal', size = 'md' }: AlertBadgeProps) {
  if (!count) return null;
  const isCritical = tipo === 'critica';
  const isSmall    = size === 'sm';

  return (
    <View style={[
      styles.badge,
      isCritical ? styles.critical : styles.normal,
      isSmall && styles.small,
    ]}>
      <Text style={[styles.text, isSmall && styles.textSmall]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  critical: { backgroundColor: Colors.danger },
  normal:   { backgroundColor: Colors.warning },
  small:    { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4 },
  text:     { color: '#fff', fontSize: 12, fontWeight: '800' },
  textSmall:{ fontSize: 10 },
});
