import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/variables';

interface OCRButtonProps {
  onCamera:  () => void;
  onGallery: () => void;
  loading?:  boolean;
  label?:    string;
}

export function OCRButton({ onCamera, onGallery, loading, label = 'Leer formulario' }: OCRButtonProps) {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analizando formulario{'\n'}(texto impreso y manuscrito)…</Text>
        {Platform.OS !== 'web' && (
          <View style={styles.redactBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#2E7D32" />
            <Text style={styles.redactText}>Cabecera del paciente eliminada antes de enviar</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.cameraBtn]} onPress={onCamera} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={22} color="#fff" />
          <Text style={styles.btnText}>📷 Fotografiar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.galleryBtn]} onPress={onGallery} activeOpacity={0.8}>
          <Ionicons name="document-outline" size={22} color={Colors.primary} />
          <Text style={[styles.btnText, { color: Colors.primary }]}>📄 PDF / Galería</Text>
        </TouchableOpacity>
      </View>
      {Platform.OS !== 'web' && (
        <View style={styles.privacyBar}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#1565C0" />
          <Text style={styles.privacyText}>
            La cabecera con nombre y NHC se elimina automáticamente antes de enviar al análisis
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', gap: 10, marginBottom: 6 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  cameraBtn:  { backgroundColor: Colors.primary },
  galleryBtn: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary },
  btnText:    { fontSize: 14, fontWeight: '700', color: '#fff' },

  loadingBox: {
    alignItems: 'center', padding: 24,
    backgroundColor: '#EEF2FF', borderRadius: 12, marginBottom: 16, gap: 12,
  },
  loadingText: { fontSize: 14, color: Colors.primary, textAlign: 'center', lineHeight: 22 },

  redactBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  redactText: { fontSize: 11, color: '#2E7D32', flexShrink: 1 },

  privacyBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E3F2FD', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 16,
  },
  privacyText: { fontSize: 11, color: '#1565C0', flex: 1, lineHeight: 16 },
});
