import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTIF_FILE = path.join(__dirname, '../../data/notifications.json');

// SLA deadlines per stage (days)
export const SLA_DAYS = { scrutiny: 7, approval: 14, release: 7 };

// escalation chain
export const LEVELS = ['District', 'State', 'Delhi'];

export const TRANSITIONS = {
  submitted: ['scrutiny'],
  scrutiny: ['approved', 'returned'],
  returned: ['scrutiny'],
  approved: ['released'],
  released: [],
};

const err = (message, code) => {
  const e = new Error(message);
  e.code = code;
  return e;
};

export class FileTracker {
  constructor(file = {}) {
    this.file = {
      status: 'submitted',
      level: 'District',
      history: [],
      stageEnteredAt: Date.now(),
      ...file,
    };
    if (!this.file.history) this.file.history = [];
  }
  transition(to) {
    const from = this.file.status;
    if (!(TRANSITIONS[from] || []).includes(to)) throw err(`invalid transition ${from}->${to}`, 'BAD_TRANSITION');
    this.file.status = to;
    this.file.stageEnteredAt = Date.now();
    this.file.history.push({ from, to, at: Date.now() });
    return this.file;
  }
}

export function stageFor(file = {}) {
  if (file.stage && SLA_DAYS[file.stage]) return file.stage;
  const s = file.status;
  if (s === 'approved') return 'approval';
  if (s === 'released') return 'release';
  return 'scrutiny';
}

export function checkSLA(file = {}) {
  const stage = stageFor(file);
  const days = SLA_DAYS[stage] ?? 7; // SLA deadline for stage
  const entered = file.stageEnteredAt || file.updatedAt || file.createdAt || Date.now();
  const elapsed = (Date.now() - Number(entered)) / 86400000;
  const daysLeft = days - elapsed;
  return { stage, deadlineDays: days, daysLeft, overdue: daysLeft < 0 };
}

export const outbox = [];

function persistNotif(rec) {
  fs.mkdirSync(path.dirname(NOTIF_FILE), { recursive: true });
  let arr = [];
  try {
    if (fs.existsSync(NOTIF_FILE)) {
      const cur = JSON.parse(fs.readFileSync(NOTIF_FILE, 'utf8'));
      if (Array.isArray(cur)) arr = cur;
    }
  } catch { /* corrupt -> overwrite */ }
  arr.push(rec);
  fs.writeFileSync(NOTIF_FILE, JSON.stringify(arr, null, 2));
}

export function notify(role, message) {
  if (!role || !message) throw err('role and message required', 'BAD_NOTIFY');
  const rec = { role: String(role), message: String(message), at: Date.now() };
  outbox.push(rec);
  persistNotif(rec);
  return rec;
}

export function escalate(file) {
  if (!file) throw err('file required', 'BAD_FILE');
  const i = LEVELS.indexOf(file.level || 'District');
  const next = LEVELS[Math.min(i + 1, LEVELS.length - 1)];
  file.level = next; // escalation bump
  if (!file.history) file.history = [];
  file.history.push({ event: 'escalation', level: next, at: Date.now() });
  const sla = checkSLA(file);
  notify(file.level, `File escalated to ${next} (SLA overdue: ${sla.overdue})`);
  return file;
}

export function _clear() {
  outbox.length = 0;
}
