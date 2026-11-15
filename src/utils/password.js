const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, salt, hash] = String(stored || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

module.exports = { hashPassword, verifyPassword };
