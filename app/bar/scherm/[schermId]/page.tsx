'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  collection, query, where, onSnapshot, getDocs, doc,
  updateDoc, orderBy, Timestamp, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Order, OrderItem, MenuCategory, BarScreen } from '@/lib/types';
import { checkBarAuth, loginBar, logoutBar } from '@/lib/auth';
import { setupAudioUnlock, playDing } from '@/lib/notificationSound';

function getStoredColumns(): number {
  if (typeof window === 'undefined') return 2;
  return parseInt(localStorage.getItem('ksa_bar_columns') || '2', 10);
}

function getStoredSound(schermId: string): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(`ksa_bar_sound_${schermId}`);
  return v === null ? true : v === '1';
}

export default function SchermPage() {
  const params = useParams();
  const router = useRouter();
  const schermId = params.schermId as string;

  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [screen, setScreen] = useState<BarScreen | null>(null);
  const [allScreens, setAllScreens] = useState<BarScreen[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<number>(2);
  const [showKlaar, setShowKlaar] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const seenOrderIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (checkBarAuth()) setAuthed(true);
    setColumns(getStoredColumns());
    setSoundEnabled(getStoredSound(schermId));
    setupAudioUnlock();
  }, [schermId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authed) return;
    let unsubOrders: (() => void) | undefined;
    let unsubScreens: (() => void) | undefined;
    async function setup() {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'events'), where('active', '==', true)));
      if (snap.empty) { setLoading(false); return; }
      const ev = { id: snap.docs[0].id, ...snap.docs[0].data() } as Event;
      setEvent(ev);

      unsubScreens = onSnapshot(collection(db, 'events', ev.id, 'screens'), (screensSnap) => {
        const screens = screensSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BarScreen));
        setAllScreens(screens);
        setScreen(screens.find((s) => s.id === schermId) || null);
      });

      const catsSnap = await getDocs(collection(db, 'events', ev.id, 'categories'));
      setCategories(catsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuCategory)));

      unsubOrders = onSnapshot(
        query(collection(db, 'events', ev.id, 'orders'), orderBy('createdAt', 'asc')),
        (s) => { setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)); setLoading(false); }
      );
    }
    setup();
    return () => { if (unsubOrders) unsubOrders(); if (unsubScreens) unsubScreens(); };
  }, [authed, schermId]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    const ok = await loginBar(password);
    setLoginLoading(false);
    if (ok) { setAuthed(true); setLoginError(''); }
    else setLoginError('Ongeldig wachtwoord. Probeer opnieuw.');
  }

  function changeColumns(n: number) {
    setColumns(n);
    localStorage.setItem('ksa_bar_columns', String(n));
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(`ksa_bar_sound_${schermId}`, next ? '1' : '0');
  }

  const screenCategoryNames = new Set(
    (screen?.categoryIds || []).map((catId) => categories.find((c) => c.id === catId)?.name).filter(Boolean) as string[]
  );
  const screenItemIds = new Set(screen?.itemIds || []);

  function itemMatchesScreen(item: OrderItem, s: BarScreen): boolean {
    const catNames = new Set(
      (s.categoryIds || []).map((catId) => categories.find((c) => c.id === catId)?.name).filter(Boolean) as string[]
    );
    const itemIds = new Set(s.itemIds || []);
    return catNames.has(item.categoryName) || itemIds.has(item.itemId);
  }

  function itemMatchesThisScreen(item: OrderItem): boolean {
    return screenCategoryNames.has(item.categoryName) || screenItemIds.has(item.itemId);
  }

  function orderHasItemsForScreen(order: Order, s: BarScreen): boolean {
    return order.items.some((item) => itemMatchesScreen(item, s));
  }

  function orderMatchesThisScreen(order: Order): boolean {
    if (screen?.hasDrankkaarten && (order.drankkaarten || 0) > 0) return true;
    return order.items.some(itemMatchesThisScreen);
  }

  function isThisScreenDone(order: Order): boolean {
    return order.screenStatuses?.[schermId] === true;
  }

  // Play a "ding" for orders that are new (arrived after this page was opened)
  // and relevant to this screen. Skips the very first snapshot so pre-existing
  // orders never trigger a sound on load.
  useEffect(() => {
    const relevantIds = orders.filter(orderMatchesThisScreen).map((o) => o.id);
    if (seenOrderIdsRef.current === null) {
      seenOrderIdsRef.current = new Set(relevantIds);
      return;
    }
    const hasNew = relevantIds.some((id) => !seenOrderIdsRef.current!.has(id));
    seenOrderIdsRef.current = new Set(relevantIds);
    if (hasNew && soundEnabled) playDing();
    // orderMatchesThisScreen is intentionally omitted: it is recreated every render from
    // screen/categories, which are already listed as dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, screen, categories, soundEnabled]);

  function getOtherPendingScreens(order: Order): BarScreen[] {
    return allScreens.filter((s) => {
      if (s.id === schermId) return false;
      if (!orderHasItemsForScreen(order, s)) return false;
      return order.screenStatuses?.[s.id] !== true;
    });
  }

  async function markScreenDone(order: Order) {
    if (!event) return;
    const newStatuses = { ...(order.screenStatuses || {}), [schermId]: true };

    // Mark all items matching this screen as done in itemStatuses
    const itemUpdates: Record<string, unknown> = {};
    order.items.forEach((item, i) => {
      if (itemMatchesThisScreen(item)) {
        itemUpdates[`itemStatuses.${i}`] = true;
      }
    });

    // Mark drankkaarten as done if this screen handles them
    const drankkaartUpdate: Record<string, unknown> = {};
    if (screen?.hasDrankkaarten && (order.drankkaarten || 0) > 0) {
      drankkaartUpdate.drankkaartDone = true;
    }

    const newItemStatuses = { ...(order.itemStatuses || {}) };
    order.items.forEach((item, i) => {
      if (itemMatchesThisScreen(item)) newItemStatuses[String(i)] = true;
    });
    const drankkaartDone = (drankkaartUpdate.drankkaartDone as boolean | undefined) ?? (order.drankkaartDone ?? ((order.drankkaarten || 0) === 0));

    const allDone = allScreens.every((s) => {
      if (s.hasDrankkaarten && (order.drankkaarten || 0) > 0) {
        if (!drankkaartDone && s.id !== schermId) return false;
      }
      if (!orderHasItemsForScreen(order, s)) return !s.hasDrankkaarten || (order.drankkaarten || 0) === 0 || drankkaartDone;
      return s.id === schermId ? true : newStatuses[s.id] === true;
    });

    const batch = writeBatch(db);
    const orderRef = doc(db, 'events', event.id, 'orders', order.id);
    batch.update(orderRef, {
      [`screenStatuses.${schermId}`]: true,
      [`screenCompletedAt.${schermId}`]: serverTimestamp(),
      ...itemUpdates,
      ...drankkaartUpdate,
      ...(allDone ? { status: 'klaar', completedAt: serverTimestamp() } : {}),
    });
    await batch.commit();
  }

  async function undoScreenDone(order: Order) {
    if (!event) return;
    const orderRef = doc(db, 'events', event.id, 'orders', order.id);
    // Reset itemStatuses for items that were auto-checked by markScreenDone
    const itemResets: Record<string, unknown> = {};
    order.items.forEach((item, i) => {
      if (itemMatchesThisScreen(item)) {
        itemResets[`itemStatuses.${i}`] = false;
      }
    });
    const drankkaartReset = screen?.hasDrankkaarten && (order.drankkaarten || 0) > 0 ? { drankkaartDone: false } : {};
    await updateDoc(orderRef, {
      [`screenStatuses.${schermId}`]: false,
      status: 'besteld',
      completedAt: null,
      ...itemResets,
      ...drankkaartReset,
    });
  }

  async function toggleItemStatus(order: Order, itemIndex: number) {
    if (!event) return;
    const current = order.itemStatuses?.[String(itemIndex)] ?? false;
    const newVal = !current;
    const newItemStatuses = { ...(order.itemStatuses || {}), [String(itemIndex)]: newVal };
    const updates: Record<string, unknown> = { [`itemStatuses.${itemIndex}`]: newVal };

    // Check if all items for THIS screen are now done
    const myItemIndices = order.items.map((item, i) => ({ item, i })).filter(({ item }) => itemMatchesThisScreen(item));
    const allMyItemsDone = myItemIndices.every(({ i }) => newItemStatuses[String(i)] === true);
    const drankkaartHandled = !screen?.hasDrankkaarten || (order.drankkaarten || 0) === 0 || (order.drankkaartDone ?? false);
    const thisScreenNowDone = allMyItemsDone && drankkaartHandled;

    if (newVal && thisScreenNowDone && order.screenStatuses?.[schermId] !== true) {
      // Auto-mark this screen as done
      updates[`screenStatuses.${schermId}`] = true;
      updates[`screenCompletedAt.${schermId}`] = serverTimestamp();
      // Check if ALL screens are now done → mark order klaar
      const newScreenStatuses = { ...(order.screenStatuses || {}), [schermId]: true };
      const newDrankkaartDone = order.drankkaartDone ?? ((order.drankkaarten || 0) === 0);
      const allDone = allScreens.every((s) => {
        if (!orderHasItemsForScreen(order, s)) return !s.hasDrankkaarten || (order.drankkaarten || 0) === 0 || newDrankkaartDone;
        return newScreenStatuses[s.id] === true;
      }) && newDrankkaartDone;
      if (allDone) { updates.status = 'klaar'; updates.completedAt = serverTimestamp(); }
    } else if (!newVal && order.screenStatuses?.[schermId] === true) {
      // Untick: undo this screen's done status
      updates[`screenStatuses.${schermId}`] = false;
      if (order.status === 'klaar') { updates.status = 'besteld'; updates.completedAt = null; }
    } else if (order.status === 'klaar' && !thisScreenNowDone) {
      updates.status = 'besteld'; updates.completedAt = null;
    }

    const orderRef = doc(db, 'events', event.id, 'orders', order.id);
    await updateDoc(orderRef, updates);
  }

  async function toggleDrankkaartDone(order: Order) {
    if (!event) return;
    const current = order.drankkaartDone ?? false;
    const newVal = !current;
    const updates: Record<string, unknown> = { drankkaartDone: newVal };

    // Check if all items for THIS screen are now done
    const myItemIndices = order.items.map((item, i) => ({ item, i })).filter(({ item }) => itemMatchesThisScreen(item));
    const allMyItemsDone = myItemIndices.every(({ i }) => (order.itemStatuses?.[String(i)] ?? false) === true);
    const thisScreenNowDone = allMyItemsDone && newVal;

    if (newVal && thisScreenNowDone && order.screenStatuses?.[schermId] !== true) {
      updates[`screenStatuses.${schermId}`] = true;
      updates[`screenCompletedAt.${schermId}`] = serverTimestamp();
      const newScreenStatuses = { ...(order.screenStatuses || {}), [schermId]: true };
      const allDone = allScreens.every((s) => {
        if (!orderHasItemsForScreen(order, s)) return !s.hasDrankkaarten || (order.drankkaarten || 0) === 0 || newVal;
        return newScreenStatuses[s.id] === true;
      }) && newVal;
      if (allDone) { updates.status = 'klaar'; updates.completedAt = serverTimestamp(); }
    } else if (!newVal && order.screenStatuses?.[schermId] === true) {
      updates[`screenStatuses.${schermId}`] = false;
      if (order.status === 'klaar') { updates.status = 'besteld'; updates.completedAt = null; }
    } else if (order.status === 'klaar' && !thisScreenNowDone) {
      updates.status = 'besteld'; updates.completedAt = null;
    }

    const orderRef = doc(db, 'events', event.id, 'orders', order.id);
    await updateDoc(orderRef, updates);
  }

  function fmt(t: unknown): string {
    if (!t) return '';
    try { return (t instanceof Timestamp ? t.toDate() : new Date(t as string)).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  const myOrders = orders.filter(orderMatchesThisScreen);
  const pending = myOrders.filter((o) => !isThisScreenDone(o));
  const done = [...myOrders.filter((o) => isThisScreenDone(o))].reverse();

  const colClass: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
  };

  const canMarkDone = screen?.canMarkDone !== false;

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">← Terug naar home</a>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">🖥️ Barscherm</h1>
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

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">🖥️ {screen?.name || 'Scherm'}</h1>
              {event && <p className="text-gray-400 text-xs">{event.name}</p>}
            </div>
            {pending.length > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-full px-3 py-1 text-sm">
                {pending.length} wachtend
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              <span className="hidden sm:inline text-gray-400 text-xs px-1">Kolommen:</span>
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => changeColumns(n)} className={`w-9 h-9 rounded text-sm font-bold transition-colors ${columns === n ? 'bg-[var(--accent)] text-white' : 'text-gray-400 hover:text-white'}`}>{n}</button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              <button
                onClick={toggleSound}
                title={soundEnabled ? 'Geluid staat aan' : 'Geluid staat uit'}
                className={`flex items-center gap-1 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm ${soundEnabled ? 'text-white' : 'text-gray-500'}`}
              >
                {soundEnabled ? '🔔' : '🔕'}
                <span className="hidden sm:inline">{soundEnabled ? 'Geluid aan' : 'Geluid uit'}</span>
              </button>
              <button
                onClick={() => playDing()}
                title="Test geluid"
                className="text-gray-400 hover:text-white py-1.5 px-2 rounded-lg transition-colors text-sm"
              >
                🔊 Test
              </button>
            </div>
            <button
              onClick={() => setShowKlaar((v) => !v)}
              className={`flex items-center gap-2 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm border ${showKlaar ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white'}`}
            >
              ✓ Klaar
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${showKlaar ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>{done.length}</span>
            </button>
            <button onClick={() => { logoutBar(); router.push('/'); }} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm">
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
      ) : !screen ? (
        <div className="flex items-center justify-center h-64 text-gray-500 text-xl">Scherm niet gevonden.</div>
      ) : (
        <main className="px-4 py-4 2xl:px-8 2xl:py-6">
          {pending.length === 0 && !showKlaar && (
            <p className="text-gray-500 text-center py-16 text-lg">Geen nieuwe bestellingen</p>
          )}
          {pending.length > 0 && (
            <div className={`grid ${colClass[columns] || 'grid-cols-2'} gap-4 mb-6`}>
              {pending.map((o) => (
                <SchermOrderCard
                  key={o.id}
                  order={o}
                  schermId={schermId}
                  fmt={fmt}
                  onMarkDone={canMarkDone ? () => markScreenDone(o) : undefined}
                  onUndo={undefined}
                  isDone={false}
                  otherPendingScreens={getOtherPendingScreens(o)}
                  itemMatchesThisScreen={itemMatchesThisScreen}
                  canMarkDone={canMarkDone}
                  hasDrankkaarten={screen?.hasDrankkaarten ?? false}
                  now={now}
                  onToggleItem={(idx) => toggleItemStatus(o, idx)}
                  onToggleDrankkaart={() => toggleDrankkaartDone(o)}
                />
              ))}
            </div>
          )}
          {showKlaar && (
            <>
              <div className="border-t border-gray-700 pt-4 mb-4">
                <h2 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                  Klaar ({done.length})
                </h2>
              </div>
              {done.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Nog geen afgewerkte bestellingen</p>
              ) : (
                <div className={`grid ${colClass[columns] || 'grid-cols-2'} gap-4`}>
                  {done.map((o) => (
                    <SchermOrderCard
                      key={o.id}
                      order={o}
                      schermId={schermId}
                      fmt={fmt}
                      onMarkDone={undefined}
                      onUndo={() => undoScreenDone(o)}
                      isDone={true}
                      otherPendingScreens={getOtherPendingScreens(o)}
                      itemMatchesThisScreen={itemMatchesThisScreen}
                      canMarkDone={canMarkDone}
                      hasDrankkaarten={screen?.hasDrankkaarten ?? false}
                      now={now}
                      onToggleItem={(idx) => toggleItemStatus(o, idx)}
                      onToggleDrankkaart={() => toggleDrankkaartDone(o)}
                    />
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

function SchermOrderCard({
  order,
  schermId,
  fmt,
  onMarkDone,
  onUndo,
  isDone,
  otherPendingScreens,
  itemMatchesThisScreen,
  canMarkDone,
  hasDrankkaarten,
  now,
  onToggleItem,
  onToggleDrankkaart,
}: {
  order: Order;
  schermId: string;
  fmt: (t: unknown) => string;
  onMarkDone?: () => void;
  onUndo?: () => void;
  isDone: boolean;
  otherPendingScreens: BarScreen[];
  itemMatchesThisScreen: (item: OrderItem) => boolean;
  canMarkDone: boolean;
  hasDrankkaarten: boolean;
  now: number;
  onToggleItem: (itemIndex: number) => void;
  onToggleDrankkaart: () => void;
}) {
  const myItems = order.items.filter(itemMatchesThisScreen);
  const groups = groupItemsByCategory(myItems);
  const multipleCategories = groups.length > 1;
  const totalVakjes = myItems.reduce((sum, i) => sum + (i.slots || 0) * i.quantity, 0);

  const createdMs = order.createdAt instanceof Timestamp ? order.createdAt.toDate().getTime() : null;
  const screenCompletedAt = order.screenCompletedAt?.[schermId];
  const completedMs = screenCompletedAt instanceof Timestamp ? screenCompletedAt.toDate().getTime() : null;
  const elapsedMs = isDone && completedMs && createdMs ? completedMs - createdMs : createdMs ? now - createdMs : null;

  // Map myItems back to their original indices in order.items
  const itemsWithIndex = order.items.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => itemMatchesThisScreen(item));
  const indexedByCategory = new Map<string, { item: OrderItem; originalIndex: number }[]>();
  for (const { item, originalIndex } of itemsWithIndex) {
    const cat = item.categoryName || 'Overige';
    if (!indexedByCategory.has(cat)) indexedByCategory.set(cat, []);
    indexedByCategory.get(cat)!.push({ item, originalIndex });
  }

  const showDrankkaarten = hasDrankkaarten && order.drankkaarten > 0;
  const drankkaartDone = order.drankkaartDone ?? false;

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl border-l-4 p-4 ${isDone ? 'border-l-green-500 opacity-70' : 'border-l-red-500'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-2xl font-bold text-white">{order.tableName}</p>
          {order.customerName && <p className="text-gray-300 text-sm font-medium">👤 {order.customerName}</p>}
          <p className="text-gray-500 text-sm">{fmt(order.createdAt)}</p>
          {elapsedMs !== null && (
            <span className={`text-xs font-mono font-semibold ${isDone ? 'text-green-400' : 'text-yellow-400'}`}>
              ⏱ {formatDuration(elapsedMs)}
            </span>
          )}
        </div>
        {isDone ? (
          <button onClick={onUndo} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            ↩ Herstel
          </button>
        ) : canMarkDone ? (
          <button onClick={onMarkDone} className="bg-[var(--accent)] hover:brightness-90 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm">
            ✓ Klaar
          </button>
        ) : (
          <span className="text-xs text-gray-500 bg-gray-700 px-3 py-1.5 rounded-lg">Alleen-lezen</span>
        )}
      </div>

      {otherPendingScreens.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {otherPendingScreens.map((s) => (
            <span key={s.id} className="bg-orange-500/15 text-orange-400 border border-orange-500/30 text-xs px-2 py-0.5 rounded-full">
              ⏳ {s.name}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {multipleCategories && (
              <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1 mt-2 first:mt-0">{group.category}</p>
            )}
            <div className="space-y-1">
              {(indexedByCategory.get(group.category) || []).map(({ item, originalIndex }) => {
                const itemDone = order.itemStatuses?.[String(originalIndex)] ?? false;
                if (!canMarkDone) {
                  return (
                    <div
                      key={originalIndex}
                      className={`w-full rounded-lg px-3 py-2 border ${itemDone ? 'bg-[var(--accent)]/20 border-[var(--accent)]/40 opacity-60' : 'bg-[var(--accent)]/10 border-[var(--accent)]/30'}`}
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
                    </div>
                  );
                }
                return (
                  <button
                    key={originalIndex}
                    type="button"
                    onClick={() => onToggleItem(originalIndex)}
                    className={`w-full text-left rounded-lg px-3 py-2 border transition-colors cursor-pointer ${itemDone ? 'bg-[var(--accent)]/20 border-[var(--accent)]/40 opacity-60' : 'bg-[var(--accent)]/10 border-[var(--accent)]/30 hover:bg-[var(--accent)]/20'}`}
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

        {showDrankkaarten && (
          canMarkDone ? (
            <button
              type="button"
              onClick={onToggleDrankkaart}
              className={`w-full text-left rounded-lg px-3 py-2 border transition-colors cursor-pointer ${drankkaartDone ? 'bg-green-500/20 border-green-500/40 opacity-60' : 'bg-yellow-400/10 border-yellow-400/20 hover:bg-yellow-400/20'}`}
            >
              <p className={`font-semibold ${drankkaartDone ? 'line-through text-gray-400' : 'text-yellow-400'}`}>
                🎫 {order.drankkaarten} drankkaart{order.drankkaarten !== 1 ? 'en' : ''}
                {drankkaartDone && <span className="ml-2 text-green-400 text-sm no-underline">✓</span>}
                {order.drankkaartPaymentMethod && !drankkaartDone && (
                  <span className="ml-2 text-sm font-normal bg-yellow-400/20 px-2 py-0.5 rounded-full">
                    💳 {order.drankkaartPaymentMethod}
                  </span>
                )}
              </p>
            </button>
          ) : (
            <div className={`rounded-lg px-3 py-2 border ${drankkaartDone ? 'bg-green-500/20 border-green-500/40 opacity-60' : 'bg-yellow-400/10 border-yellow-400/20'}`}>
              <p className={`font-semibold ${drankkaartDone ? 'line-through text-gray-400' : 'text-yellow-400'}`}>
                🎫 {order.drankkaarten} drankkaart{order.drankkaarten !== 1 ? 'en' : ''}
                {drankkaartDone && <span className="ml-2 text-green-400 text-sm no-underline">✓</span>}
                {order.drankkaartPaymentMethod && !drankkaartDone && (
                  <span className="ml-2 text-sm font-normal bg-yellow-400/20 px-2 py-0.5 rounded-full">
                    💳 {order.drankkaartPaymentMethod}
                  </span>
                )}
              </p>
            </div>
          )
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
