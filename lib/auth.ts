const BAR_PASSWORD_KEY = 'ksa_bar_auth';
const ADMIN_PASSWORD_KEY = 'ksa_admin_auth';

export function checkBarAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(BAR_PASSWORD_KEY) === process.env.NEXT_PUBLIC_BAR_PASSWORD;
}

export function loginBar(password: string): boolean {
  const correct = password === process.env.NEXT_PUBLIC_BAR_PASSWORD;
  if (correct) sessionStorage.setItem(BAR_PASSWORD_KEY, password);
  return correct;
}

export function checkAdminAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_PASSWORD_KEY) === process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
}

export function loginAdmin(password: string): boolean {
  const correct = password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  if (correct) sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
  return correct;
}

export function logoutBar() {
  sessionStorage.removeItem(BAR_PASSWORD_KEY);
}

export function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
}
