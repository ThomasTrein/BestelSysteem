'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
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

  useEffect(() => {
    if (checkBarAuth()) {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;

    let unsubscribe: (() => void) | undefined;

    async function setupListener() {
      setLoading(true);
      const eventsQuery = query(collection(db, 'events'), where('active', '==', true));
      const snap = await getDocs(eventsQuery);
      if (snap.empty) {
        setLoading(false);
        return;
      }
      const eventDoc = snap.docs[0];
      const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
      setEvent(eventData);

      const ordersQuery = query(
        collection(db, 'events', eventData.id, 'orders'),
        orderBy('createdAt', 'asc')
      );

      unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const ords: Order[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Order[];
        setOrders(ords);
        setLoading(false);
      });
    }

    setupListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginBar(password)) {
      setAuthed(true);
      setLoginError('');
    } else {
      setLoginError('Ongeldig wachtwoord. Probeer opnieuw.');
    }
  }

  function handleLogout() {
    logoutBar();
    setAuthed(false);
    setPassword('');
    setOrders([]);
    setEvent(null);
  }

  async function toggleOrderStatus(order: Order) {
    if (!event) return;
    const newStatus = order.status === 'besteld' ? 'klaar' : 'besteld';
    await updateDoc(doc(db, 'events', event.id, 'orders', order.id), {
      status: newStatus,
    });
  }

  function formatTime(createdAt: any): string {
    if (!createdAt) return '';
    try {
      const date = createdAt instanceof Timestamp ? createdAt.toDate() : new Date(createdAt);
      return date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-800 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-green-800 mb-2 text-center">🍹 Barscherm</h1>
          <p className="text-gray-500 text-center mb-6">Log in om bestellingen te bekijken</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Inloggen
            </button>
          </form>
        </div>
      </div>
    );
  }

  const besteld = orders.filter((o) => o.status === 'besteld');
  const klaar = orders.filter((o) => o.status === 'klaar');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-700 text-white px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🍹 Barscherm</h1>
            {event && <p className="text-green-200 text-sm">{event.name}</p>}
          </div>
          <div className="flex items-center gap-4">
            {besteld.length > 0 && (
              <span className="bg-yellow-400 text-green-900 font-bold rounded-full px-4 py-1.5 text-lg">
                {besteld.length} wachtend
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Afmelden
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : !event ? (
        <div className="flex items-center justify-center h-64 text-gray-500 text-xl">
          Geen actief evenement gevonden.
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Besteld column */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🔴 Besteld
                <span className="bg-red-100 text-red-700 rounded-full px-3 py-0.5 text-base font-semibold">
                  {besteld.length}
                </span>
              </h2>
              <div className="space-y-4">
                {besteld.length === 0 && (
                  <p className="text-gray-400 text-center py-8">Geen nieuwe bestellingen</p>
                )}
                {besteld.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    formatTime={formatTime}
                    onToggle={() => toggleOrderStatus(order)}
                  />
                ))}
              </div>
            </div>

            {/* Klaar column */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                ✅ Klaar
                <span className="bg-green-100 text-green-700 rounded-full px-3 py-0.5 text-base font-semibold">
                  {klaar.length}
                </span>
              </h2>
              <div className="space-y-4">
                {klaar.length === 0 && (
                  <p className="text-gray-400 text-center py-8">Nog geen afgewerkte bestellingen</p>
                )}
                {klaar.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    formatTime={formatTime}
                    onToggle={() => toggleOrderStatus(order)}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function OrderCard({
  order,
  formatTime,
  onToggle,
}: {
  order: Order;
  formatTime: (t: any) => string;
  onToggle: () => void;
}) {
  const isDone = order.status === 'klaar';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-l-4 p-4 ${
        isDone ? 'border-green-400 opacity-75' : 'border-red-400'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-2xl font-bold text-gray-800">{order.tableName}</p>
          <p className="text-gray-500 text-sm">{formatTime(order.createdAt)}</p>
        </div>
        <button
          onClick={onToggle}
          className={`font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${
            isDone
              ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isDone ? '↩ Herstel' : '✓ Klaar'}
        </button>
      </div>

      <div className="space-y-1">
        {order.items.map((item, i) => (
          <p key={i} className="text-gray-700 text-lg">
            <span className="font-bold">{item.quantity}×</span> {item.name}
          </p>
        ))}
        {order.drankkaarten > 0 && (
          <p className="text-gray-700 text-lg">
            🎫 <span className="font-bold">{order.drankkaarten}</span> drankkaarten
          </p>
        )}
        {order.note && (
          <p className="text-gray-500 text-sm mt-2 bg-yellow-50 rounded-lg px-3 py-2">
            💬 {order.note}
          </p>
        )}
      </div>
    </div>
  );
}
