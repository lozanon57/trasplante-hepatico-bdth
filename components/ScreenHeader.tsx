import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, icon, color, right }: Props) {
  return (
    <View style={[s.container, { backgroundColor: color }]}>
      {/* Decorative circles */}
      <View style={[s.circle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[s.circle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

      <View style={s.row}>
        <View style={s.left}>
          <View style={[s.iconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name={icon as any} size={22} color="#fff" />
          </View>
          <View>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {right ? <View style={s.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    top: -40, right: -30,
  },
  circle2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    top: 20, right: 80,
  },
  row:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  right: {},
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  title:    { fontSize: 20, fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
});
