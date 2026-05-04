'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, MenuCategory, MenuItem, Table, OrderItem } from '@/lib/types';
import QuantitySelector from '@/components/QuantitySelector';

interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export default function TafelPage() {
  const params = useParams();
  const tafelId = params.tafelId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [drankkaarten, setDrankkaarten] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [tafelId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const eventsQuery = query(collection(db, 'events'), where('active', '==', true));
      const eventsSnap = await getDocs(eventsQuery);

      if (eventsSnap.empty) {
        setError('Er is momenteel geen actief evenement.');
        setLoading(false);
        return;
      }

      const eventDoc = eventsSnap.docs[0];
      const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
      setEvent(eventData);

      const tableDoc = await getDoc(doc(db, 'events', eventData.id, 'tables', tafelId));
      if (!tableDoc.exists()) {
        setError('Tafel niet gevonden. Controleer de QR-code.');
        setLoading(false);
        return;
      }
      setTable({ id: tableDoc.id, ...tableDoc.data() } as Table);

      const catsQuery = query(
        collection(db, 'events', eventData.id, 'categories'),
        orderBy('order')
      );
      const catsSnap = await getDocs(catsQuery);

      const cats: CategoryWithItems[] = [];
      for (const catDoc of catsSnap.docs) {
        const itemsQuery = query(
          collection(db, 'events', eventData.id, 'categories', catDoc.id, 'items'),
          orderBy('order')
        );
        const itemsSnap = await getDocs(itemsQuery);
        const items: MenuItem[] = itemsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .filter((item) => item.available);

        if (items.length > 0) {
          cats.push({
            id: catDoc.id,
            ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>),
            items,
          });
        }
      }
      setCategories(cats);
    } catch (err) {
      console.error(err);
      setError('Er is een fout opgetreden. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  function setQuantity(itemId: string, value: number) {
    setQuantities((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleSubmit() {
    if (!event || !table) return;

    const pricePerSlot = event.pricePerSlot || 0;
    const orderItems: OrderItem[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        const qty = quantities[item.id] || 0;
        if (qty > 0) {
          orderItems.push({
            itemId: item.id,
            name: item.name,
            quantity: qty,
            slots: item.slots,
            price: item.slots * pricePerSlot,
          });
        }
      }
    }

    if (orderItems.length === 0 && drankkaarten === 0) {
      alert('Voeg minstens één item of drankkaart toe aan je bestelling.');
      return;
    }

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'events', event.id, 'orders'), {
        tableId: tafelId,
        tableName: table.name,
        items: orderItems,
        drankkaarten,
        note,
        status: 'besteld',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Fout bij het plaatsen van de bestelling. Probeer opnieuw.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetOrder() {
    setQuantities({});
    setDrankkaarten(0);
    setNote('');
    setSuccess(false);
  }

  const accent = event?.accentColor || '#16a34a';
  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0) + drankkaarten;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: accent }}></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Oeps!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${accent}dd, ${accent}99)` }}>
        <div className="text-center text-white">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-3">Bedankt!</h1>
          <p className="text-white/80 text-lg mb-8">Je bestelling is geplaatst.</p>
          <button
            onClick={resetOrder}
            className="bg-white font-semibold py-3 px-8 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
            style={{ color: accent }}
          >
            Nieuwe bestelling
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="text-white px-4 py-4 sticky top-0 z-10 shadow-md" style={{ backgroundColor: accent }}>
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">🍺 {event?.name}</h1>
            <p className="text-white/70 text-sm">Tafel: {table?.name}</p>
          </div>
          {totalSelected > 0 && (
            <span className="bg-white/20 text-white font-bold rounded-full px-3 py-1 text-sm border border-white/30">
              {totalSelected} item{totalSelected !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Menu categories */}
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="text-lg font-bold text-gray-800 mb-3 pb-1 border-b-2" style={{ borderColor: accent + '60' }}>
              {cat.name}
            </h2>
            <div className="space-y-3">
              {cat.items.map((item) => {
                const pricePerSlot = event?.pricePerSlot || 0;
                const itemPrice = item.slots * pricePerSlot;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {item.slots} vakje{item.slots !== 1 ? 's' : ''}
                        </span>
                        {event?.showPrices && (
                          <span className="text-sm font-medium" style={{ color: accent }}>
                            €{itemPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <QuantitySelector
                      value={quantities[item.id] || 0}
                      onChange={(v) => setQuantity(item.id, v)}
                      accent={accent}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Drankkaarten */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3 pb-1 border-b-2" style={{ borderColor: accent + '60' }}>
            Drankkaarten
          </h2>
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-gray-800">🎫 Drankkaarten</p>
              <p className="text-gray-500 text-sm">Heb je nog drankkaarten nodig?</p>
            </div>
            <QuantitySelector value={drankkaarten} onChange={setDrankkaarten} accent={accent} />
          </div>
        </section>

        {/* Opmerking */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3 pb-1 border-b-2" style={{ borderColor: accent + '60' }}>
            Opmerking
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Eventuele opmerkingen (allergieën, speciale wensen...)"
            className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 resize-none text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': accent } as React.CSSProperties}
            rows={3}
          />
        </section>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || totalSelected === 0}
          className="w-full text-white font-bold py-4 px-6 rounded-xl transition-opacity shadow-lg text-lg mb-8 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: accent }}
        >
          {submitting ? 'Bezig...' : '🛒 Bestelling plaatsen'}
        </button>
      </main>
    </div>
  );
}