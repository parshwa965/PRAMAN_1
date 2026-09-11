export const ROLES = ['Dept', 'PMU', 'NGO_Auth'];

const norm = (role) => {
  if (role === 'NGO') return 'NGO_Auth';
  return role;
};

// Dept: all. PMU: inspect+evidence+vc. NGO_Auth: read-own only.
export function can(role, action) {
  const r = norm(role);
  if (r === 'Dept') return true;
  if (!action || typeof action !== 'string') return false;
  if (r === 'PMU') {
    const a = action.toLowerCase();
    return a.startsWith('inspect') || a.startsWith('evidence') || a.startsWith('vc');
  }
  if (r === 'NGO_Auth') {
    const a = action.toLowerCase();
    return a === 'read-own' || a === 'read' || a.endsWith(':read-own') || a.endsWith('/read-own');
  }
  return false;
}

// Helper returning express-style middleware whose return value is { allowed, code }.
// Usage: app.post('/x', requireRole('Dept', 'PMU'), handler)
export function requireRole(...allowed) {
  const set = allowed.map(norm);
  const mw = (req, res, next) => {
    const raw = req != null && typeof req === 'object' ? (req.user?.role ?? req.role) : req;
    const role = norm(typeof raw === 'string' ? raw : raw?.role ?? raw);
    if (set.includes(role)) {
      if (typeof next === 'function') next();
      return { allowed: true };
    }
    const out = { allowed: false, code: 'FORBIDDEN' };
    if (res && typeof res.status === 'function') {
      return res.status(403).json(out);
    }
    if (typeof next === 'function') next(out);
    return out;
  };
  return mw;
}
