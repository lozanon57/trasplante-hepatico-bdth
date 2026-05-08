// Paleta de colores de la app — tema hospitalario azul
export const Colors = {
  primary:      '#1565C0',  // azul hospital
  primaryDark:  '#003c8f',
  primaryLight: '#5e92f3',
  secondary:    '#00897B',  // verde teal para acciones secundarias
  danger:       '#C62828',  // rojo alertas críticas
  warning:      '#F57F17',  // amarillo alertas pendientes
  success:      '#2E7D32',  // verde completo
  surface:      '#FFFFFF',
  background:   '#F5F7FA',
  textPrimary:  '#1A1A2E',
  textSecondary:'#5A5A7A',
  border:       '#DDE3ED',
  sectionDonante:   '#1B5E20',
  sectionImplante:  '#0D47A1',
  sectionPostop:    '#E65100',
};

// Etiquetas legibles de campos de formulario
export const LABELS: Record<string, string> = {
  // Donante
  fecha:                'Fecha extracción',
  nhc_higado:           'NHC del hígado',
  grupo_abo:            'Grupo ABO',
  sexo:                 'Sexo',
  edad:                 'Edad (años)',
  peso_kg:              'Peso (kg)',
  talla_cm:             'Talla (cm)',
  causa_muerte:         'Causa de muerte',
  causa_uci:            'Causa ingreso UCI',
  fr_hta:               'HTA',
  fr_dm:                'Diabetes mellitus',
  fr_dl:                'Dislipemia',
  oh:                   'Alcohol',
  tabaco:               'Tabaco',
  drogas_va:            'Drogas vía aérea',
  pcr_previa:           'PCR previa',
  eco_tc:               'Eco/TC hepático',
  as_na:                'Na (mEq/L)',
  as_alt:               'ALT (U/L)',
  as_ast:               'AST (U/L)',
  as_plaq:              'Plaquetas (×10³)',
  as_ggt:               'GGT (U/L)',
  as_bi:                'Bilirrubina (mg/dL)',
  as_cr:                'Creatinina (mg/dL)',
  tipo_donacion:        'Tipo de donación',
  donacion_rinon:       'Donación riñón',
  donacion_corazon:     'Donación corazón',
  donacion_pulmon:      'Donación pulmón',
  dcd_tiempo_ecmo_min:  'Tiempo ECMO (min)',
  twit_seg:             'TWIT (seg)',
  fwit_seg:             'FWIT (seg)',
  esteatosis_macros:    'Esteatosis macrovesicular',
  perfusion:            'Perfusión',
  anomalias_arteriales: 'Anomalías arteriales',
  tipo_anomalia:        'Tipo de anomalía',
  tipo_reconstruccion:  'Tipo reconstrucción',
  biopsia:              'Biopsia',
  solucion_preservacion:'Solución de preservación',
  preservacion:         'Tipo preservación',

  // Receptor/Implante
  nhc_receptor:         'NHC receptor',
  origen_hepatopatia:   'Origen hepatopatía',
  chc:                  'CHC',
  meld:                 'MELD',
  indicacion_tho:       'Indicación THO',
  alerta_cero:          'Alerta cero',
  tecnica:              'Técnica de implante',
  reperfusion:          'Calidad reperfusión',
  sindrome_reperfusion: 'Síndrome reperfusión',
  vb_tecnica:           'Técnica vía biliar',
  peso_injerto:         'Peso injerto (g)',
  flujo_portal:         'Flujo portal (mL/min)',
  flujo_arterial:       'Flujo arterial (mL/min)',
  t_isquemia_fria:      'T. Isquemia fría (min)',
  t_preservacion_hope:  'T. Preservación HOPE (min)',
  t_isquemia_caliente:  'T. Isquemia caliente (min)',
  t_isquemia_total:     'T. Isquemia total (min)',
  retho:                'Re-THO',
  pdr:                  'PDR (%)',

  // HOPE
  hope_hora_inicio:     'HOPE — Hora inicio',
  hope_hora_fin:        'HOPE — Hora fin',
  hope_tiempo_min:      'HOPE — Duración (min)',
  hope_causa:           'HOPE — Causa indicación',
  hope_tipo:            'HOPE — Tipo',
  hope_flujo:           'HOPE — Flujo (mL/min)',
  hope_presion:         'HOPE — Presión (mmHg)',
  hope_po2:             'HOPE — PO₂',

  // Postoperatorio
  pico_alt:             'Pico ALT (U/L)',
  pico_ast:             'Pico AST (U/L)',
  pico_ggt:             'Pico GGT (U/L)',
  pico_inr:             'Pico INR',
  pico_cr:              'Pico Cr (mg/dL)',
  pico_plaq:            'Pico plaquetas',
  pico_bi:              'Pico bilirrubina',
  disfuncion_olthoff_7dpo: 'Disfunción primaria (Olthoff)',
  sangrado:             'Sangrado postoperatorio',
  reintervencion:       'Reintervención',
  fecha_alta:           'Fecha de alta',
  dias_estancia_total:  'Estancia total (días)',
  dias_estancia_rea:    'Estancia REA (días)',
  complicaciones_po:    'Complicaciones postoperatorias',
  clavien_dindo:        'Clavien-Dindo',
  ead_olthoff:          'EAD (Olthoff)',
  pnf:                  'PNF',
  trombosis_arterial:   'Trombosis arterial',
  complicacion_biliar:  'Complicación biliar',
  estenosis_biliar_no_anast: 'Estenosis biliar no anastomótica',
  fuga_biliar:          'Fuga biliar',
  rechazo_agudo:        'Rechazo agudo',
  exitus_global:        'Éxitus',
  exitus_7d:            'Éxitus 7 días',
  exitus_30d:           'Éxitus 30 días',
  perdida_injerto:      'Pérdida de injerto',
  retrasplante:         'Retrasplante',
  rm_6meses:            'RM a los 6 meses',
  colangiopatia_intrahepatica: 'Colangiopatía intrahepática',
  colangiopatia:        'Colangiopatía',
  estenosis_anastomosis:'Estenosis de anastomosis',
};

