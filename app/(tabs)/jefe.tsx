import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { apiFetch } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/context';
import { Colors } from '../../constants/variables';
import { router } from 'expo-router';

// ── tipos ─────────────────────────────────────────────────────────────────────
interface Usuario { id: number; nombre: string; email: string; rol: string; activo: boolean }
interface CasoResumen { id: number; codigo_anon: string; nhc: string; cirujano: string; estado: string; fecha_trasplante: number | null }

type Tab = 'nhc' | 'usuarios' | 'integridad';

// ── componente principal ──────────────────────────────────────────────────────
export default function JefePanel() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>('nhc');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔐 Panel de Jefatura</Text>
        <TouchableOpacity onPress={async () => { await logout(); router.replace('/login'); }}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {([['nhc','🔍 NHC'],['usuarios','👥 Usuarios'],['integridad','🛡️ Integridad']] as [Tab,string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'nhc'        && <BuscarNHC />}
      {tab === 'usuarios'   && <GestionUsuarios />}
      {tab === 'integridad' && <VerificarIntegridad />}
    </View>
  );
}

// ── Búsqueda por NHC ──────────────────────────────────────────────────────────
function BuscarNHC() {
  const [nhc,      setNhc]     = useState('');
  const [result,   setResult]  = useState<{ paciente: { nhc: string; codigo_anon: string }; casos: CasoResumen[] } | null>(null);
  const [loading,  setLoading] = useState(false);

  async function buscar() {
    if (!nhc.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/casos/buscar?nhc=${encodeURIComponent(nhc.trim())}`);
      if (res.status === 404) { Alert.alert('No encontrado', 'No existe ningún caso con ese NHC'); setResult(null); return; }
      if (!res.ok) throw new Error('Error del servidor');
      setResult(await res.json());
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally     { setLoading(false); }
  }

  return (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Buscar paciente por NHC</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="NHC del paciente"
          placeholderTextColor={Colors.textSecondary}
          value={nhc} onChangeText={setNhc}
          autoCapitalize="characters"
          onSubmitEditing={buscar}
        />
        <TouchableOpacity style={styles.btnSmall} onPress={buscar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnSmallText}>Buscar</Text>}
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultNHC}>NHC: {result.paciente.nhc}</Text>
          <Text style={styles.resultSub}>Código anónimo: {result.paciente.codigo_anon}</Text>
          <Text style={styles.resultSub}>{result.casos.length} trasplante(s) registrado(s)</Text>
          {result.casos.map(c => (
            <View key={c.id} style={styles.casoRow}>
              <Text style={styles.casoTexto}>
                {c.fecha_trasplante ? new Date(c.fecha_trasplante).toLocaleDateString('es-ES') : '—'}
                {'  '}· {c.cirujano}{'  '}· {c.estado}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Gestión de usuarios ───────────────────────────────────────────────────────
function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [rol,      setRol]      = useState<'cirujano'|'jefe'>('cirujano');

  async function cargar() {
    setLoading(true);
    try {
      const res = await apiFetch('/usuarios');
      if (res.ok) setUsuarios(await res.json());
    } finally { setLoading(false); }
  }

  async function crear() {
    if (!nombre || !email || !password) return Alert.alert('Campos vacíos');
    const res = await apiFetch('/usuarios', {
      method: 'POST',
      body: JSON.stringify({ nombre, email, password, rol }),
    });
    if (res.ok) { Alert.alert('✅ Usuario creado'); setNombre(''); setEmail(''); setPassword(''); cargar(); }
    else { const e = await res.json(); Alert.alert('Error', e.error); }
  }

  async function toggleActivo(u: Usuario) {
    await apiFetch(`/usuarios/${u.id}/activo`, { method: 'PATCH', body: JSON.stringify({ activo: !u.activo }) });
    cargar();
  }

  React.useEffect(() => { cargar(); }, []);

  return (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Nuevo usuario</Text>
      <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={Colors.textSecondary} value={nombre} onChangeText={setNombre} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor={Colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />
      <View style={styles.row}>
        {(['cirujano','jefe'] as const).map(r => (
          <TouchableOpacity key={r} style={[styles.rolBtn, rol === r && styles.rolBtnActive]} onPress={() => setRol(r)}>
            <Text style={[styles.rolText, rol === r && { color: '#fff' }]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.btn} onPress={crear}><Text style={styles.btnText}>Crear usuario</Text></TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Usuarios activos</Text>
      {loading && <ActivityIndicator color={Colors.primary} />}
      {usuarios.map(u => (
        <View key={u.id} style={styles.usuarioRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.usuarioNombre}>{u.nombre}</Text>
            <Text style={styles.usuarioEmail}>{u.email} · {u.rol}</Text>
          </View>
          <TouchableOpacity style={[styles.toggleBtn, !u.activo && styles.toggleBtnOff]} onPress={() => toggleActivo(u)}>
            <Text style={styles.toggleText}>{u.activo ? 'Activo' : 'Inactivo'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Verificación de integridad ────────────────────────────────────────────────
function VerificarIntegridad() {
  const [result,  setResult]  = useState<{ ok: boolean; total_registros: number; errores: unknown[]; mensaje: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function verificar() {
    setLoading(true);
    try {
      const res = await apiFetch('/integridad/verificar');
      if (res.ok) setResult(await res.json());
      else Alert.alert('Error', 'No se pudo verificar');
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally     { setLoading(false); }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Verificación de la cadena de hashes</Text>
      <Text style={styles.infoText}>
        Comprueba que ningún registro ha sido modificado directamente en la base de datos.
        Cada operación genera un hash encadenado que no puede alterarse sin dejar rastro.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={verificar} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verificar integridad</Text>}
      </TouchableOpacity>
      {result && (
        <View style={[styles.resultCard, { borderLeftColor: result.ok ? Colors.success : Colors.danger, borderLeftWidth: 4 }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: result.ok ? Colors.success : Colors.danger }}>
            {result.ok ? '✅ Íntegro' : '⚠️ Anomalías detectadas'}
          </Text>
          <Text style={styles.resultSub}>{result.mensaje}</Text>
          {!result.ok && result.errores.map((e: any, i) => (
            <Text key={i} style={{ color: Colors.danger, fontSize: 12 }}>
              Registro #{e.registro_id} en tabla {e.tabla}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ── estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:    { color: '#fff', fontSize: 18, fontWeight: '800' },
  logoutText:     { color: '#fff', fontSize: 14, opacity: 0.85 },
  tabBar:         { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderColor: Colors.border },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive:   { borderBottomWidth: 3, borderBottomColor: Colors.primary },
  tabLabel:       { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: Colors.primary },
  section:        { flex: 1, padding: 16 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  input:          { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.surface },
  row:            { flexDirection: 'row', gap: 8, marginBottom: 10 },
  btn:            { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 8 },
  btnText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSmall:       { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginLeft: 8, justifyContent: 'center' },
  btnSmallText:   { color: '#fff', fontWeight: '700' },
  resultCard:     { backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginTop: 12 },
  resultNHC:      { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  resultSub:      { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  casoRow:        { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  casoTexto:      { fontSize: 13, color: Colors.textPrimary },
  usuarioRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 8 },
  usuarioNombre:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  usuarioEmail:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  toggleBtn:      { backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnOff:   { backgroundColor: Colors.textSecondary },
  toggleText:     { color: '#fff', fontSize: 12, fontWeight: '700' },
  rolBtn:         { flex: 1, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rolBtnActive:   { backgroundColor: Colors.primary },
  rolText:        { color: Colors.primary, fontWeight: '700' },
  infoText:       { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },
});
