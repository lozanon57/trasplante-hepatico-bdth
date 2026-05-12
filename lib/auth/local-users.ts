import * as Crypto from 'expo-crypto';

const SALT = 'bdth_salt_hgm_2026';

interface LocalUser {
  id: number;
  email: string;
  nombre: string;
  rol: 'cirujano' | 'jefe';
  passwordHash: string;
}

// SHA-256(password + SALT) — computed offline, never transmitted
const USERS: LocalUser[] = [
  {
    id: 1,
    email: 'jefe@hgm.es',
    nombre: 'Jefe Unidad Trasplante',
    rol: 'jefe',
    passwordHash: '06c1c584ca2f979195574cf976f6791269f1a30e5c56d482f898764879238ec6',
  },
  {
    id: 2,
    email: 'garcia@hgm.es',
    nombre: 'Dr. García',
    rol: 'cirujano',
    passwordHash: '06c1c584ca2f979195574cf976f6791269f1a30e5c56d482f898764879238ec6',
  },
  {
    id: 3,
    email: 'lopez@hgm.es',
    nombre: 'Dr. López',
    rol: 'cirujano',
    passwordHash: '06c1c584ca2f979195574cf976f6791269f1a30e5c56d482f898764879238ec6',
  },
  {
    id: 4,
    email: 'rodriguez@hgm.es',
    nombre: 'Dr. Rodríguez',
    rol: 'cirujano',
    passwordHash: '06c1c584ca2f979195574cf976f6791269f1a30e5c56d482f898764879238ec6',
  },
  {
    id: 5,
    email: 'fernandez@hgm.es',
    nombre: 'Dr. Fernández',
    rol: 'cirujano',
    passwordHash: '06c1c584ca2f979195574cf976f6791269f1a30e5c56d482f898764879238ec6',
  },
  {
    id: 6,
    email: 'martinez@hgm.es',
    nombre: 'Dr. Martínez',
    rol: 'cirujano',
    passwordHash: '06c1c584ca2f979195574cf976f6791269f1a30e5c56d482f898764879238ec6',
  },
];

export async function authenticateLocal(
  email: string,
  password: string
): Promise<{ id: number; nombre: string; rol: 'cirujano' | 'jefe' } | null> {
  const user = USERS.find(u => u.email === email.toLowerCase().trim());
  if (!user) return null;

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + SALT
  );
  if (hash !== user.passwordHash) return null;

  return { id: user.id, nombre: user.nombre, rol: user.rol };
}
