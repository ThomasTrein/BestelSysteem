'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Order } from '@/lib/types';
import { checkBarAuth, loginBar, logoutBar } from '@/lib/auth';

export default function BarPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (checkBarAuth()) setAuthed(true); }, []);

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

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginBar(password)) { setAuthed(true); setLoginError(''); }
    else setLoginError('Ongeldig wachtwoord. Probeer opnieuw.');
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
        <h1 className="text-2xl font-bold text-white mb-2 text-center">🍹 Barscherm</h1>
        <p className="text-gray-400 text-center mb-6">Log in om bestellingen te bekijken</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wachtwoord" className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400" autoFocus />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors">Inloggen</button>
        </form>
      </div>
    </div>
  );

  const besteld = orders.filter((o) => o.status === 'besteld');
  const klaar = orders.filter((o) => o.status === 'klaar');

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">🍹 Barscherm</h1>
            {event && <p className="text-gray-400 text-sm">{event.name}</p>}
          </div>
          <div className="flex items-center gap-4">
            {besteld.length > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-full px-4 py-1.5 text-base">
                {besteld.length} wachtend
              </span>
            )}
            <button
              onClick={() => { logoutBar(); setAuthed(false); setOrders([]); setEvent(null); }}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
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
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                Besteld
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-3 py-0.5 text-base font-semibold">
                  {besteld.length}
                </span>
              </h2>
              <div className="space-y-4">
                {besteld.length === 0 && <p className="text-gray-500 text-center py-8">Geen nieuwe bestellingen</p>}
                {besteld.map((o) => <OrderCard key={o.id} order={o} fmt={fmt} onToggle={() => toggleStatus(o)} />)}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
                Klaar
                <span className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-3 py-0.5 text-base font-semibold">
                  {klaar.length}
                </span>
              </h2>
              <div className="space-y-4">
                {klaar.length === 0 && <p className="text-gray-500 text-center py-8">Nog geen afgewerkte bestellingen</p>}
                {klaar.map((o) => <OrderCard key={o.id} order={o} fmt={fmt} onToggle={() => toggleStatus(o)} />)}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function OrderCard({ order, fmt, onToggle }: { order: Order; fmt: (t: any) => string; onToggle: () => void }) {
  const isDone = order.status === 'klaar';
  const totalVakjes = order.items.reduce((sum, i) => sum + (i.slots || 0) * i.quantity, 0);
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl border-l-4 p-4 ${isDone ? 'border-l-green-500 opacity-60' : 'border-l-red-500'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-2xl font-bold text-white">{order.tableName}</p>
          <p className="text-gray-500 text-sm">{fmt(order.createdAt)}</p>
        </div>
        <button
          onClick={onToggle}
          className={`font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${isDone ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-green-600 hover:bg-green-700 text-white'}`}
        >
          {isDone ? '↩ Herstel' : '✓ Klaar'}
        </button>
      </div>
      <div className="space-y-1.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2">
            <p className="text-gray-200 text-lg">
              <span className="font-bold text-white">{item.quantity}×</span> {item.name}
            </p>
            <span className="text-gray-500 text-sm shrink-0">{(item.slots || 0) * item.quantity} vakjes</span>
          </div>
        ))}
        {order.drankkaarten > 0 && (
          <p className="text-yellow-400 text-lg font-semibold">
            🎫 {order.drankkaarten} drankkaart{order.drankkaarten !== 1 ? 'en' : ''}
          </p>
        )}
        {order.note && (
          <p className="text-gray-400 text-sm mt-2 bg-gray-700/50 rounded-lg px-3 py-2">💬 {order.note}</p>
        )}
        {totalVakjes > 0 && (
          <p className="text-gray-500 text-xs mt-2 border-t border-gray-700 pt-2">
            Totaal: {totalVakjes} vakjes
          </p>
        )}
      </div>
    </div>
  );
}
