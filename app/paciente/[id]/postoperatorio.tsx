import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '../../../components/FormField';
import { RadioGroup } from '../../../components/RadioGroup';
import { SerieTemporalTable } from '../../../components/SerieTemporalTable';
import { OCRButton } from '../../../components/OCRButton';
import { guardarPostoperatorio, obtenerPostoperatorio } from '../../../lib/db/queries';
import { generarAlertas } from '../../../lib/alerts/checker';
import { Colors, OPTIONS_SINO, COLS_DPO } from '../../../constants/variables';
import * as ImagePicker from 'expo-image-picker';
import { extractFromImage, parseFechaFormulario, formatFecha } from '../../../lib/ocr/claude-vision';

type FormData = Record<string, string | number | null>;

const CLAVIEN_OPTIONS = [
  {label:'0 — Sin compl.',value:0},{label:'I',value:1},{label:'II',value:2},
  {label:'IIIa',value:3},{label:'IIIb',value:4},{label:'IV',value:5},{label:'V',value:6},
];

function defaultDPO(): Record<string, Record<string, string>> {
  const obj: Record<string, Record<string, string>> = {};
  for (let d = 1; d <= 7; d++) {
    obj[String(d)] = { bi: '', inr: '', alt: '', ast: '', ggt: '', fa: '', crea: '' };
  }
  return obj;
}

