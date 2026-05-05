'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Order, OrderItem } from '@/lib/types';
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

  function changeColumns(n: number) {
    setColumns(n);
    localStorage.setItem('ksa_bar_columns', String(n));
  }

  async function toggleStatus(order: Order) {
    if (!event) return;
    await updateDoc(doc(db, 'events', event.id, 'orders', order.id), {
      status: order.status === 'besteld' ? 'klaar' : 'besteld',
    });
  }

  function fmt(t: any): string {
    if (!t) return '';
    try { return (t instanceof Timestamp ? t.toDate() : new Date(t)).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }); }
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
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wachtwoord" className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400" autoFocus />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
            {loginLoading ? 'Controleren...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );

  const besteld = orders.filter((o) => o.status === 'besteld'); // oldest first from Firestore asc
  const klaar = [...orders.filter((o) => o.status === 'klaar')].reverse(); // newest first

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
            {/* Column selector */}
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              <span className="text-gray-400 text-xs px-1">Kolommen:</span>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => changeColumns(n)}
                  className={`w-7 h-7 rounded text-sm font-bold transition-colors ${columns === n ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            {/* Klaar toggle */}
            <button
              onClick={() => setShowKlaar((v) => !v)}
              className={`flex items-center gap-2 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm border ${showKlaar ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white'}`}
            >
              ✓ Klaar
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${showKlaar ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>{klaar.length}</span>
            </button>
            <button
              onClick={() => { logoutBar(); setAuthed(false); setOrders([]); setEvent(null); }}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm"
            >
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
      ) : (
        <main className="px-4 py-4">
          {besteld.length === 0 && !showKlaar && (
            <p className="text-gray-500 text-center py-16 text-lg">Geen nieuwe bestellingen</p>
          )}
          {besteld.length > 0 && (
            <div className={`grid ${colClass[columns] || 'grid-cols-2'} gap-4 mb-6`}>
              {besteld.map((o) => (
                <OrderCard key={o.id} order={o} fmt={fmt} onToggle={() => toggleStatus(o)} />
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
                    <OrderCard key={o.id} order={o} fmt={fmt} onToggle={() => toggleStatus(o)} />
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

function OrderCard({ order, fmt, onToggle }: { order: Order; fmt: (t: any) => string; onToggle: () => void }) {
  const isDone = order.status === 'klaar';
  const totalVakjes = order.items.reduce((sum, i) => sum + (i.slots || 0) * i.quantity, 0);
  const groups = groupItemsByCategory(order.items);
  const multipleCategories = groups.length > 1;

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl border-l-4 p-4 ${isDone ? 'border-l-green-500 opacity-70' : 'border-l-red-500'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-2xl font-bold text-white">{order.tableName}</p>
          {order.customerName && <p className="text-gray-300 text-sm font-medium">👤 {order.customerName}</p>}
          <p className="text-gray-500 text-sm">{fmt(order.createdAt)}</p>
        </div>
        <button
          onClick={onToggle}
          className={`font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${isDone ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-green-600 hover:bg-green-700 text-white'}`}
        >
          {isDone ? '↩ Herstel' : '✓ Klaar'}
        </button>
      </div>

      <div className="space-y-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {multipleCategories && (
              <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1 mt-2 first:mt-0">{group.category}</p>
            )}
            <div className="space-y-1">
              {group.items.map((item, i) => (
                <div key={i} className="bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-700/50">
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

        {order.drankkaarten > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
            <p className="text-yellow-400 font-semibold">🎫 {order.drankkaarten} drankkaart{order.drankkaarten !== 1 ? 'en' : ''}</p>
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

