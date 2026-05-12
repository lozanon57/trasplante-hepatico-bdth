import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/variables';
import { seedDemoData } from '../../lib/demo/seed';
import {
  listarTrasplantes,
  obtenerDonante,
  obtenerReceptorImplante,
  obtenerPostoperatorio,
} from '../../lib/db/queries';

const PURPLE = '#4527A0';
const TEAL   = '#00897B';
const ORANGE = '#E65100';
const RED    = '#C62828';
const BLUE   = '#1565C0';
const GREEN  = '#2E7D32';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Filters {
  year: number | null;
  cirujano: string | null;
}

interface FilterOptions {
  years: number[];
  cirujanos: string[];
}

interface Stats {
  total: number;
  conReceptor: number;
  donantesNoValidos: number;
  exitus30: number;
  meldMedio: number;
  tifMedio: number;
  estanciMedia: number;
  tiposDonacion: Record<string, number>;
  hepatopatias: [string, number][];
  meldBands: [string, number][];
  complicaciones: [string, number, string][];
  porMes: [string, number][];
  clavienDist: [string, number][];
}

// ─── filter options ───────────────────────────────────────────────────────────
function getFilterOptions(): FilterOptions {
  const rows = listarTrasplantes();
  const yearsSet = new Set<number>();
  const cirSet   = new Set<string>();
  for (const row of rows) {
    if (row.trasplante.fecha_trasplante) {
      yearsSet.add(new Date(row.trasplante.fecha_trasplante).getFullYear());
    }
    if (row.creado_por) cirSet.add(row.creado_por);
  }
  return {
    years:     Array.from(yearsSet).sort((a, b) => b - a),
    cirujanos: Array.from(cirSet).sort(),
  };
}

