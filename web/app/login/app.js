const BASE = 'https://praman-api.onrender.com/api';
const $ = (id) => document.getElementById(id);

async function login(userId, password) {
  $('status').textContent = 'Signing in…';
  try {
    const res = await fetch(BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-id': 'demo-device' },
      body: JSON.stringify({ userId, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message || ('HTTP ' + res.status));
    localStorage.setItem('praman_jwt', body.access);
    localStorage.setItem('praman_role', body.role);
    $('status').textContent = 'Signed in as ' + body.role + '. Redirecting…';
    location.href = '../(dashboard)/page.html';
  } catch (err) {
    $('status').textContent = 'Login failed: ' + err.message;
  }
}

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  login($('userId').value, $('password').value);
});

document.querySelectorAll('[data-user]').forEach((btn) => {
  btn.addEventListener('click', () => login(btn.dataset.user, btn.dataset.pass));
});