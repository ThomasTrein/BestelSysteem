'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection, query, where, onSnapshot, getDocs, doc,
  updateDoc, orderBy, Timestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Order, OrderItem, MenuCategory, BarScreen } from '@/lib/types';
import { checkBarAuth, loginBar, logoutBar } from '@/lib/auth';

function getStoredColumns(): number {
  if (typeof window === 'undefined') return 2;
  return parseInt(localStorage.getItem('ksa_bar_columns') || '2', 10);
}

export default function SchermPage() {
  const params = useParams();
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

  useEffect(() => {
    if (checkBarAuth()) setAuthed(true);
    setColumns(getStoredColumns());
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
      const screens = screensSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BarScreen));
      setAllScreens(screens);
      const thisScreen = screens.find((s) => s.id === schermId) || null;
      setScreen(thisScreen);

      const catsSnap = await getDocs(collection(db, 'events', ev.id, 'categories'));
      setCategories(catsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuCategory)));

      unsub = onSnapshot(
        query(collection(db, 'events', ev.id, 'orders'), orderBy('createdAt', 'asc')),
        (s) => { setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)); setLoading(false); }
      );
    }
    setup();
    return () => { if (unsub) unsub(); };
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
    return order.items.some(itemMatchesThisScreen);
  }

  function isThisScreenDone(order: Order): boolean {
    return order.screenStatuses?.[schermId] === true;
  }

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

    const allDone = allScreens.every((s) => {
      if (!orderHasItemsForScreen(order, s)) return true;
      return newStatuses[s.id] === true;
    });

    const batch = writeBatch(db);
    const orderRef = doc(db, 'events', event.id, 'orders', order.id);
    batch.update(orderRef, {
      [`screenStatuses.${schermId}`]: true,
      ...(allDone ? { status: 'klaar' } : {}),
    });
    await batch.commit();
  }

  async function undoScreenDone(order: Order) {
    if (!event) return;
    const orderRef = doc(db, 'events', event.id, 'orders', order.id);
    await updateDoc(orderRef, {
      [`screenStatuses.${schermId}`]: false,
      status: 'besteld',
    });
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
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wachtwoord" className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400" autoFocus />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
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
            <a href="/bar" className="text-gray-400 hover:text-white text-sm transition-colors">← Terug naar bar</a>
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              <span className="text-gray-400 text-xs px-1">Kolommen:</span>
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => changeColumns(n)} className={`w-7 h-7 rounded text-sm font-bold transition-colors ${columns === n ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>{n}</button>
              ))}
            </div>
            <button
              onClick={() => setShowKlaar((v) => !v)}
              className={`flex items-center gap-2 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm border ${showKlaar ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white'}`}
            >
              ✓ Klaar
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${showKlaar ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>{done.length}</span>
            </button>
            <button onClick={() => { logoutBar(); setAuthed(false); setOrders([]); setEvent(null); }} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm">
              Afmelden
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : !event ? (
        <div className="flex items-center justify-center h-64 text-gray-500 text-xl">Geen actief evenement gevonden.</div>
      ) : !screen ? (
        <div className="flex items-center justify-center h-64 text-gray-500 text-xl">Scherm niet gevonden.</div>
      ) : (
        <main className="px-4 py-4">
          {pending.length === 0 && !showKlaar && (
            <p className="text-gray-500 text-center py-16 text-lg">Geen nieuwe bestellingen</p>
          )}
          {pending.length > 0 && (
            <div className={`grid ${colClass[columns] || 'grid-cols-2'} gap-4 mb-6`}>
              {pending.map((o) => (
                <SchermOrderCard
                  key={o.id}
                  order={o}
                  fmt={fmt}
                  onMarkDone={canMarkDone ? () => markScreenDone(o) : undefined}
                  onUndo={undefined}
                  isDone={false}
                  otherPendingScreens={getOtherPendingScreens(o)}
                  itemMatchesThisScreen={itemMatchesThisScreen}
                  canMarkDone={canMarkDone}
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
                      fmt={fmt}
                      onMarkDone={undefined}
                      onUndo={() => undoScreenDone(o)}
                      isDone={true}
                      otherPendingScreens={getOtherPendingScreens(o)}
                      itemMatchesThisScreen={itemMatchesThisScreen}
                      canMarkDone={canMarkDone}
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

function SchermOrderCard({
  order,
  fmt,
  onMarkDone,
  onUndo,
  isDone,
  otherPendingScreens,
  itemMatchesThisScreen,
  canMarkDone,
}: {
  order: Order;
  fmt: (t: unknown) => string;
  onMarkDone?: () => void;
  onUndo?: () => void;
  isDone: boolean;
  otherPendingScreens: BarScreen[];
  itemMatchesThisScreen: (item: OrderItem) => boolean;
  canMarkDone: boolean;
}) {
  const myItems = order.items.filter(itemMatchesThisScreen);
  const groups = groupItemsByCategory(myItems);
  const multipleCategories = groups.length > 1;
  const totalVakjes = myItems.reduce((sum, i) => sum + (i.slots || 0) * i.quantity, 0);

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl border-l-4 p-4 ${isDone ? 'border-l-green-500 opacity-70' : 'border-l-red-500'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-2xl font-bold text-white">{order.tableName}</p>
          {order.customerName && <p className="text-gray-300 text-sm font-medium">👤 {order.customerName}</p>}
          <p className="text-gray-500 text-sm">{fmt(order.createdAt)}</p>
        </div>
        {isDone ? (
          <button onClick={onUndo} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            ↩ Herstel
          </button>
        ) : canMarkDone ? (
          <button onClick={onMarkDone} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
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
              {group.items.map((item, i) => (
                <div key={i} className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-gray-100 text-base leading-tight">
                      <span className="font-bold text-white text-lg">{item.quantity}×</span> {item.name}
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
              ))}
            </div>
          </div>
        ))}

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
