import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, SectionList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '../../../components/FormField';
import { RadioGroup } from '../../../components/RadioGroup';
import { SerieTemporalTable } from '../../../components/SerieTemporalTable';
import { OCRButton } from '../../../components/OCRButton';
import { guardarDonante, obtenerDonante, obtenerTrasplante } from '../../../lib/db/queries';
import { generarAlertas, programarNotificacionesSeguimiento } from '../../../lib/alerts/checker';
import {
  Colors,
  OPTIONS_SINO, OPTIONS_PERFUSION, OPTIONS_ECO_TC,
  OPTIONS_TIPO_DONACION, OPTIONS_PRESERVACION,
  TIMEPOINTS_INTRAOP, COLS_INTRAOP,
} from '../../../constants/variables';
import { captureAndOCR, parseFechaFormulario } from '../../../lib/ocr/capture';

type FormData = Record<string, string | number | null>;

const TP_SANGRE = ['BASAL', '+1H', '+1H30', '+2H'] as const;
const ANALITOS_SANGRE = ['ph', 'lact', 'alt', 'ast', 'ggt', 'bi', 'inr'];

export default function FormularioDonante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tid = parseInt(id, 10);

  const [form, setForm]       = useState<FormData>({});
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [serieSangre, setSerieSangre] = useState<Record<string, Record<string, string>>>({});
  const [serieBilis, setSerieBilis]   = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const d = obtenerDonante(tid);
    if (d) {
      const { id: _id, trasplante_id: _tid, ...rest } = d;
      setForm(rest as FormData);
    }
  }, [tid]);

  const set = (key: string, val: string | number | null) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const onSerieSangreChange = (tp: string, col: string, val: string) =>
    setSerieSangre(prev => ({ ...prev, [tp]: { ...(prev[tp] ?? {}), [col]: val } }));

  const onSerieBilisChange = (tp: string, col: string, val: string) =>
    setSerieBilis(prev => ({ ...prev, [tp]: { ...(prev[tp] ?? {}), [col]: val } }));

  const handleOCR = async (source: 'camera' | 'gallery') => {
    setOcrLoading(true);
    try {
      const result = await captureAndOCR(source, 'donante');
      if (!result) return;
      const updates: FormData = {};
      for (const [k, v] of Object.entries(result.fields)) {
        if (k === 'fecha' && typeof v === 'string') {
          updates['fecha'] = parseFechaFormulario(v);
        } else if (typeof v === 'number' || typeof v === 'string' || v === null) {
          updates[k] = v as any;
        }
      }
      setForm(prev => ({ ...prev, ...updates }));
      const shield = result.headerRedacted ? '🛡️ Cabecera eliminada · ' : '';
      Alert.alert(
        '✅ OCR completado',
        `${shield}${result.fieldCount} campos extraídos. Revisa y corrige si es necesario.`,
      );
    } catch (err) {
      Alert.alert('Error OCR', (err as Error).message);
    } finally {
      setOcrLoading(false);
    }
  };

  const guardar = async () => {
    setLoading(true);
    try {
      // Aplanar series temporales en el form
      const serieFlat: FormData = {};
      for (const tp of TP_SANGRE) {
        const tp_key = tp.replace('+', '').replace('H30', 'h30').toLowerCase().replace('basal', 'basal').replace('h', 'h');
        const prefix = `sangre_${
          tp === 'BASAL' ? 'basal' :
          tp === '+1H'   ? '1h'    :
          tp === '+1H30' ? '1h30'  : '2h'
        }`;
        for (const analito of ANALITOS_SANGRE) {
          const val = serieSangre[tp]?.[analito];
          if (val) serieFlat[`${prefix}_${analito}`] = parseFloat(val);
        }
      }
      const bilisFlat: FormData = {};
      const bilisCols = ['ph','bicarb','lact','alt','ggt','bi','ast','glu','inr'];
      for (const col of bilisCols) {
        const val = serieBilis['+2H']?.[col];
        if (val) bilisFlat[`bilis_2h_${col}`] = parseFloat(val);
      }

      const numericFields = ['edad','peso_kg','talla_cm','as_na','as_alt','as_ast','as_plaq',
        'as_ggt','as_bi','as_cr','dcd_tiempo_ecmo_min','twit_seg','fwit_seg',
        'organos_tiempo_min'];
      const cleanForm: FormData = { ...form };
      for (const f of numericFields) {
        if (cleanForm[f] !== null && cleanForm[f] !== undefined) {
          cleanForm[f] = parseFloat(String(cleanForm[f])) || null;
        }
      }

      guardarDonante({
        trasplante_id: tid,
        ...cleanForm,
        ...serieFlat,
        ...bilisFlat,
      } as any);

      await generarAlertas(tid);

      const tx = obtenerTrasplante(tid);
      if (tx?.fecha_trasplante) {
        const pacs = await import('../../../lib/db/queries').then(m => m.listarTrasplantes());
        const caso = pacs.find(p => p.trasplante.id === tid);
        if (caso) {
          await programarNotificacionesSeguimiento(tid, caso.codigo_anon, tx.fecha_trasplante);
        }
      }

      if (Platform.OS === 'web') {
        router.push(`/paciente/${tid}/implante`);
      } else {
        Alert.alert('✅ Guardado', 'Datos del donante guardados correctamente.', [
          { text: 'Ir a Implante', onPress: () => router.push(`/paciente/${tid}/implante`) },
          { text: 'Aceptar' },
        ]);
      }
    } catch (err) {
      Alert.alert('Error al guardar', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.sectionHeader, { backgroundColor: Colors.sectionDonante }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>📋 DONANTE — Página 1</Text>
          <TouchableOpacity onPress={() => router.push(`/paciente/${tid}/implante`)}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Botones OCR */}
        <View style={styles.block}>
          <OCRButton onCamera={() => handleOCR('camera')} onGallery={() => handleOCR('gallery')} loading={ocrLoading} />
        </View>

        {/* IDENTIFICACIÓN */}
        <Block title="Identificación">
          <FormField label="Fecha extracción" value={form.fecha ? new Date(form.fecha as number).toLocaleDateString('es-ES') : ''} onChangeText={v => set('fecha', v)} required />
          <FormField label="NHC del hígado" value={String(form.nhc_higado ?? '')} onChangeText={v => set('nhc_higado', v)} />
          <RadioGroup label="Grupo ABO" options={[{label:'A',value:'A'},{label:'B',value:'B'},{label:'AB',value:'AB'},{label:'O',value:'O'}]} value={form.grupo_abo as string} onChange={v => set('grupo_abo', v)} />
          <RadioGroup label="Sexo" options={[{label:'Hombre',value:0},{label:'Mujer',value:1}]} value={form.sexo as number} onChange={v => set('sexo', v)} required />
          <FormField label="Edad (años)" value={String(form.edad ?? '')} onChangeText={v => set('edad', v)} keyboardType="decimal-pad" />
          <FormField label="Peso (kg)" value={String(form.peso_kg ?? '')} onChangeText={v => set('peso_kg', v)} keyboardType="decimal-pad" />
          <FormField label="Talla (cm)" value={String(form.talla_cm ?? '')} onChangeText={v => set('talla_cm', v)} keyboardType="decimal-pad" />
        </Block>

        {/* CAUSA MUERTE */}
        <Block title="Causa de muerte">
          <RadioGroup label="Causa" options={['PCR','ACV','TCE','Otro'].map(v=>({label:v,value:v}))} value={form.causa_muerte as string} onChange={v => set('causa_muerte', v)} required />
          <FormField label="Causa ingreso UCI" value={String(form.causa_uci ?? '')} onChangeText={v => set('causa_uci', v)} />
        </Block>

        {/* FACTORES RIESGO */}
        <Block title="Factores de riesgo">
          <RadioGroup label="HTA"          options={OPTIONS_SINO} value={form.fr_hta as number} onChange={v => set('fr_hta', v)} />
          <RadioGroup label="Diabetes"     options={OPTIONS_SINO} value={form.fr_dm as number}  onChange={v => set('fr_dm', v)} />
          <RadioGroup label="Dislipemia"   options={OPTIONS_SINO} value={form.fr_dl as number}  onChange={v => set('fr_dl', v)} />
          <RadioGroup label="Alcohol"      options={OPTIONS_SINO} value={form.oh as number}     onChange={v => set('oh', v)} />
          <RadioGroup label="Tabaco"       options={OPTIONS_SINO} value={form.tabaco as number} onChange={v => set('tabaco', v)} />
          <RadioGroup label="Drogas vía aérea" options={OPTIONS_SINO} value={form.drogas_va as number} onChange={v => set('drogas_va', v)} />
          <RadioGroup label="PCR previa"   options={OPTIONS_SINO} value={form.pcr_previa as number} onChange={v => set('pcr_previa', v)} />
          <RadioGroup label="Eco/TC hepático" options={OPTIONS_ECO_TC} value={form.eco_tc as number} onChange={v => set('eco_tc', v)} />
        </Block>

        {/* ANALÍTICA BASAL */}
        <Block title="Analítica basal donante">
          <FormField label="Na (mEq/L)"          value={String(form.as_na ?? '')}   onChangeText={v=>set('as_na',v)}   keyboardType="decimal-pad" />
          <FormField label="ALT (U/L)"            value={String(form.as_alt ?? '')}  onChangeText={v=>set('as_alt',v)}  keyboardType="decimal-pad" />
          <FormField label="AST (U/L)"            value={String(form.as_ast ?? '')}  onChangeText={v=>set('as_ast',v)}  keyboardType="decimal-pad" />
          <FormField label="Plaquetas (×10³/µL)"  value={String(form.as_plaq ?? '')} onChangeText={v=>set('as_plaq',v)} keyboardType="decimal-pad" />
          <FormField label="GGT (U/L)"            value={String(form.as_ggt ?? '')}  onChangeText={v=>set('as_ggt',v)}  keyboardType="decimal-pad" />
          <FormField label="Bilirrubina (mg/dL)"  value={String(form.as_bi ?? '')}   onChangeText={v=>set('as_bi',v)}   keyboardType="decimal-pad" />
          <FormField label="Creatinina (mg/dL)"   value={String(form.as_cr ?? '')}   onChangeText={v=>set('as_cr',v)}   keyboardType="decimal-pad" />
        </Block>

        {/* TIPO DONACIÓN */}
        <Block title="Tipo de donación">
          <RadioGroup label="Tipo" options={OPTIONS_TIPO_DONACION.map(v=>({label:v,value:v}))} value={form.tipo_donacion as string} onChange={v=>set('tipo_donacion',v)} required />
          <RadioGroup label="Donación riñón"    options={OPTIONS_SINO} value={form.donacion_rinon as number}   onChange={v=>set('donacion_rinon',v)} />
          <RadioGroup label="Donación corazón"  options={OPTIONS_SINO} value={form.donacion_corazon as number} onChange={v=>set('donacion_corazon',v)} />
          <RadioGroup label="Donación pulmón"   options={OPTIONS_SINO} value={form.donacion_pulmon as number}  onChange={v=>set('donacion_pulmon',v)} />
          <FormField label="Tiempo ECMO (min)" value={String(form.dcd_tiempo_ecmo_min ?? '')} onChangeText={v=>set('dcd_tiempo_ecmo_min',v)} keyboardType="decimal-pad" />
          <FormField label="TWIT (segundos)"   value={String(form.twit_seg ?? '')} onChangeText={v=>set('twit_seg',v)} keyboardType="decimal-pad" required />
          <FormField label="FWIT (segundos)"   value={String(form.fwit_seg ?? '')} onChangeText={v=>set('fwit_seg',v)} keyboardType="decimal-pad" required />
        </Block>

        {/* EXTRACCIÓN */}
        <Block title="Biopsia y extracción">
          <RadioGroup label="Esteatosis macrovesicular" options={OPTIONS_SINO}    value={form.esteatosis_macros as number}    onChange={v=>set('esteatosis_macros',v)} />
          <RadioGroup label="Calidad perfusión"         options={OPTIONS_PERFUSION} value={form.perfusion as number}          onChange={v=>set('perfusion',v)} required />
          <RadioGroup label="Anomalías arteriales"      options={OPTIONS_SINO}    value={form.anomalias_arteriales as number} onChange={v=>set('anomalias_arteriales',v)} />
          <FormField label="Tipo anomalía"      value={String(form.tipo_anomalia ?? '')}      onChangeText={v=>set('tipo_anomalia',v)} />
          <FormField label="Tipo reconstrucción" value={String(form.tipo_reconstruccion ?? '')} onChangeText={v=>set('tipo_reconstruccion',v)} />
          <RadioGroup label="Biopsia" options={OPTIONS_SINO} value={form.biopsia as number} onChange={v=>set('biopsia',v)} />
          <FormField label="Solución preservación" value={String(form.solucion_preservacion ?? '')} onChangeText={v=>set('solucion_preservacion',v)} />
          <RadioGroup label="Tipo preservación" options={OPTIONS_PRESERVACION.map(v=>({label:v,value:v}))} value={form.preservacion as string} onChange={v=>set('preservacion',v)} />
        </Block>

        {/* SERIE SANGRE */}
        <Block title="Serie temporal — Sangre">
          <SerieTemporalTable
            title="pH, Lactato, ALT, AST, GGT, Bi, INR"
            rowHeaders={['BASAL', '+1H', '+1H30', '+2H']}
            columns={[
              {key:'ph',label:'pH'},{key:'lact',label:'Lact'},{key:'alt',label:'ALT'},
              {key:'ast',label:'AST'},{key:'ggt',label:'GGT'},{key:'bi',label:'Bi'},{key:'inr',label:'INR'},
            ]}
            data={serieSangre}
            onChange={onSerieSangreChange}
            rowLabel="Tiempo"
          />
        </Block>

        {/* SERIE BILIS */}
        <Block title="Serie bilis — +2H">
          <SerieTemporalTable
            title="pH, Bicarbonato, Lactato, ALT, GGT, Bi, AST, Glucosa, INR"
            rowHeaders={['+2H']}
            columns={[
              {key:'ph',label:'pH'},{key:'bicarb',label:'HCO₃'},{key:'lact',label:'Lact'},
              {key:'alt',label:'ALT'},{key:'ggt',label:'GGT'},{key:'bi',label:'Bi'},
              {key:'ast',label:'AST'},{key:'glu',label:'Glu'},{key:'inr',label:'INR'},
            ]}
            data={serieBilis}
            onChange={onSerieBilisChange}
            rowLabel="+2H"
          />
        </Block>

        {/* ORGANOX */}
        <Block title="Perfusión normotérmica (Organox)">
          <FormField label="Hora inicio" value={String(form.organos_hora_inicio ?? '')} onChangeText={v=>set('organos_hora_inicio',v)} placeholder="HH:MM" />
          <FormField label="Hora fin"    value={String(form.organos_hora_fin ?? '')}    onChangeText={v=>set('organos_hora_fin',v)}    placeholder="HH:MM" />
          <FormField label="Duración (min)" value={String(form.organos_tiempo_min ?? '')} onChangeText={v=>set('organos_tiempo_min',v)} keyboardType="decimal-pad" />
          <FormField label="Causa indicación" value={String(form.organos_causa ?? '')} onChangeText={v=>set('organos_causa',v)} />
          <RadioGroup label="Validez del injerto" options={[{label:'No válido',value:0},{label:'Válido',value:1}]} value={form.organos_validez as number} onChange={v=>set('organos_validez',v)} />
        </Block>

        {/* BOTÓN GUARDAR */}
        <TouchableOpacity
          style={[styles.btnSave, loading && styles.btnDisabled]}
          onPress={guardar}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.btnSaveText}>{loading ? 'Guardando…' : 'Guardar datos del donante'}</Text>
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
  title: { fontSize: 14, fontWeight: '800', color: Colors.sectionDonante, marginBottom: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { paddingBottom: 60 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 52,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#fff', flex: 1, textAlign: 'center' },
  block:        { padding: 12 },
  btnSave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.sectionDonante,
    borderRadius: 12,
    paddingVertical: 16,
    margin: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnSaveText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
