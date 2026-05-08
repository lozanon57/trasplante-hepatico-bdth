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
import { guardarReceptorImplante, obtenerReceptorImplante } from '../../../lib/db/queries';
import { generarAlertas } from '../../../lib/alerts/checker';
import {
  Colors,
  OPTIONS_SINO, OPTIONS_PERFUSION, OPTIONS_SINDROME_REP,
  OPTIONS_TECNICA, OPTIONS_VB_TECNICA, OPTIONS_HOPE_TIPO,
  OPTIONS_HEPATOPATIA, TIMEPOINTS_INTRAOP, COLS_INTRAOP,
} from '../../../constants/variables';
import * as ImagePicker from 'expo-image-picker';
import { extractFromImage } from '../../../lib/ocr/claude-vision';

type FormData = Record<string, string | number | null>;

type IntraopRow = {
  produc: string; bilis: string; flujo_arteria: string;
  flujo_porta: string; correc: string; bicarb: string; aspect_higado: string;
};

function defaultIntraop(): Record<string, IntraopRow> {
  const obj: Record<string, IntraopRow> = {};
  for (const tp of TIMEPOINTS_INTRAOP) {
    obj[tp] = { produc: '', bilis: '', flujo_arteria: '', flujo_porta: '', correc: '', bicarb: '', aspect_higado: '' };
  }
  return obj;
}

