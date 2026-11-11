/**
 * WeZards Admin API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.wezards.workers.dev';

export async function adminLogin(payload: { username: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Authentication failed');
  return data;
}

export async function adminLogout() {
  const res = await fetch(`${API_BASE}/api/admin/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  return res.json();
}

export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  const data = await res.json();
  return data.stats;
}

export async function fetchSubmissions(status?: string) {
  const url = new URL(`${API_BASE}/api/admin/submissions`);
  if (status) url.searchParams.set('status', status);

  const res = await fetch(url.toString(), { credentials: 'include' });
  const data = await res.json();
  return data.submissions || [];
}

export async function reviewSubmission(id: string, status: 'APPROVED' | 'REJECTED', reviewNotes?: string) {
  const res = await fetch(`${API_BASE}/api/admin/submissions/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, reviewNotes, adminId: 'superadmin' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Review action failed');
  return data;
}

export async function triggerWinnerSelection(verifiableSeed?: string) {
  const res = await fetch(`${API_BASE}/api/admin/campaign/select-winners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ verifiableSeed })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Winner selection failed');
  return data;
}

export async function fetchWinners() {
  const res = await fetch(`${API_BASE}/api/admin/winners`, { credentials: 'include' });
  const data = await res.json();
  return data.winners || [];
}

export async function recordWinnerPayment(payload: {
  winnerId: string;
  walletAddress: string;
  bnbAmount: string;
  txHash: string;
}) {
  const res = await fetch(`${API_BASE}/api/admin/payments/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment recording failed');
  return data;
}