export default function FormularioPostoperatorio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tid = parseInt(id, 10);

  const [form, setForm]         = useState<FormData>({});
  const [serieDPO, setSerieDPO] = useState<Record<string, Record<string, string>>>(defaultDPO());
  const [loading, setLoading]   = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    const p = obtenerPostoperatorio(tid);
    if (p) {
      const { id: _id, trasplante_id: _tid, serie_dpo_json, ...rest } = p;
      setForm(rest as FormData);
      if (serie_dpo_json) {
        try {
          const rows = JSON.parse(serie_dpo_json) as Array<{ dia: number } & Record<string, unknown>>;
          const obj: Record<string, Record<string, string>> = {};
          for (const row of rows) {
            const key = String(row.dia);
            obj[key] = {};
            for (const [k, v] of Object.entries(row)) {
              if (k !== 'dia') obj[key][k] = v !== null ? String(v) : '';
            }
          }
          setSerieDPO(prev => ({ ...prev, ...obj }));
        } catch {}
      }
    }
  }, [tid]);

  const set = (key: string, val: string | number | null) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso denegado'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.85 });
    if (!result.canceled && result.assets[0].base64) processOCR(result.assets[0].base64, 'image/jpeg');
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.85 });
    if (!result.canceled && result.assets[0].base64) processOCR(result.assets[0].base64, 'image/jpeg');
  };

  const processOCR = async (base64: string, mime: 'image/jpeg' | 'image/png') => {
    setOcrLoading(true);
    try {
      const data = await extractFromImage(base64, mime, 'postoperatorio');
      const updates: FormData = {};
      for (const [k, v] of Object.entries(data)) {
        if (k === 'serie_dpo' && Array.isArray(v)) {
          const obj: Record<string, Record<string, string>> = {};
          for (const row of v as Array<{ dia: number } & Record<string, unknown>>) {
            const key = String(row.dia);
            obj[key] = {};
            for (const [rk, rv] of Object.entries(row)) {
              if (rk !== 'dia') obj[key][rk] = rv !== null ? String(rv) : '';
            }
          }
          setSerieDPO(prev => ({ ...prev, ...obj }));
        } else if (typeof v === 'string' && (k.endsWith('_fecha') || k === 'fecha_alta')) {
          updates[k] = parseFechaFormulario(v);
        } else if (typeof v === 'number' || typeof v === 'string' || v === null) {
          updates[k] = v as any;
        }
      }
      setForm(prev => ({ ...prev, ...updates }));
      Alert.alert('✅ OCR completado', `${Object.values(updates).filter(Boolean).length} campos extraídos.`);
    } catch (err) {
      Alert.alert('Error OCR', (err as Error).message);
    } finally {
      setOcrLoading(false);
    }
  };

  const guardar = async () => {
    setLoading(true);
    try {
      const dpoArr = Array.from({ length: 7 }, (_, i) => ({
        dia: i + 1,
        ...Object.fromEntries(
          Object.entries(serieDPO[String(i + 1)] ?? {}).map(([k, v]) => [k, v ? parseFloat(v) || null : null])
        ),
      }));

      const numericFields = ['pico_alt','pico_ast','pico_ggt','pico_inr','pico_cr','pico_plaq','pico_bi',
        'dias_estancia_total','dias_estancia_rea'];
      const dateFields = ['fecha_alta','reintervencion_fecha','exitus_7d_fecha','exitus_30d_fecha',
        'perdida_injerto_fecha','retrasplante_fecha','fecha_ultima_revision',
        'colangiopatia_intrahepatica_fecha','colangiopatia_fecha','estenosis_anastomosis_fecha'];

      const cleanForm: FormData = { ...form };
      for (const f of numericFields) {
        if (cleanForm[f]) cleanForm[f] = parseFloat(String(cleanForm[f])) || null;
      }

      guardarPostoperatorio({
        trasplante_id: tid,
        ...cleanForm,
        serie_dpo_json: JSON.stringify(dpoArr),
      } as any);

      await generarAlertas(tid);

      Alert.alert('✅ Guardado', 'Datos postoperatorios guardados.', [
        { text: 'Ir al Dashboard', onPress: () => router.push('/') },
        { text: 'Aceptar' },
      ]);
    } catch (err) {
      Alert.alert('Error al guardar', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.sectionHeader, { backgroundColor: Colors.sectionPostop }]}>
          <TouchableOpacity onPress={() => router.push(`/paciente/${tid}/implante`)}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>🏥 POSTOPERATORIO — Pág.3</Text>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Ionicons name="home-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.block}>
          <OCRButton onCamera={handleCamera} onGallery={handleGallery} loading={ocrLoading} />
        </View>

        {/* PICO ANALÍTICA */}
        <Block title="AS pico receptor — primeros 7 días">
          <FormField label="Pico ALT (U/L)"  value={String(form.pico_alt ?? '')}  onChangeText={v=>set('pico_alt',v)}  keyboardType="decimal-pad" />
          <FormField label="Pico AST (U/L)"  value={String(form.pico_ast ?? '')}  onChangeText={v=>set('pico_ast',v)}  keyboardType="decimal-pad" />
          <FormField label="Pico GGT (U/L)"  value={String(form.pico_ggt ?? '')}  onChangeText={v=>set('pico_ggt',v)}  keyboardType="decimal-pad" />
          <FormField label="Pico INR"        value={String(form.pico_inr ?? '')}  onChangeText={v=>set('pico_inr',v)}  keyboardType="decimal-pad" />
          <FormField label="Pico Cr (mg/dL)" value={String(form.pico_cr ?? '')}   onChangeText={v=>set('pico_cr',v)}   keyboardType="decimal-pad" />
          <FormField label="Pico Plaq"       value={String(form.pico_plaq ?? '')} onChangeText={v=>set('pico_plaq',v)} keyboardType="decimal-pad" />
          <FormField label="Pico Bi (mg/dL)" value={String(form.pico_bi ?? '')}   onChangeText={v=>set('pico_bi',v)}   keyboardType="decimal-pad" />
        </Block>

        {/* DISFUNCIÓN PRIMARIA */}
        <Block title="Disfunción primaria (Olthoff)">
          <RadioGroup label="Disfunción primaria 7º DPO" options={OPTIONS_SINO} value={form.disfuncion_olthoff_7dpo as number} onChange={v=>set('disfuncion_olthoff_7dpo',v)} />
          <RadioGroup label="Bi > 10 mg/dL día 7"        options={OPTIONS_SINO} value={form.bi_mayor_10 as number}             onChange={v=>set('bi_mayor_10',v)} />
          <RadioGroup label="INR > 1.6 día 7"            options={OPTIONS_SINO} value={form.inr_mayor_16 as number}            onChange={v=>set('inr_mayor_16',v)} />
          <RadioGroup label="ALT/AST > 2000 U/L en 7d"  options={OPTIONS_SINO} value={form.alt_ast_mayor_2000 as number}      onChange={v=>set('alt_ast_mayor_2000',v)} />
        </Block>

        {/* SERIE DPO */}
        <Block title="Serie 1º–7º DPO">
          <SerieTemporalTable
            title="Evolución analítica diaria postoperatoria"
            rowHeaders={['1','2','3','4','5','6','7']}
            columns={COLS_DPO}
            data={serieDPO}
            onChange={(dia, col, val) => setSerieDPO(prev => ({
              ...prev, [dia]: { ...(prev[dia] ?? {}), [col]: val }
            }))}
            rowLabel="Día"
          />
        </Block>

        {/* COMPLICACIONES QUIRÚRGICAS */}
        <Block title="Complicaciones quirúrgicas">
          <RadioGroup label="Sangrado postoperatorio" options={OPTIONS_SINO} value={form.sangrado as number} onChange={v=>set('sangrado',v)} />
          <RadioGroup label="Reintervención"          options={OPTIONS_SINO} value={form.reintervencion as number} onChange={v=>set('reintervencion',v)} />
          <FormField label="Causa reintervención" value={String(form.reintervencion_causa ?? '')} onChangeText={v=>set('reintervencion_causa',v)} />
        </Block>

        {/* ALTA */}
        <Block title="Alta hospitalaria">
          <FormField label="Fecha de alta (DD/MM/AAAA)" value={form.fecha_alta ? formatFecha(form.fecha_alta as number) : ''} onChangeText={v => set('fecha_alta', parseFechaFormulario(v))} placeholder="DD/MM/AAAA" />
          <FormField label="Estancia total (días)" value={String(form.dias_estancia_total ?? '')} onChangeText={v=>set('dias_estancia_total',v)} keyboardType="number-pad" required />
          <FormField label="Estancia REA (días)"   value={String(form.dias_estancia_rea ?? '')}   onChangeText={v=>set('dias_estancia_rea',v)}   keyboardType="number-pad" />
        </Block>

        {/* COMPLICACIONES PO */}
        <Block title="Morbilidad postoperatoria">
          <RadioGroup label="Complicaciones PO"    options={OPTIONS_SINO}    value={form.complicaciones_po as number} onChange={v=>set('complicaciones_po',v)} required />
          <RadioGroup label="Clavien-Dindo"        options={CLAVIEN_OPTIONS} value={form.clavien_dindo as number}    onChange={v=>set('clavien_dindo',v)} required />
          <RadioGroup label="EAD (Olthoff)"        options={OPTIONS_SINO}    value={form.ead_olthoff as number}      onChange={v=>set('ead_olthoff',v)} />
          <RadioGroup label="PNF"                  options={OPTIONS_SINO}    value={form.pnf as number}              onChange={v=>set('pnf',v)} />
          <RadioGroup label="Trombosis arterial"   options={OPTIONS_SINO}    value={form.trombosis_arterial as number} onChange={v=>set('trombosis_arterial',v)} />
          <RadioGroup label="Complicación biliar"  options={OPTIONS_SINO}    value={form.complicacion_biliar as number} onChange={v=>set('complicacion_biliar',v)} />
          <RadioGroup label="Estenosis biliar no anastomótica" options={OPTIONS_SINO} value={form.estenosis_biliar_no_anast as number} onChange={v=>set('estenosis_biliar_no_anast',v)} />
          <RadioGroup label="Fuga biliar"          options={OPTIONS_SINO}    value={form.fuga_biliar as number}      onChange={v=>set('fuga_biliar',v)} />
          <RadioGroup label="Rechazo agudo"        options={OPTIONS_SINO}    value={form.rechazo_agudo as number}    onChange={v=>set('rechazo_agudo',v)} />
        </Block>

        {/* SEGUIMIENTO */}
        <Block title="Seguimiento a largo plazo">
          <FormField label="Fecha última revisión" value={form.fecha_ultima_revision ? formatFecha(form.fecha_ultima_revision as number) : ''} onChangeText={v=>set('fecha_ultima_revision', parseFechaFormulario(v))} placeholder="DD/MM/AAAA" />
          <RadioGroup label="Éxitus"              options={OPTIONS_SINO} value={form.exitus_global as number} onChange={v=>set('exitus_global',v)} />
          <RadioGroup label="Éxitus 7 días"       options={OPTIONS_SINO} value={form.exitus_7d as number}     onChange={v=>set('exitus_7d',v)} />
          <FormField label="Fecha éxitus 7d"      value={form.exitus_7d_fecha ? formatFecha(form.exitus_7d_fecha as number) : ''} onChangeText={v=>set('exitus_7d_fecha', parseFechaFormulario(v))} placeholder="DD/MM/AAAA" />
          <FormField label="Causa éxitus 7d"      value={String(form.exitus_7d_causa ?? '')} onChangeText={v=>set('exitus_7d_causa',v)} />
          <RadioGroup label="Éxitus 30 días"      options={OPTIONS_SINO} value={form.exitus_30d as number}    onChange={v=>set('exitus_30d',v)} />
          <FormField label="Fecha éxitus 30d"     value={form.exitus_30d_fecha ? formatFecha(form.exitus_30d_fecha as number) : ''} onChangeText={v=>set('exitus_30d_fecha', parseFechaFormulario(v))} placeholder="DD/MM/AAAA" />
          <FormField label="Causa éxitus 30d"     value={String(form.exitus_30d_causa ?? '')} onChangeText={v=>set('exitus_30d_causa',v)} />
          <RadioGroup label="Pérdida de injerto"  options={OPTIONS_SINO} value={form.perdida_injerto as number} onChange={v=>set('perdida_injerto',v)} />
          <FormField label="Causa pérdida injerto" value={String(form.causa_perdida_injerto ?? '')} onChangeText={v=>set('causa_perdida_injerto',v)} />
          <RadioGroup label="Retrasplante"         options={OPTIONS_SINO} value={form.retrasplante as number}  onChange={v=>set('retrasplante',v)} />
          <FormField label="Causa retrasplante"    value={String(form.causa_retrasplante ?? '')} onChangeText={v=>set('causa_retrasplante',v)} />
          <RadioGroup label="RM 6 meses"           options={OPTIONS_SINO} value={form.rm_6meses as number}    onChange={v=>set('rm_6meses',v)} />
          <RadioGroup label="Colangiopatía intrahepática" options={OPTIONS_SINO} value={form.colangiopatia_intrahepatica as number} onChange={v=>set('colangiopatia_intrahepatica',v)} />
          <RadioGroup label="Colangiopatía"         options={OPTIONS_SINO} value={form.colangiopatia as number} onChange={v=>set('colangiopatia',v)} />
          <RadioGroup label="Estenosis anastomosis" options={OPTIONS_SINO} value={form.estenosis_anastomosis as number} onChange={v=>set('estenosis_anastomosis',v)} />
        </Block>

        <TouchableOpacity
          style={[styles.btnSave, loading && styles.btnDisabled]}
          onPress={guardar}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.btnSaveText}>{loading ? 'Guardando…' : 'Guardar y cerrar caso'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={blockStyles.container}>
      <Text style={blockStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const blockStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 14, fontWeight: '800', color: Colors.sectionPostop, marginBottom: 12 },
});

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  content:       { paddingBottom: 60 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 52,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#fff', flex: 1, textAlign: 'center' },
  block:        { padding: 12 },
  btnSave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.sectionPostop,
    borderRadius: 12,
    paddingVertical: 16,
    margin: 16,
  },
  btnDisabled:  { opacity: 0.5 },
  btnSaveText:  { fontSize: 16, fontWeight: '800', color: '#fff' },
});