export default function FormularioImplante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tid = parseInt(id, 10);

  const [form, setForm]       = useState<FormData>({});
  const [serieIntraop, setSerieIntraop] = useState<Record<string, Record<string, string>>>(defaultIntraop());
  const [loading, setLoading]   = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    const r = obtenerReceptorImplante(tid);
    if (r) {
      const { id: _id, trasplante_id: _tid, serie_intraop_json, ...rest } = r;
      setForm(rest as FormData);
      if (serie_intraop_json) {
        try {
          const parsed = JSON.parse(serie_intraop_json) as Array<Record<string, unknown>>;
          const obj: Record<string, Record<string, string>> = {};
          for (const row of parsed) {
            const tp = String(row.timepoint);
            obj[tp] = {};
            for (const [k, v] of Object.entries(row)) {
              if (k !== 'timepoint') obj[tp][k] = v !== null && v !== undefined ? String(v) : '';
            }
          }
          setSerieIntraop(prev => ({ ...prev, ...obj }));
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
      const data = await extractFromImage(base64, mime, 'receptor_implante');
      const updates: FormData = {};
      for (const [k, v] of Object.entries(data)) {
        if (k === 'serie_intraop' && Array.isArray(v)) {
          const obj: Record<string, Record<string, string>> = {};
          for (const row of v as Array<Record<string, unknown>>) {
            const tp = String(row.timepoint);
            obj[tp] = {};
            for (const [rk, rv] of Object.entries(row)) {
              if (rk !== 'timepoint') obj[tp][rk] = rv !== null ? String(rv) : '';
            }
          }
          setSerieIntraop(prev => ({ ...prev, ...obj }));
        } else if (typeof v === 'number' || typeof v === 'string' || v === null) {
          updates[k] = v as any;
        }
      }
      setForm(prev => ({ ...prev, ...updates }));
      Alert.alert('✅ OCR completado', `${Object.values(updates).filter(Boolean).length} campos extraídos. Revisa y corrige.`);
    } catch (err) {
      Alert.alert('Error OCR', (err as Error).message);
    } finally {
      setOcrLoading(false);
    }
  };

  const guardar = async () => {
    setLoading(true);
    try {
      // Serializar serie intraop como JSON
      const serieArr = TIMEPOINTS_INTRAOP.map(tp => ({
        timepoint: tp,
        ...Object.fromEntries(
          Object.entries(serieIntraop[tp] ?? {}).map(([k, v]) => [k, v ? parseFloat(v) || v : null])
        ),
      }));

      const numericFields = ['edad','peso_kg','talla_cm','meld','peso_injerto',
        'flujo_portal','flujo_arterial','t_isquemia_fria','t_preservacion_hope',
        't_isquemia_caliente','t_isquemia_total','pdr',
        'hope_tiempo_min','hope_flujo','hope_presion','hope_po2',
        'as_alt','as_ast','as_cr','as_plaq','as_ggt','as_inr','as_bi'];
      const cleanForm: FormData = { ...form };
      for (const f of numericFields) {
        if (cleanForm[f] !== null && cleanForm[f] !== undefined && cleanForm[f] !== '') {
          cleanForm[f] = parseFloat(String(cleanForm[f])) || null;
        }
      }

      guardarReceptorImplante({
        trasplante_id: tid,
        ...cleanForm,
        serie_intraop_json: JSON.stringify(serieArr),
      } as any);

      await generarAlertas(tid);

      Alert.alert('✅ Guardado', 'Datos de implante guardados.', [
        { text: 'Ir a Postoperatorio', onPress: () => router.push(`/paciente/${tid}/postoperatorio`) },
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
        <View style={[styles.sectionHeader, { backgroundColor: Colors.sectionImplante }]}>
          <TouchableOpacity onPress={() => router.push(`/paciente/${tid}/donante`)}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>🫀 RECEPTOR + IMPLANTE — Pág.2</Text>
          <TouchableOpacity onPress={() => router.push(`/paciente/${tid}/postoperatorio`)}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.block}>
          <OCRButton onCamera={handleCamera} onGallery={handleGallery} loading={ocrLoading} />
        </View>

        {/* DATOS RECEPTOR */}
        <Block title="Datos del receptor" color={Colors.sectionImplante}>
          <FormField label="NHC receptor" value={String(form.nhc_receptor ?? '')} onChangeText={v=>set('nhc_receptor',v)} />
          <RadioGroup label="Sexo" options={[{label:'Hombre',value:0},{label:'Mujer',value:1}]} value={form.sexo as number} onChange={v=>set('sexo',v)} />
          <FormField label="Edad" value={String(form.edad ?? '')} onChangeText={v=>set('edad',v)} keyboardType="decimal-pad" />
          <FormField label="Peso (kg)" value={String(form.peso_kg ?? '')} onChangeText={v=>set('peso_kg',v)} keyboardType="decimal-pad" />
          <FormField label="Talla (cm)" value={String(form.talla_cm ?? '')} onChangeText={v=>set('talla_cm',v)} keyboardType="decimal-pad" />
          <RadioGroup label="Origen hepatopatía" options={OPTIONS_HEPATOPATIA.map(v=>({label:v,value:v}))} value={form.origen_hepatopatia as string} onChange={v=>set('origen_hepatopatia',v)} />
          <RadioGroup label="CHC"     options={OPTIONS_SINO} value={form.chc as number}    onChange={v=>set('chc',v)} />
          <RadioGroup label="HTA"     options={OPTIONS_SINO} value={form.fr_hta as number} onChange={v=>set('fr_hta',v)} />
          <RadioGroup label="DM"      options={OPTIONS_SINO} value={form.fr_dm as number}  onChange={v=>set('fr_dm',v)} />
          <RadioGroup label="DL"      options={OPTIONS_SINO} value={form.fr_dl as number}  onChange={v=>set('fr_dl',v)} />
          <RadioGroup label="Alcohol" options={OPTIONS_SINO} value={form.oh as number}     onChange={v=>set('oh',v)} />
          <FormField label="MELD" value={String(form.meld ?? '')} onChangeText={v=>set('meld',v)} keyboardType="decimal-pad" required />
          <FormField label="Indicación THO" value={String(form.indicacion_tho ?? '')} onChangeText={v=>set('indicacion_tho',v)} />
        </Block>

        {/* AS BASAL RECEPTOR */}
        <Block title="Analítica basal receptor" color={Colors.sectionImplante}>
          <FormField label="ALT (U/L)"   value={String(form.as_alt ?? '')}  onChangeText={v=>set('as_alt',v)}  keyboardType="decimal-pad" />
          <FormField label="AST (U/L)"   value={String(form.as_ast ?? '')}  onChangeText={v=>set('as_ast',v)}  keyboardType="decimal-pad" />
          <FormField label="Cr (mg/dL)"  value={String(form.as_cr ?? '')}   onChangeText={v=>set('as_cr',v)}   keyboardType="decimal-pad" />
          <FormField label="Plaq (×10³)" value={String(form.as_plaq ?? '')} onChangeText={v=>set('as_plaq',v)} keyboardType="decimal-pad" />
          <FormField label="GGT (U/L)"   value={String(form.as_ggt ?? '')}  onChangeText={v=>set('as_ggt',v)}  keyboardType="decimal-pad" />
          <FormField label="INR"         value={String(form.as_inr ?? '')}  onChangeText={v=>set('as_inr',v)}  keyboardType="decimal-pad" />
          <FormField label="Bi (mg/dL)"  value={String(form.as_bi ?? '')}   onChangeText={v=>set('as_bi',v)}   keyboardType="decimal-pad" />
        </Block>

        {/* IMPLANTE */}
        <Block title="Datos del implante" color={Colors.sectionImplante}>
          <RadioGroup label="Alerta cero"           options={OPTIONS_SINO}           value={form.alerta_cero as number}          onChange={v=>set('alerta_cero',v)} />
          <RadioGroup label="Técnica"               options={OPTIONS_TECNICA}        value={form.tecnica as number}              onChange={v=>set('tecnica',v)} required />
          <RadioGroup label="Calidad reperfusión"   options={OPTIONS_PERFUSION}      value={form.reperfusion as number}          onChange={v=>set('reperfusion',v)} required />
          <RadioGroup label="Sínd. reperfusión"     options={OPTIONS_SINDROME_REP}   value={form.sindrome_reperfusion as number} onChange={v=>set('sindrome_reperfusion',v)} />
          <RadioGroup label="Técnica vía biliar"    options={OPTIONS_VB_TECNICA}     value={form.vb_tecnica as number}          onChange={v=>set('vb_tecnica',v)} required />
          <FormField label="Peso injerto (g)"       value={String(form.peso_injerto ?? '')}        onChangeText={v=>set('peso_injerto',v)}       keyboardType="decimal-pad" />
          <FormField label="Flujo portal (mL/min)"  value={String(form.flujo_portal ?? '')}        onChangeText={v=>set('flujo_portal',v)}       keyboardType="decimal-pad" />
          <FormField label="Flujo arterial (mL/min)"value={String(form.flujo_arterial ?? '')}      onChangeText={v=>set('flujo_arterial',v)}     keyboardType="decimal-pad" />
          <FormField label="T. Isquemia fría (min)" value={String(form.t_isquemia_fria ?? '')}     onChangeText={v=>set('t_isquemia_fria',v)}    keyboardType="decimal-pad" required />
          <FormField label="T. Preservación HOPE (min)" value={String(form.t_preservacion_hope ?? '')} onChangeText={v=>set('t_preservacion_hope',v)} keyboardType="decimal-pad" />
          <FormField label="T. Isquemia caliente (min)" value={String(form.t_isquemia_caliente ?? '')} onChangeText={v=>set('t_isquemia_caliente',v)} keyboardType="decimal-pad" />
          <FormField label="T. Isquemia total (min)"value={String(form.t_isquemia_total ?? '')}    onChangeText={v=>set('t_isquemia_total',v)}   keyboardType="decimal-pad" required />
          <RadioGroup label="Re-THO" options={OPTIONS_SINO} value={form.retho as number} onChange={v=>set('retho',v)} />
          <FormField label="PDR (%)" value={String(form.pdr ?? '')} onChangeText={v=>set('pdr',v)} keyboardType="decimal-pad" />
        </Block>

        {/* SERIE INTRAOPERATORIA */}
        <Block title="Serie intraoperatoria (NMP)" color={Colors.sectionImplante}>
          <SerieTemporalTable
            title="BASAL → +8H → FIN"
            rowHeaders={TIMEPOINTS_INTRAOP}
            columns={COLS_INTRAOP}
            data={serieIntraop}
            onChange={(tp, col, val) => setSerieIntraop(prev => ({
              ...prev, [tp]: { ...(prev[tp] ?? {}), [col]: val }
            }))}
            rowLabel="Tiempo"
          />
        </Block>

        {/* HOPE */}
        <Block title="Perfusión hipotérmica (HOPE)" color={Colors.sectionImplante}>
          <FormField label="Hora inicio"  value={String(form.hope_hora_inicio ?? '')} onChangeText={v=>set('hope_hora_inicio',v)} placeholder="HH:MM" />
          <FormField label="Hora fin"     value={String(form.hope_hora_fin ?? '')}    onChangeText={v=>set('hope_hora_fin',v)}    placeholder="HH:MM" />
          <FormField label="Duración (min)" value={String(form.hope_tiempo_min ?? '')} onChangeText={v=>set('hope_tiempo_min',v)} keyboardType="decimal-pad" />
          <RadioGroup label="Causa indicación" options={['DCD','Logística_THO','Logística_receptor','Otros'].map(v=>({label:v,value:v}))} value={form.hope_causa as string} onChange={v=>set('hope_causa',v)} />
          <RadioGroup label="Tipo HOPE" options={OPTIONS_HOPE_TIPO} value={form.hope_tipo as number} onChange={v=>set('hope_tipo',v)} />
          <FormField label="Flujo (mL/min)"  value={String(form.hope_flujo ?? '')}    onChangeText={v=>set('hope_flujo',v)}    keyboardType="decimal-pad" />
          <FormField label="Presión (mmHg)"  value={String(form.hope_presion ?? '')}  onChangeText={v=>set('hope_presion',v)}  keyboardType="decimal-pad" />
          <FormField label="PO₂"             value={String(form.hope_po2 ?? '')}      onChangeText={v=>set('hope_po2',v)}      keyboardType="decimal-pad" />
        </Block>

        <TouchableOpacity
          style={[styles.btnSave, loading && styles.btnDisabled]}
          onPress={guardar}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.btnSaveText}>{loading ? 'Guardando…' : 'Guardar implante'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Block({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <View style={blockStyles.container}>
      <Text style={[blockStyles.title, { color: color ?? Colors.sectionImplante }]}>{title}</Text>
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
  title: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
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
    backgroundColor: Colors.sectionImplante,
    borderRadius: 12,
    paddingVertical: 16,
    margin: 16,
  },
  btnDisabled:  { opacity: 0.5 },
  btnSaveText:  { fontSize: 16, fontWeight: '800', color: '#fff' },
});
