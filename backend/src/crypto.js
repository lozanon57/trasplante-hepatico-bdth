const crypto = require('crypto');

const NHC_KEY  = Buffer.from(process.env.NHC_KEY, 'hex');  // 32 bytes
const NHC_SALT = process.env.NHC_SALT;

// Deterministic hash para búsqueda
function hashNHC(nhc) {
  return crypto.createHash('sha256').update(nhc + NHC_SALT).digest('hex');
}

// AES-256-GCM — cifra el NHC real (solo jefe puede descifrar via API)
function encryptNHC(nhc) {
  const iv         = crypto.randomBytes(12);
  const cipher     = crypto.createCipheriv('aes-256-gcm', NHC_KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(nhc, 'utf8'), cipher.final()]);
  const tag        = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptNHC(ciphertext) {
  const buf       = Buffer.from(ciphertext, 'base64');
  const iv        = buf.subarray(0, 12);
  const tag       = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher  = crypto.createDecipheriv('aes-256-gcm', NHC_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// Hash chain para audit log
function hashAudit({ datos_json, hash_anterior, created_at, usuario_id }) {
  return crypto
    .createHash('sha256')
    .update(`${datos_json}|${hash_anterior}|${created_at}|${usuario_id}`)
    .digest('hex');
}

module.exports = { hashNHC, encryptNHC, decryptNHC, hashAudit };