// ─── compute ──────────────────────────────────────────────────────────────────
function computeStats(filters: Filters): Stats {
  const allRows = listarTrasplantes();
  const rows = allRows.filter(row => {
    if (filters.year !== null && row.trasplante.fecha_trasplante) {
      if (new Date(row.trasplante.fecha_trasplante).getFullYear() !== filters.year) return false;
    }
    if (filters.cirujano !== null && row.creado_por !== filters.cirujano) return false;
    return true;
  });

  const total = rows.length;
  let conReceptor = 0, donantesNoValidos = 0, exitus30 = 0;
  let meldSum = 0, meldN = 0, tifSum = 0, tifN = 0, estSum = 0, estN = 0;

  const tiposDonacion: Record<string, number> = {};
  const hepatopatiaMap: Record<string, number> = {};
  const meldBandMap: Record<string, number> = { '<15': 0, '15–24': 0, '25–34': 0, '≥35': 0 };
  const compMap: [string, string][] = [
    ['EAD Olthoff', RED], ['PNF', '#B71C1C'], ['Trombosis art.', ORANGE],
    ['Compl. biliar', '#F57F17'], ['Rechazo agudo', TEAL], ['Reintervención', BLUE],
  ];
  const compCount: Record<string, number> = Object.fromEntries(compMap.map(([k]) => [k, 0]));
  const mesMap: Record<string, number> = {};
  const CLAVIEN_LABELS = ['', 'I', 'II', 'IIIa', 'IIIb', 'IV', 'V'];
  const clavienMap: Record<string, number> = { 'I': 0, 'II': 0, 'IIIa': 0, 'IIIb': 0, 'IV': 0, 'V': 0 };

  const now = new Date();
  if (filters.year !== null) {
    for (let m = 0; m < 12; m++) {
      const d = new Date(filters.year, m, 1);
      mesMap[d.toLocaleString('es-ES', { month: 'short' })] = 0;
    }
  } else {
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      mesMap[`${d.toLocaleString('es-ES', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`] = 0;
    }
  }

  for (const row of rows) {
    const t = row.trasplante;
    const rejected = t.estado === 'donante-no-válido';
    if (rejected) donantesNoValidos++;
    const don = obtenerDonante(t.id) as any;
    if (don?.tipo_donacion) {
      const k = String(don.tipo_donacion);
      tiposDonacion[k] = (tiposDonacion[k] ?? 0) + 1;
    }
    if (t.fecha_trasplante) {
      const d = new Date(t.fecha_trasplante);
      let key: string;
      if (filters.year !== null) {
        key = d.toLocaleString('es-ES', { month: 'short' });
      } else {
        key = `${d.toLocaleString('es-ES', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`;
      }
      if (key in mesMap) mesMap[key]++;
    }
    if (rejected) continue;
    conReceptor++;

    const rec = obtenerReceptorImplante(t.id) as any;
    if (rec) {
      const hep = String(rec.origen_hepatopatia ?? 'Desconocida');
      hepatopatiaMap[hep] = (hepatopatiaMap[hep] ?? 0) + 1;
      const meld = Number(rec.meld ?? 0);
      if (meld > 0) {
        meldSum += meld; meldN++;
        if (meld < 15) meldBandMap['<15']!++;
        else if (meld < 25) meldBandMap['15–24']!++;
        else if (meld < 35) meldBandMap['25–34']!++;
        else meldBandMap['≥35']!++;
      }
      const tif = Number(rec.t_isquemia_fria ?? 0);
      if (tif > 0) { tifSum += tif; tifN++; }
    }

    const po = obtenerPostoperatorio(t.id) as any;
    if (po) {
      if (po.exitus_30d === 1) exitus30++;
      if (po.ead_olthoff === 1 || po.disfuncion_olthoff_7dpo === 1) compCount['EAD Olthoff']!++;
      if (po.pnf === 1) compCount['PNF']!++;
      if (po.trombosis_arterial === 1) compCount['Trombosis art.']!++;
      if (po.complicacion_biliar === 1) compCount['Compl. biliar']!++;
      if (po.rechazo_agudo === 1) compCount['Rechazo agudo']!++;
      if (po.reintervencion === 1) compCount['Reintervención']!++;
      const cl = Number(po.clavien_dindo ?? 0);
      const lbl = CLAVIEN_LABELS[cl];
      if (lbl && cl > 0) clavienMap[lbl] = (clavienMap[lbl] ?? 0) + 1;
      const dias = Number(po.dias_estancia_total ?? 0);
      if (dias > 0) { estSum += dias; estN++; }
    }
  }

  return {
    total, conReceptor, donantesNoValidos, exitus30,
    meldMedio:    meldN > 0 ? Math.round(meldSum / meldN) : 0,
    tifMedio:     tifN > 0  ? Math.round(tifSum / tifN)  : 0,
    estanciMedia: estN > 0  ? Math.round(estSum / estN)  : 0,
    tiposDonacion,
    hepatopatias: Object.entries(hepatopatiaMap).sort((a, b) => b[1] - a[1]).slice(0, 8) as [string, number][],
    meldBands: Object.entries(meldBandMap) as [string, number][],
    complicaciones: compMap.map(([k, c]) => [k, compCount[k] ?? 0, c]) as [string, number, string][],
    porMes: Object.entries(mesMap) as [string, number][],
    clavienDist: Object.entries(clavienMap).filter(([, v]) => v > 0) as [string, number][],
  };
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
function FilterBar({ options, filters, onChange }: {
  options: FilterOptions;
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const hasFilter = filters.year !== null || filters.cirujano !== null;
  if (options.years.length === 0 && options.cirujanos.length === 0) return null;

  return (
    <View style={fb.wrap}>
      {/* Years */}
      {options.years.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fb.row}>
          <Chip
            label="Todos los años"
            active={filters.year === null}
            color={PURPLE}
            onPress={() => onChange({ ...filters, year: null })}
          />
          {options.years.map(y => (
            <Chip
              key={y}
              label={String(y)}
              active={filters.year === y}
              color={PURPLE}
              onPress={() => onChange({ ...filters, year: filters.year === y ? null : y })}
            />
          ))}
        </ScrollView>
      )}

      {/* Cirujanos */}
      {options.cirujanos.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fb.row}>
          <Chip
            label="Todos los cirujanos"
            active={filters.cirujano === null}
            color={BLUE}
            onPress={() => onChange({ ...filters, cirujano: null })}
          />
          {options.cirujanos.map(c => (
            <Chip
              key={c}
              label={c.split(' ')[0]!}
              active={filters.cirujano === c}
              color={BLUE}
              onPress={() => onChange({ ...filters, cirujano: filters.cirujano === c ? null : c })}
            />
          ))}
        </ScrollView>
      )}

      {hasFilter && (
        <TouchableOpacity
          style={fb.clearBtn}
          onPress={() => onChange({ year: null, cirujano: null })}
        >
          <Ionicons name="close-circle" size={13} color={PURPLE} />
          <Text style={fb.clearText}>Quitar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Chip({ label, active, color, onPress }: {
  label: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[fb.chip, active && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[fb.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const fb = StyleSheet.create({
  wrap:     { backgroundColor: Colors.surface, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  row:      { paddingHorizontal: 14, gap: 6, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6 },
  clearText:{ fontSize: 11, color: PURPLE, fontWeight: '600' },
});

// ─── Chart components ─────────────────────────────────────────────────────────
function StatRing({ value, max, label, color, size = 72 }: {
  value: number; max: number; label: string; color: string; size?: number;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color + '15',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: color + '30',
      }}>
        <Text style={{ fontSize: size * 0.28, fontWeight: '900', color }}>{value}</Text>
        <Text style={{ fontSize: size * 0.13, color: color + 'AA' }}>{Math.round(pct * 100)}%</Text>
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center', maxWidth: size }}>{label}</Text>
    </View>
  );
}

function HBar({ label, value, max, color, total }: {
  label: string; value: number; max: number; color: string; total: number;
}) {
  const pct = max > 0 ? value / max : 0;
  const inc = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={hS.row}>
      <Text style={hS.label} numberOfLines={1}>{label}</Text>
      <View style={hS.track}>
        <View style={[hS.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[hS.num, { color }]}>{value}</Text>
      <Text style={hS.pct}>{inc}%</Text>
    </View>
  );
}

const hS = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  label: { width: 128, fontSize: 11, color: Colors.textPrimary },
  track: { flex: 1, height: 12, backgroundColor: Colors.border, borderRadius: 6, overflow: 'hidden' },
  fill:  { height: 12, borderRadius: 6 },
  num:   { width: 26, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  pct:   { width: 32, fontSize: 10, color: Colors.textSecondary, textAlign: 'right' },
});

function VBars({ data, color, height = 90 }: { data: [string, number][]; color: string; height?: number }) {
  const max = Math.max(...data.map(d => d[1]), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: 20 }}>
      {data.map(([label, val]) => (
        <View key={label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          {val > 0 && (
            <View style={{
              backgroundColor: color + '18', borderRadius: 4,
              paddingHorizontal: 3, paddingVertical: 1, marginBottom: 2,
            }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color }}>{val}</Text>
            </View>
          )}
          <View style={{
            width: '75%',
            height: Math.max((val / max) * height, val > 0 ? 6 : 2),
            backgroundColor: val > 0 ? color : Colors.border,
            borderRadius: 4,
          }} />
          <Text style={{ fontSize: 7, color: Colors.textSecondary, textAlign: 'center' }} numberOfLines={2}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ChipBar({ data, total }: { data: [string, number, string][]; total: number }) {
  return (
    <>
      <View style={{ flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', marginVertical: 12 }}>
        {data.filter(([, v]) => v > 0).map(([label, val, color]) => (
          <View key={label} style={{ flex: val, backgroundColor: color }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data.filter(([, v]) => v > 0).map(([label, val, color]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
            <Text style={{ fontSize: 11, color: Colors.textPrimary }}>
              {label} <Text style={{ fontWeight: '800', color }}>{val}</Text>
              <Text style={{ color: Colors.textSecondary }}> ({total > 0 ? Math.round(val / total * 100) : 0}%)</Text>
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function CardTitle({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <View style={{ backgroundColor: color + '18', width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon as any} size={15} color={color} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Estadisticas() {
  const [rawData, setRawData] = useState<ReturnType<typeof listarTrasplantes> | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [filters, setFilters] = useState<Filters>({ year: null, cirujano: null });

  const reload = useCallback(() => { setRawData(listarTrasplantes()); }, []);
  useFocusEffect(reload);

  const filterOptions = useMemo<FilterOptions>(() => {
    if (!rawData) return { years: [], cirujanos: [] };
    return getFilterOptions();
  }, [rawData]);

  const stats = useMemo<Stats | null>(() => {
    if (!rawData || rawData.length === 0) return null;
    return computeStats(filters);
  }, [rawData, filters]);

  const handleSeed = () => {
    if (seeding) return;
    setSeeding(true);
    setFilters({ year: null, cirujano: null });
    setTimeout(() => {
      try {
        seedDemoData();
        setRawData(listarTrasplantes());
      } catch (e) {
        console.error(e);
      } finally {
        setSeeding(false);
      }
    }, 10);
  };

  const s = stats;

  if (!s || s.total === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: PURPLE }}>
        <View style={spl.circ1} />
        <View style={spl.circ2} />
        <View style={spl.circ3} />
        <ScrollView contentContainerStyle={spl.container}>
          <View style={spl.iconWrap}>
            <Ionicons name="bar-chart" size={56} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={spl.h1}>Estadísticas BDTH</Text>
          <Text style={spl.sub}>Base de Datos de Trasplante Hepático{'\n'}H. Gregorio Marañón</Text>
          <View style={spl.divider} />
          <Text style={spl.bodyText}>
            Sin datos cargados. Pulsa el botón para cargar{'\n'}
            <Text style={{ fontWeight: '900' }}>22 casos ficticios de demostración</Text>{' '}
            con datos clínicos realistas.
          </Text>
          <TouchableOpacity
            style={[spl.btn, seeding && { opacity: 0.6 }]}
            onPress={handleSeed}
            disabled={seeding}
            activeOpacity={0.8}
          >
            <Ionicons name={seeding ? 'hourglass-outline' : 'flask'} size={22} color={PURPLE} />
            <Text style={spl.btnText}>{seeding ? 'Cargando datos…' : 'Cargar demo (22 casos)'}</Text>
          </TouchableOpacity>
          <View style={spl.featureList}>
            {[
              ['heart-outline',     'DBD · DCD · HOPE + donantes rechazados'],
              ['medical-outline',   'VHC · CHC · Alcohólica · PSC · Agudo…'],
              ['analytics-outline', 'MELD · TIF · Complicaciones · Mortalidad'],
              ['bar-chart-outline', 'Filtros por año y cirujano · Clavien-Dindo'],
            ].map(([icon, label]) => (
              <View key={label} style={spl.feature}>
                <Ionicons name={icon as any} size={16} color="rgba(255,255,255,0.7)" />
                <Text style={spl.featureText}>{label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  const mort30pct = s.conReceptor > 0 ? Math.round((s.exitus30 / s.conReceptor) * 100) : 0;
  const rejPct    = s.total > 0 ? Math.round((s.donantesNoValidos / s.total) * 100) : 0;

  const donTipos: [string, number, string][] = [
    ['DBD',       s.tiposDonacion['DBD']  ?? 0, BLUE],
    ['DCD',       s.tiposDonacion['DCD']  ?? 0, TEAL],
    ['HOPE',      s.tiposDonacion['HOPE'] ?? 0, PURPLE],
    ['No válido', s.donantesNoValidos,           RED],
  ];
  const maxHep = Math.max(...s.hepatopatias.map(h => h[1]), 1);

  const activeFiltersLabel = [
    filters.year ? `Año ${filters.year}` : null,
    filters.cirujano ? filters.cirujano.split(' ')[0] : null,
  ].filter(Boolean).join(' · ');

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.content}>

      {/* ── Hero header ── */}
      <View style={[st.hero, { backgroundColor: PURPLE }]}>
        <View style={st.heroCircle1} />
        <View style={st.heroCircle2} />
        <View style={st.heroTop}>
          <View>
            <Text style={st.heroTitle}>Estadísticas</Text>
            <Text style={st.heroSub}>H. Gregorio Marañón · BDTH{activeFiltersLabel ? ` · ${activeFiltersLabel}` : ''}</Text>
          </View>
          <TouchableOpacity style={st.demoBtn} onPress={handleSeed} disabled={seeding}>
            <Ionicons name={seeding ? 'hourglass-outline' : 'flask-outline'} size={14} color={PURPLE} />
            <Text style={st.demoBtnText}>{seeding ? '…' : 'Recargar demo'}</Text>
          </TouchableOpacity>
        </View>
        <View style={st.heroCenter}>
          <Text style={st.heroNum}>{s.total}</Text>
          <Text style={st.heroNumLabel}>trasplantes{activeFiltersLabel ? ` (${activeFiltersLabel})` : ' registrados'}</Text>
        </View>
        <View style={st.heroStrip}>
          <View style={st.heroMini}>
            <Text style={st.heroMiniNum}>{s.conReceptor}</Text>
            <Text style={st.heroMiniLabel}>con receptor</Text>
          </View>
          <View style={st.heroMiniDiv} />
          <View style={st.heroMini}>
            <Text style={[st.heroMiniNum, { color: '#FF8A65' }]}>{s.donantesNoValidos}</Text>
            <Text style={st.heroMiniLabel}>no válidos</Text>
          </View>
          <View style={st.heroMiniDiv} />
          <View style={st.heroMini}>
            <Text style={[st.heroMiniNum, { color: mort30pct > 10 ? '#FF8A65' : '#A5D6A7' }]}>{mort30pct}%</Text>
            <Text style={st.heroMiniLabel}>mort. 30d</Text>
          </View>
          <View style={st.heroMiniDiv} />
          <View style={st.heroMini}>
            <Text style={[st.heroMiniNum, { color: '#CE93D8' }]}>{s.meldMedio || '—'}</Text>
            <Text style={st.heroMiniLabel}>MELD medio</Text>
          </View>
        </View>
      </View>

      {/* ── Filter bar ── */}
      <FilterBar options={filterOptions} filters={filters} onChange={setFilters} />

      {/* ── KPI cards ── */}
      <View style={st.kpiGrid}>
        {[
          { label: 'TIF media',  value: s.tifMedio ? `${s.tifMedio}′` : '—', icon: 'time',          color: BLUE,   sub: 'isquemia fría' },
          { label: 'Estancia',   value: s.estanciMedia ? `${s.estanciMedia}d` : '—', icon: 'bed-outline', color: TEAL, sub: 'días media' },
          { label: 'Complicac.', value: s.complicaciones.reduce((a, [, v]) => a + v, 0), icon: 'bandage', color: ORANGE, sub: 'total eventos' },
          { label: 'No válidos', value: s.donantesNoValidos, icon: 'close-circle', color: RED, sub: `${rejPct}% del total` },
        ].map(k => (
          <View key={k.label} style={[st.kpiCard, { borderLeftColor: k.color }]}>
            <View style={{ backgroundColor: k.color + '15', width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name={k.icon as any} size={18} color={k.color} />
            </View>
            <Text style={[st.kpiNum, { color: k.color }]}>{k.value}</Text>
            <Text style={st.kpiLabel}>{k.label}</Text>
            <Text style={st.kpiSub}>{k.sub}</Text>
          </View>
        ))}
      </View>

      {/* ── Rings row ── */}
      <View style={[st.card, { backgroundColor: Colors.surface }]}>
        <CardTitle icon="stats-chart" title="Resumen de outcomes" color={PURPLE} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
          <StatRing value={s.conReceptor} max={s.total} label="Con receptor" color={GREEN} />
          <StatRing value={s.exitus30}    max={s.conReceptor} label="Éxitus 30d" color={RED} />
          <StatRing
            value={s.complicaciones.find(([l]) => l === 'EAD Olthoff')?.[1] ?? 0}
            max={s.conReceptor} label="EAD Olthoff" color={ORANGE}
          />
          <StatRing
            value={s.complicaciones.find(([l]) => l === 'Reintervención')?.[1] ?? 0}
            max={s.conReceptor} label="Reinterv." color={BLUE}
          />
        </View>
      </View>

      {/* ── Actividad mensual ── */}
      <View style={st.card}>
        <CardTitle
          icon="calendar"
          title={filters.year ? `Actividad mensual ${filters.year}` : 'Actividad mensual (12 meses)'}
          color={BLUE}
        />
        <VBars data={s.porMes} color={BLUE} height={100} />
      </View>

      {/* ── Tipo donación ── */}
      <View style={st.card}>
        <CardTitle icon="heart" title="Tipo de donación" color={TEAL} />
        <ChipBar data={donTipos} total={s.total} />
      </View>

      {/* ── Hepatopatías ── */}
      {s.hepatopatias.length > 0 && (
        <View style={st.card}>
          <CardTitle icon="medical" title="Indicación del trasplante" color={BLUE} />
          {s.hepatopatias.map(([label, val]) => (
            <HBar key={label} label={label} value={val} max={maxHep} color={BLUE} total={s.conReceptor} />
          ))}
        </View>
      )}

      {/* ── MELD + Clavien ── */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[st.card, { flex: 1 }]}>
          <CardTitle icon="fitness" title="MELD" color={ORANGE} />
          <VBars data={s.meldBands} color={ORANGE} height={70} />
        </View>
        <View style={[st.card, { flex: 1 }]}>
          <CardTitle icon="stats-chart" title="Clavien" color={RED} />
          {s.clavienDist.length > 0
            ? <VBars data={s.clavienDist} color={RED} height={70} />
            : <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 8 }}>Sin complicaciones</Text>
          }
        </View>
      </View>

      {/* ── Complicaciones ── */}
      <View style={st.card}>
        <CardTitle icon="bandage" title="Complicaciones postoperatorias" color={RED} />
        {s.complicaciones.map(([label, val, color]) => (
          <HBar key={label} label={label} value={val}
            max={Math.max(...s.complicaciones.map(([, v]) => v), 1)}
            color={val > 0 ? color : Colors.border}
            total={s.conReceptor}
          />
        ))}
      </View>

      {Platform.OS === 'web' && (
        <View style={st.note}>
          <Ionicons name="phone-portrait-outline" size={14} color={PURPLE} />
          <Text style={{ flex: 1, fontSize: 11, color: PURPLE }}>
            Exportación a Excel disponible en la app móvil iOS / Android.
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

// ─── Splash styles ────────────────────────────────────────────────────────────
const spl = StyleSheet.create({
  container:  { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 80, paddingBottom: 60 },
  circ1:      { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  circ2:      { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: 'rgba(255,255,255,0.05)', top: 60,  right: 80 },
  circ3:      { position: 'absolute', width: 100, height: 100, borderRadius: 50,  backgroundColor: 'rgba(255,255,255,0.04)', bottom: 40, left: -20 },
  iconWrap:   { width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  h1:         { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' },
  sub:        { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  divider:    { width: 48, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginVertical: 20 },
  bodyText:   { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, marginBottom: 28 },
  btnText:    { fontSize: 16, fontWeight: '900', color: PURPLE },
  featureList:{ alignSelf: 'stretch', gap: 10 },
  feature:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText:{ fontSize: 13, color: 'rgba(255,255,255,0.75)' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 60 },

  hero:        { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, overflow: 'hidden', marginBottom: 0 },
  heroCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -40 },
  heroCircle2: { position: 'absolute', width: 110, height: 110, borderRadius: 55,  backgroundColor: 'rgba(255,255,255,0.05)', top: 30,  right: 90 },
  heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroTitle:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroSub:     { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2, maxWidth: 260 },
  heroCenter:  { alignItems: 'center', marginBottom: 20 },
  heroNum:     { fontSize: 72, fontWeight: '900', color: '#fff', lineHeight: 80 },
  heroNumLabel:{ fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  heroStrip:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12 },
  heroMini:    { flex: 1, alignItems: 'center', gap: 2 },
  heroMiniNum: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroMiniLabel:{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  heroMiniDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  demoBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  demoBtnText: { fontSize: 12, fontWeight: '800', color: PURPLE },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, marginTop: 14, marginBottom: 10 },
  kpiCard: {
    flex: 1, minWidth: 140, backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  kpiNum:   { fontSize: 24, fontWeight: '900', marginBottom: 1 },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  kpiSub:   { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    marginHorizontal: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  note: {
    flexDirection: 'row', gap: 8, backgroundColor: '#EDE7F6',
    margin: 14, borderRadius: 12, padding: 12, alignItems: 'center',
  },
});
