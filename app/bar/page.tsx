'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Order, OrderItem, BarScreen } from '@/lib/types';
import { checkBarAuth, loginBar, logoutBar } from '@/lib/auth';

function getStoredColumns(): number {
  if (typeof window === 'undefined') return 2;
  return parseInt(localStorage.getItem('ksa_bar_columns') || '2', 10);
}

export default function BarPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allScreens, setAllScreens] = useState<BarScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<number>(2);
  const [showKlaar, setShowKlaar] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (checkBarAuth()) setAuthed(true);
    setColumns(getStoredColumns());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authed) return;
    let unsub: (() => void) | undefined;
    async function setup() {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'events'), where('active', '==', true)));
      if (snap.empty) { setLoading(false); return; }
      const ev = { id: snap.docs[0].id, ...snap.docs[0].data() } as Event;
      setEvent(ev);
      const screensSnap = await getDocs(collection(db, 'events', ev.id, 'screens'));
      setAllScreens(screensSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BarScreen)));
      unsub = onSnapshot(
        query(collection(db, 'events', ev.id, 'orders'), orderBy('createdAt', 'asc')),
        (s) => { setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)); setLoading(false); }
      );
    }
    setup();
    return () => { if (unsub) unsub(); };
  }, [authed]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    const ok = await loginBar(password);
    setLoginLoading(false);
    if (ok) { setAuthed(true); setLoginError(''); }
    else setLoginError('Ongeldig wachtwoord. Probeer opnieuw.');
  }

  async function toggleItem(order: Order, itemIndex: number) {
    if (!event) return;
    const current = order.itemStatuses?.[String(itemIndex)] ?? false;
    const newVal = !current;
    const newItemStatuses = { ...(order.itemStatuses || {}), [String(itemIndex)]: newVal };
    const allDone = order.items.every((_, i) => newItemStatuses[String(i)] === true);
    const orderRef = doc(db, 'events', event.id, 'orders', order.id);
    const updates: Record<string, unknown> = { [`itemStatuses.${itemIndex}`]: newVal };
    if (allDone) { updates.status = 'klaar'; updates.completedAt = serverTimestamp(); }
    else if (order.status === 'klaar') { updates.status = 'besteld'; updates.completedAt = null; }
    await updateDoc(orderRef, updates);
  }

  function changeColumns(n: number) {
    setColumns(n);
    localStorage.setItem('ksa_bar_columns', String(n));
  }

  function fmt(t: unknown): string {
    if (!t) return '';
    try { return (t instanceof Timestamp ? t.toDate() : new Date(t as string)).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          ← Terug naar home
        </a>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">🍹 Barscherm</h1>
        <p className="text-gray-400 text-center mb-6">Log in om bestellingen te bekijken</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wachtwoord" className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-gray-400" autoFocus />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className="w-full bg-[var(--accent)] hover:brightness-90 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50">
            {loginLoading ? 'Controleren...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );

  const besteld = orders.filter((o) => o.status === 'besteld');
  const klaar = [...orders.filter((o) => o.status === 'klaar')].reverse();

  const colClass: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">🍹 Barscherm</h1>
              {event && <p className="text-gray-400 text-xs">{event.name}</p>}
            </div>
            {besteld.length > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-full px-3 py-1 text-sm">
                {besteld.length} wachtend
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              <span className="text-gray-400 text-xs px-1">Kolommen:</span>
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => changeColumns(n)} className={`w-7 h-7 rounded text-sm font-bold transition-colors ${columns === n ? 'bg-[var(--accent)] text-white' : 'text-gray-400 hover:text-white'}`}>{n}</button>
              ))}
            </div>
            <button
              onClick={() => setShowKlaar((v) => !v)}
              className={`flex items-center gap-2 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm border ${showKlaar ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white'}`}
            >
              ✓ Klaar
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${showKlaar ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>{klaar.length}</span>
            </button>
            <button onClick={() => { logoutBar(); setAuthed(false); setOrders([]); setEvent(null); }} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm">
              Afmelden
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
        </div>
      ) : !event ? (
        <div className="flex items-center justify-center h-64 text-gray-500 text-xl">Geen actief evenement gevonden.</div>
      ) : (
        <main className="px-4 py-4">
          {besteld.length === 0 && !showKlaar && (
            <p className="text-gray-500 text-center py-16 text-lg">Geen nieuwe bestellingen</p>
          )}
          {besteld.length > 0 && (
            <div className={`grid ${colClass[columns] || 'grid-cols-2'} gap-4 mb-6`}>
              {besteld.map((o) => (
                <OrderCard key={o.id} order={o} fmt={fmt} allScreens={allScreens} now={now} onToggleItem={(idx) => toggleItem(o, idx)} />
              ))}
            </div>
          )}
          {showKlaar && (
            <>
              <div className="border-t border-gray-700 pt-4 mb-4">
                <h2 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                  Klaar ({klaar.length})
                </h2>
              </div>
              {klaar.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Nog geen afgewerkte bestellingen</p>
              ) : (
                <div className={`grid ${colClass[columns] || 'grid-cols-2'} gap-4`}>
                  {klaar.map((o) => (
                    <OrderCard key={o.id} order={o} fmt={fmt} allScreens={allScreens} now={now} onToggleItem={(idx) => toggleItem(o, idx)} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}
    </div>
  );
}

function groupItemsByCategory(items: OrderItem[]): { category: string; items: OrderItem[] }[] {
  const map = new Map<string, OrderItem[]>();
  for (const item of items) {
    const cat = item.categoryName || 'Overige';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

function formatDuration(ms: number): string {
  if (ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function OrderCard({ order, fmt, allScreens, now, onToggleItem }: {
  order: Order;
  fmt: (t: unknown) => string;
  allScreens: BarScreen[];
  now: number;
  onToggleItem: (itemIndex: number) => void;
}) {
  const isDone = order.status === 'klaar';
  const totalVakjes = order.items.reduce((sum, i) => sum + (i.slots || 0) * i.quantity, 0);
  const groups = groupItemsByCategory(order.items);
  const multipleCategories = groups.length > 1;
  const screenStatuses = order.screenStatuses || {};

  const createdMs = order.createdAt instanceof Timestamp ? order.createdAt.toDate().getTime() : null;
  const completedMs = order.completedAt instanceof Timestamp ? order.completedAt.toDate().getTime() : null;
  const elapsedMs = isDone && completedMs && createdMs ? completedMs - createdMs : createdMs ? now - createdMs : null;

  // Build a flat list of items with their original indices for toggling
  const flatItems: { item: OrderItem; originalIndex: number }[] = order.items.map((item, i) => ({ item, originalIndex: i }));
  const itemsByCategory = new Map<string, { item: OrderItem; originalIndex: number }[]>();
  for (const { item, originalIndex } of flatItems) {
    const cat = item.categoryName || 'Overige';
    if (!itemsByCategory.has(cat)) itemsByCategory.set(cat, []);
    itemsByCategory.get(cat)!.push({ item, originalIndex });
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl border-l-4 p-4 ${isDone ? 'border-l-green-500 opacity-70' : 'border-l-red-500'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-2xl font-bold text-white">{order.tableName}</p>
          {order.customerName && <p className="text-gray-300 text-sm font-medium">👤 {order.customerName}</p>}
          <p className="text-gray-500 text-sm">{fmt(order.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${isDone ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {isDone ? '✓ Klaar' : '⏳ Wacht'}
          </span>
          {elapsedMs !== null && (
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${isDone ? 'text-green-400' : 'text-yellow-400'}`}>
              ⏱ {formatDuration(elapsedMs)}
            </span>
          )}
        </div>
      </div>

      {allScreens.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {allScreens.map((s) => {
            const done = screenStatuses[s.id] === true;
            return (
              <span key={s.id} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${done ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>
                {done ? '✓' : '⏳'} {s.name}
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {multipleCategories && (
              <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1 mt-2 first:mt-0">{group.category}</p>
            )}
            <div className="space-y-1">
              {(itemsByCategory.get(group.category) || []).map(({ item, originalIndex }) => {
                const itemDone = order.itemStatuses?.[String(originalIndex)] ?? false;
                return (
                  <button
                    key={originalIndex}
                    type="button"
                    onClick={() => onToggleItem(originalIndex)}
                    className={`w-full text-left rounded-lg px-3 py-2 border transition-colors cursor-pointer ${itemDone ? 'bg-green-500/20 border-green-500/40 opacity-60' : 'bg-gray-700/50 border-gray-700/50 hover:bg-gray-700'}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-base leading-tight ${itemDone ? 'line-through text-gray-400' : 'text-gray-100'}`}>
                        <span className={`font-bold text-lg ${itemDone ? 'text-gray-400' : 'text-white'}`}>{item.quantity}×</span> {item.name}
                        {itemDone && <span className="ml-2 text-green-400 text-sm no-underline">✓</span>}
                      </p>
                      <span className="text-gray-500 text-xs shrink-0">{(item.slots || 0) * item.quantity}vk</span>
                    </div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedOptions.map((opt, oi) => (
                          opt.selected.length > 0 && (
                            <p key={oi} className="text-gray-400 text-sm">
                              <span className="text-gray-500">{opt.groupName}:</span> {opt.selected.join(', ')}
                            </p>
                          )
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {order.drankkaarten > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
            <p className="text-yellow-400 font-semibold">
              🎫 {order.drankkaarten} drankkaart{order.drankkaarten !== 1 ? 'en' : ''}
              {order.drankkaartPaymentMethod && (
                <span className="ml-2 text-sm font-normal bg-yellow-400/20 px-2 py-0.5 rounded-full">
                  💳 {order.drankkaartPaymentMethod}
                </span>
              )}
            </p>
          </div>
        )}
        {order.note && (
          <div className="bg-gray-700/40 rounded-lg px-3 py-2">
            <p className="text-gray-400 text-sm">💬 {order.note}</p>
          </div>
        )}
        {totalVakjes > 0 && (
          <p className="text-gray-600 text-xs border-t border-gray-700 pt-2">
            Totaal: {totalVakjes} vakjes
          </p>
        )}
      </div>
    </div>
  );
}