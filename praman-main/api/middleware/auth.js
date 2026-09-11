import { verifyAccess } from '../auth/index.js';

const deviceOf = (req) => req?.headers?.['x-device-id'] ?? req?.headers?.['X-Device-Id'];

export function auth(req, res, next) {
  const h = req?.headers?.authorization ?? req?.headers?.Authorization;
  if (!h || typeof h !== 'string' || !h.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'missing bearer token' });
  }
  const deviceId = deviceOf(req);
  if (!deviceId || !String(deviceId).trim()) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'x-device-id required' });
  }
  try {
    const payload = verifyAccess(h.slice(7).trim());
    req.user = { ...payload, id: payload.sub ?? payload.id ?? payload.userId, deviceId };
    return next();
  } catch (e) {
    if (e?.code === 'FORBIDDEN') return res.status(403).json({ code: 'FORBIDDEN', message: e.message });
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: e?.message || 'invalid token' });
  }
}

export default auth;
