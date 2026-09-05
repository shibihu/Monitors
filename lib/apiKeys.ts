import crypto from 'crypto';

export function generateApiKey() {
  const secret = crypto.randomBytes(16).toString('hex');
  return `sk_live_${secret}`;
}

export function hashApiKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function verifyApiKey(candidate: string, hash: string) {
  return hashApiKey(candidate) === hash;
}
