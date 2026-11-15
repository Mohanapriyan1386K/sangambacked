const crypto = require('node:crypto');
const ApiError = require('./ApiError');

function durationSeconds(value = '8h') {
  const match = String(value).match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 28800;
  return Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]]);
}
function signToken(adminId, tokenVersion = 0) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  const now = Math.floor(Date.now() / 1000);
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode({ sub: String(adminId), ver: tokenVersion, iat: now, exp: now + durationSeconds(process.env.JWT_EXPIRES_IN) });
  const input = `${header}.${body}`;
  return `${input}.${crypto.createHmac('sha256', secret).update(input).digest('base64url')}`;
}
function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const input = `${header}.${body}`;
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(input).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) throw new Error();
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.sub || payload.exp <= Date.now() / 1000) throw new Error();
    return payload;
  } catch {
    throw new ApiError(401, 'Invalid or expired authentication token');
  }
}
module.exports = { signToken, verifyToken };
