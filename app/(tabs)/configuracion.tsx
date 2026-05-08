import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch, ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import {
  pinConfigurado, configurarPIN, verificarPIN,
  exportarSaltCifrado, tiempoBloqueoRestante,
} from '../../lib/anonymization/crypto';
import { generarExcel } from '../../lib/export/excel';
import { uploadToServer, checkServerStatus } from '../../lib/export/server-sync';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../../constants/variables';

const SERVER_IP_KEY  = 'bdth_server_ip';
const CIRUJANO_KEY   = 'bdth_cirujano';
const OCR_SERVER_KEY = 'bdth_ocr_server_ip';
const OFFLINE_KEY    = 'bdth_offline_mode';

export default function Configuracion() {
  const [serverIP, setServerIP]       = useState('192.168.1.100');
  const [ocrServerIP, setOcrServerIP] = useState('192.168.1.100:8765');
  const [offlineMode, setOfflineMode] = useState(false);
  const [cirujano, setCirujano]       = useState('');
  const [apiKey, setApiKey]           = useState('');
  const [pinActual, setPinActual]     = useState('');
  const [pinNuevo, setPinNuevo]       = useState('');
  const [pinConf, setPinConf]         = useState('');
  const [pinConfig, setPinConfig]     = useState(false);
  const [serverOnline, setServerOnline]     = useState<boolean | null>(null);
  const [ocrServerOnline, setOcrServerOnline] = useState<boolean | null>(null);
  const [exporting, setExporting]     = useState(false);
  const [mostrarApiKey, setMostrarApiKey] = useState(false);
  const [pinSesion, setPinSesion]     = useState('');
  const [sesionAbierta, setSesionAbierta] = useState(false);
  const [lookupData, setLookupData]   = useState<{ codigo: string; hash: string }[]>([]);

  useEffect(() => {
    (async () => {
      const ip     = await SecureStore.getItemAsync(SERVER_IP_KEY);
      const ocrIp  = await SecureStore.getItemAsync(OCR_SERVER_KEY);
      const offline = await SecureStore.getItemAsync(OFFLINE_KEY);
      const cir    = await SecureStore.getItemAsync(CIRUJANO_KEY);
      const key    = await SecureStore.getItemAsync('anthropic_api_key');
      if (ip)     setServerIP(ip);
      if (ocrIp)  setOcrServerIP(ocrIp);
      if (offline) setOfflineMode(offline === '1');
      if (cir)    setCirujano(cir);
      if (key)    setApiKey('•'.repeat(20));
      setPinConfig(await pinConfigurado());
    })();
  }, []);

  const guardarConfig = async () => {
    await SecureStore.setItemAsync(SERVER_IP_KEY, serverIP.trim());
    await SecureStore.setItemAsync(OCR_SERVER_KEY, ocrServerIP.trim());
    await SecureStore.setItemAsync(OFFLINE_KEY, offlineMode ? '1' : '0');
    await SecureStore.setItemAsync(CIRUJANO_KEY, cirujano.trim());
    Alert.alert('Guardado', 'Configuración guardada correctamente.');
  };

  const checkOcrServer = async () => {
    try {
      const url = ocrServerIP.startsWith('http') ? ocrServerIP : `http://${ocrServerIP}`;
      const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(3000) });
      setOcrServerOnline(res.ok);
    } catch {
      setOcrServerOnline(false);
    }
  };

  const guardarApiKey = async () => {
    if (!pinActual.trim()) {
      Alert.alert('Introduce una API Key válida');
      return;
    }
    await SecureStore.setItemAsync('anthropic_api_key', pinActual.trim());
    setApiKey('•'.repeat(20));
    setPinActual('');
    Alert.alert('API Key guardada', 'La clave se ha almacenado de forma segura.');
  };

  const crearPin = async () => {
    if (pinNuevo.length < 4) { Alert.alert('El PIN debe tener al menos 4 dígitos.'); return; }
    if (pinNuevo !== pinConf) { Alert.alert('Los PINs no coinciden.'); return; }
    await configurarPIN(pinNuevo);
    setPinNuevo(''); setPinConf('');
    setPinConfig(true);
    Alert.alert('PIN configurado', 'El PIN maestro se ha guardado correctamente.');
  };

  const checkServer = async () => {
    const { online } = await checkServerStatus(serverIP);
    setServerOnline(online);
  };

  const exportarYSubir = async () => {
    setExporting(true);
    try {
      const path = await generarExcel();
      const local = await FileSystem.getInfoAsync(path);
      Alert.alert(
        'Excel generado',
        `Tamaño: ${Math.round((local.size ?? 0) / 1024)} KB\n¿Subir al servidor (${serverIP})?`,
        [
          { text: 'Solo guardar local', style: 'cancel' },
          {
            text: 'Subir al servidor',
            onPress: async () => {
              const result = await uploadToServer(path, serverIP);
              if (result.ok) {
                Alert.alert('✅ Enviado', `${result.filename} (${Math.round((result.size ?? 0) / 1024)} KB)`);
              } else {
                Alert.alert('Error de conexión', result.error);
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error al exportar', (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const abrirSesionIdentificada = async () => {
    const mins = await tiempoBloqueoRestante();
    if (mins > 0) {
      Alert.alert('Bloqueado', `Demasiados intentos fallidos. Espera ${mins} minuto(s).`);
      return;
    }
    const { ok } = await verificarPIN(pinSesion);
    if (!ok) {
      Alert.alert('PIN incorrecto', 'Inténtalo de nuevo.');
      setPinSesion('');
      return;
    }
    setSesionAbierta(true);
    setPinSesion('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Configuración</Text>
      </View>

      {/* CIRUJANO */}
      <Section title="Perfil" icon="person-outline">
        <Text style={styles.label}>Mi nombre (cirujano activo)</Text>
        <TextInput style={styles.input} value={cirujano} onChangeText={setCirujano}
          placeholder="Nombre del cirujano" placeholderTextColor={Colors.textSecondary} />
        <PrimaryBtn label="Guardar perfil" onPress={guardarConfig} />
      </Section>

      {/* API KEY */}
      <Section title="API Key Anthropic" icon="key-outline">
        <Text style={styles.hint}>Necesaria para el OCR con Claude Vision. Se guarda cifrada en el dispositivo.</Text>
        <TextInput
          style={styles.input}
          value={pinActual}
          onChangeText={setPinActual}
          placeholder="sk-ant-api03-…"
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={!mostrarApiKey}
          autoCapitalize="none"
        />
        <View style={styles.rowSwitch}>
          <Text style={styles.label}>Mostrar clave</Text>
          <Switch value={mostrarApiKey} onValueChange={setMostrarApiKey} trackColor={{ true: Colors.primary }} />
        </View>
        <PrimaryBtn label="Guardar API Key" onPress={guardarApiKey} />
      </Section>

      {/* SERVIDOR EXCEL */}
      <Section title="Servidor local (Excel)" icon="server-outline">
        <Text style={styles.label}>IP del servidor (red WiFi)</Text>
        <View style={styles.rowInput}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={serverIP}
            onChangeText={setServerIP}
            placeholder="192.168.1.x"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.btnCheck} onPress={checkServer}>
            <Text style={styles.btnCheckText}>Ping</Text>
          </TouchableOpacity>
        </View>
        {serverOnline !== null && (
          <Text style={{ color: serverOnline ? Colors.success : Colors.danger, marginTop: 6, fontSize: 13 }}>
            {serverOnline ? '✅ Servidor online' : '❌ Servidor no disponible'}
          </Text>
        )}
      </Section>

      {/* SERVIDOR OCR OFFLINE */}
      <Section title="OCR offline (Tesseract)" icon="scan-outline">
        <View style={styles.rowSwitch}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Modo offline</Text>
            <Text style={styles.hint}>Sin internet: usa Tesseract local en lugar de Claude Vision</Text>
          </View>
          <Switch
            value={offlineMode}
            onValueChange={async (v) => {
              setOfflineMode(v);
              await SecureStore.setItemAsync(OFFLINE_KEY, v ? '1' : '0');
            }}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        <Text style={styles.label}>IP:puerto del servidor OCR</Text>
        <Text style={styles.hint}>Ejecuta ./start.sh en el PC. Puerto por defecto: 8765</Text>
        <View style={styles.rowInput}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={ocrServerIP}
            onChangeText={setOcrServerIP}
            placeholder="192.168.1.x:8765"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="default"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.btnCheck} onPress={checkOcrServer}>
            <Text style={styles.btnCheckText}>Ping</Text>
          </TouchableOpacity>
        </View>
        {ocrServerOnline !== null && (
          <Text style={{ color: ocrServerOnline ? Colors.success : Colors.danger, marginTop: 6, fontSize: 13 }}>
            {ocrServerOnline ? '✅ Servidor OCR online' : '❌ Servidor OCR no disponible'}
          </Text>
        )}
        <PrimaryBtn label="Guardar configuración OCR" onPress={guardarConfig} />
      </Section>

      {/* EXPORT */}
      <Section title="Exportar base de datos" icon="download-outline">
        <Text style={styles.hint}>Genera un .xlsx con 6 hojas (anonimizado) y lo sube al servidor local.</Text>
        <TouchableOpacity
          style={[styles.btnExport, exporting && styles.btnDisabled]}
          onPress={exportarYSubir}
          disabled={exporting}
        >
          {exporting ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
          <Text style={styles.btnExportText}>{exporting ? 'Generando…' : '📤 Exportar Excel y subir'}</Text>
        </TouchableOpacity>
      </Section>

      {/* PIN MAESTRO */}
      <Section title="PIN maestro" icon="lock-closed-outline">
        <Text style={styles.hint}>
          {pinConfig ? '✅ PIN configurado. Modifica aquí para cambiarlo.' : '⚠️ Sin PIN. Configúralo para proteger el acceso a datos identificados.'}
        </Text>
        <Text style={styles.label}>Nuevo PIN</Text>
        <TextInput style={styles.input} value={pinNuevo} onChangeText={setPinNuevo}
          placeholder="Mínimo 4 dígitos" keyboardType="number-pad" secureTextEntry />
        <Text style={styles.label}>Confirmar PIN</Text>
        <TextInput style={styles.input} value={pinConf} onChangeText={setPinConf}
          placeholder="Repite el PIN" keyboardType="number-pad" secureTextEntry />
        <PrimaryBtn label={pinConfig ? 'Cambiar PIN' : 'Configurar PIN'} onPress={crearPin} />
      </Section>

      {/* DATOS IDENTIFICADOS */}
      <Section title="Acceso a datos identificados" icon="eye-outline">
        <Text style={styles.hint}>Introduce el PIN maestro para ver la correspondencia código anón. ↔ NHC.</Text>
        {!sesionAbierta ? (
          <>
            <TextInput
              style={styles.input}
              value={pinSesion}
              onChangeText={setPinSesion}
              placeholder="PIN maestro"
              keyboardType="number-pad"
              secureTextEntry
            />
            <PrimaryBtn label="Desbloquear" onPress={abrirSesionIdentificada} />
          </>
        ) : (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color={Colors.danger} />
            <Text style={styles.warningText}>
              Sesión identificada activa. Los NHCs son datos personales sensibles. Cierra esta vista cuando termines.
            </Text>
          </View>
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PrimaryBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={btnStyles.btn} onPress={onPress} activeOpacity={0.85}>
      <Text style={btnStyles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { paddingBottom: 50 },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title:     { fontSize: 20, fontWeight: '900', color: '#fff' },
  label:     { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  hint:      { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    marginBottom: 14,
  },
  rowSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rowInput:  { flexDirection: 'row', gap: 10, marginBottom: 8 },
  btnCheck: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  btnCheckText: { color: '#fff', fontWeight: '700' },
  btnExport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingVertical: 14,
  },
  btnExportText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnDisabled:   { opacity: 0.5 },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
  },
  warningText: { flex: 1, fontSize: 12, color: Colors.danger, lineHeight: 18 },
});

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  title:  { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
});

const btnStyles = StyleSheet.create({
  btn:  { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  text: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
