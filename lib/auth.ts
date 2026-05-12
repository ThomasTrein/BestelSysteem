import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

const BAR_SESSION_KEY = 'ksa_bar_session';
const ADMIN_SESSION_KEY = 'ksa_admin_session';
const KASSA_SESSION_KEY = 'ksa_kassa_session';
const KASSA_ATTEMPTS_KEY = 'ksa_kassa_attempts';
const KASSA_DEVICE_KEY = 'ksa_kassa_device_id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(KASSA_DEVICE_KEY);
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem(KASSA_DEVICE_KEY, id);
  }
  return id;
}

async function getPasswords(): Promise<{ barPassword: string; adminPassword: string; kassaPassword: string }> {
  try {
    const d = await getDoc(doc(db, 'settings', 'passwords'));
    if (d.exists()) {
      const data = d.data() as { barPassword?: string; adminPassword?: string; kassaPassword?: string };
      return {
        barPassword: data.barPassword || process.env.NEXT_PUBLIC_BAR_PASSWORD || 'bar123',
        adminPassword: data.adminPassword || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123',
        kassaPassword: data.kassaPassword || process.env.NEXT_PUBLIC_KASSA_PASSWORD || '1234',
      };
    }
  } catch {}
  return {
    barPassword: process.env.NEXT_PUBLIC_BAR_PASSWORD || 'bar123',
    adminPassword: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123',
    kassaPassword: process.env.NEXT_PUBLIC_KASSA_PASSWORD || '1234',
  };
}

export async function loginBar(password: string): Promise<boolean> {
  const { barPassword } = await getPasswords();
  if (password === barPassword) {
    if (typeof window !== 'undefined') sessionStorage.setItem(BAR_SESSION_KEY, '1');
    return true;
  }
  return false;
}

export function checkBarAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(BAR_SESSION_KEY) === '1';
}

export async function isKassaDeviceBlocked(): Promise<boolean> {
  const deviceId = getOrCreateDeviceId();
  try {
    const d = await getDoc(doc(db, 'settings', 'kassaDevices'));
    if (d.exists()) {
      const blocked: string[] = d.data().blocked || [];
      return blocked.includes(deviceId);
    }
  } catch {}
  return false;
}

export function getKassaDeviceId(): string {
  return getOrCreateDeviceId();
}

export async function blockKassaDevice(): Promise<void> {
  const deviceId = getOrCreateDeviceId();
  try {
    const ref = doc(db, 'settings', 'kassaDevices');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { blocked: arrayUnion(deviceId) });
    } else {
      await setDoc(ref, { blocked: [deviceId] });
    }
  } catch {}
}

export async function unblockKassaDevice(deviceId: string): Promise<void> {
  const ref = doc(db, 'settings', 'kassaDevices');
  await updateDoc(ref, { blocked: arrayRemove(deviceId) });
}

export async function getBlockedKassaDevices(): Promise<string[]> {
  try {
    const d = await getDoc(doc(db, 'settings', 'kassaDevices'));
    if (d.exists()) return d.data().blocked || [];
  } catch {}
  return [];
}

export function getKassaAttempts(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(KASSA_ATTEMPTS_KEY) || '0', 10);
}

export function incrementKassaAttempts(): number {
  const current = getKassaAttempts() + 1;
  if (typeof window !== 'undefined') localStorage.setItem(KASSA_ATTEMPTS_KEY, String(current));
  return current;
}

export function resetKassaAttempts(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KASSA_ATTEMPTS_KEY);
}

export async function loginKassa(pin: string): Promise<'ok' | 'wrong' | 'blocked'> {
  const deviceId = getOrCreateDeviceId();
  try {
    const d = await getDoc(doc(db, 'settings', 'kassaDevices'));
    if (d.exists()) {
      const blocked: string[] = d.data().blocked || [];
      if (blocked.includes(deviceId)) return 'blocked';
    }
  } catch {}

  const { kassaPassword } = await getPasswords();
  if (pin === kassaPassword) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(KASSA_SESSION_KEY, '1');
      localStorage.removeItem(KASSA_ATTEMPTS_KEY);
    }
    return 'ok';
  }
  const attempts = incrementKassaAttempts();
  if (attempts >= 3) {
    await blockKassaDevice();
    return 'blocked';
  }
  return 'wrong';
}

export function checkKassaAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(KASSA_SESSION_KEY) === '1';
}

export function logoutKassa() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(KASSA_SESSION_KEY);
}

export async function loginAdmin(password: string): Promise<boolean> {
  const { adminPassword } = await getPasswords();
  if (password === adminPassword) {
    if (typeof window !== 'undefined') sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    return true;
  }
  return false;
}

export function checkAdminAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
}

export function logoutBar() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(BAR_SESSION_KEY);
}

export function logoutAdmin() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function updatePasswords(barPassword: string, adminPassword: string, kassaPassword?: string): Promise<void> {
  const current = kassaPassword === undefined ? await (async () => {
    try {
      const d = await getDoc(doc(db, 'settings', 'passwords'));
      if (d.exists()) return (d.data() as { kassaPassword?: string }).kassaPassword || '1234';
    } catch {}
    return '1234';
  })() : kassaPassword;
  await setDoc(doc(db, 'settings', 'passwords'), { barPassword, adminPassword, kassaPassword: current });
}

