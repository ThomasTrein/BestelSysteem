import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const BAR_SESSION_KEY = 'ksa_bar_session';
const ADMIN_SESSION_KEY = 'ksa_admin_session';

async function getPasswords(): Promise<{ barPassword: string; adminPassword: string }> {
  try {
    const d = await getDoc(doc(db, 'settings', 'passwords'));
    if (d.exists()) {
      const data = d.data() as { barPassword?: string; adminPassword?: string };
      return {
        barPassword: data.barPassword || process.env.NEXT_PUBLIC_BAR_PASSWORD || 'bar123',
        adminPassword: data.adminPassword || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123',
      };
    }
  } catch {}
  return {
    barPassword: process.env.NEXT_PUBLIC_BAR_PASSWORD || 'bar123',
    adminPassword: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123',
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

export async function updatePasswords(barPassword: string, adminPassword: string): Promise<void> {
  await setDoc(doc(db, 'settings', 'passwords'), { barPassword, adminPassword });
}
