export function getRole() {
  return localStorage.getItem('praman_role') || 'NGO';
}

export function isDept() {
  return getRole() === 'Dept';
}

export function isPMU() {
  return getRole() === 'PMU';
}

export function isNGO() {
  return getRole() === 'NGO';
}

// Dept-only pages call this on load; redirects others home.
export function requireDept() {
  const role = getRole();
  if (role !== 'Dept' && role !== 'PMU') {
    location.href = '../(dashboard)/page.html';
    throw new Error('FORBIDDEN: Dept or PMU required, got ' + role);
  }
  return role;
}

// Hide assignment console from NGO role.
export function guardAssignments(root = document) {
  if (isNGO()) {
    root.querySelectorAll('[data-requires="dept"], #assign-console').forEach((el) => el.remove());
  }
}

export default { getRole, isDept, isPMU, isNGO, requireDept, guardAssignments };