// Opciones para RadioGroup
export const OPTIONS_SINO: Array<{ label: string; value: number }> = [
  { label: 'No', value: 0 },
  { label: 'Sí', value: 1 },
];

export const OPTIONS_PERFUSION: Array<{ label: string; value: number }> = [
  { label: 'Buena', value: 0 },
  { label: 'Regular', value: 1 },
  { label: 'Mala', value: 2 },
];

export const OPTIONS_ECO_TC: Array<{ label: string; value: number }> = [
  { label: 'Normal', value: 0 },
  { label: 'Esteatosis leve', value: 1 },
  { label: 'Esteatosis moderada', value: 2 },
  { label: 'Otro', value: 3 },
];

export const OPTIONS_SINDROME_REP: Array<{ label: string; value: number }> = [
  { label: 'No', value: 0 },
  { label: 'Leve', value: 1 },
  { label: 'Moderado', value: 2 },
  { label: 'Grave', value: 3 },
];

export const OPTIONS_TIPO_DONACION = ['DBD', 'DCD', 'DCD+ECMO', 'DCD_PAM'];
export const OPTIONS_HEPATOPATIA   = ['OH', 'VHC', 'VHB', 'NASH', 'CBP', 'CEP', 'Autoinmune', 'Otros'];
export const OPTIONS_CAUSA_MUERTE  = ['PCR', 'ACV', 'TCE', 'Otro'];
export const OPTIONS_PRESERVACION  = ['SCS', 'SCS+HOPE', 'SCS+Organox'];
export const OPTIONS_TECNICA       = [{ label: 'Piggyback', value: 0 }, { label: 'Clásica', value: 1 }];
export const OPTIONS_VB_TECNICA    = [{ label: 'Colédoco-colédoco', value: 0 }, { label: 'Hepático-yeyuno', value: 1 }];
export const OPTIONS_HOPE_TIPO     = [{ label: 'Single HOPE', value: 0 }, { label: 'Dual HOPE', value: 1 }];
export const OPTIONS_GRUPO_ABO     = ['A', 'B', 'AB', 'O'];

// Timepoints serie intraoperatoria
export const TIMEPOINTS_INTRAOP = ['BASAL', '+1H', '+2H', '+3H', '+4H', '+5H', '+6H', '+7H', '+8H', 'FIN'];

// Columnas serie intraoperatoria
export const COLS_INTRAOP = [
  { key: 'produc',        label: 'Produc.' },
  { key: 'bilis',         label: 'Bilis' },
  { key: 'flujo_arteria', label: 'Flujo art.' },
  { key: 'flujo_porta',   label: 'Flujo porta' },
  { key: 'correc',        label: 'Correc.' },
  { key: 'bicarb',        label: 'Bicarb.' },
  { key: 'aspect_higado', label: 'Aspecto' },
];

// Columnas serie DPO (1-7 días postoperatorio)
export const COLS_DPO = [
  { key: 'bi',   label: 'Bi' },
  { key: 'inr',  label: 'INR' },
  { key: 'alt',  label: 'ALT' },
  { key: 'ast',  label: 'AST' },
  { key: 'ggt',  label: 'GGT' },
  { key: 'fa',   label: 'FA' },
  { key: 'crea', label: 'Cr' },
];
