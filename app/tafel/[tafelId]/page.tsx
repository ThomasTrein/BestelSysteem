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
import { Event, MenuCategory, MenuItem, Table, OrderItem, OptionGroup, SelectedOption } from '@/lib/types';
import QuantitySelector from '@/components/QuantitySelector';

interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

interface OptionEntry {
  uid: string;
  itemId: string;
  name: string;
  slots: number;
  categoryId: string;
  categoryName: string;
  selectedOptions: SelectedOption[];
}

function buildOptionsKey(opts: SelectedOption[]): string {
  return JSON.stringify(opts.map((o) => ({ g: o.groupId, s: [...o.selected].sort() })));
}

export default function TafelPage() {
  const params = useParams();
  const tafelId = params.tafelId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [simpleQty, setSimpleQty] = useState<Record<string, number>>({});
  const [optionEntries, setOptionEntries] = useState<OptionEntry[]>([]);
  const [drankkaarten, setDrankkaarten] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Modal state
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalCategoryName, setModalCategoryName] = useState('');
  const [modalCategoryId, setModalCategoryId] = useState('');
  const [modalSelections, setModalSelections] = useState<Record<string, string[]>>({});
  const [modalError, setModalError] = useState('');

  useEffect(() => { loadData(); }, [tafelId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const eventsQuery = query(collection(db, 'events'), where('active', '==', true));
      const eventsSnap = await getDocs(eventsQuery);
      if (eventsSnap.empty) { setError('Er is momenteel geen actief evenement.'); setLoading(false); return; }
      const eventDoc = eventsSnap.docs[0];
      const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
      setEvent(eventData);
      const tableDoc = await getDoc(doc(db, 'events', eventData.id, 'tables', tafelId));
      if (!tableDoc.exists()) { setError('Tafel niet gevonden. Controleer de QR-code.'); setLoading(false); return; }
      setTable({ id: tableDoc.id, ...tableDoc.data() } as Table);
      const catsQuery = query(collection(db, 'events', eventData.id, 'categories'), orderBy('order'));
      const catsSnap = await getDocs(catsQuery);
      const cats: CategoryWithItems[] = [];
      for (const catDoc of catsSnap.docs) {
        const itemsQuery = query(collection(db, 'events', eventData.id, 'categories', catDoc.id, 'items'), orderBy('order'));
        const itemsSnap = await getDocs(itemsQuery);
        const items: MenuItem[] = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)).filter((item) => item.available);
        if (items.length > 0) cats.push({ id: catDoc.id, ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>), items });
      }
      setCategories(cats);
    } catch (err) {
      console.error(err);
      setError('Er is een fout opgetreden. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  function getItemCount(item: MenuItem): number {
    if (item.optionGroups && item.optionGroups.length > 0) {
      return optionEntries.filter((e) => e.itemId === item.id).length;
    }
    return simpleQty[item.id] || 0;
  }

  function handleQuantityChange(item: MenuItem, cat: CategoryWithItems, newValue: number) {
    const current = getItemCount(item);
    if (item.optionGroups && item.optionGroups.length > 0) {
      if (newValue > current) {
        openModal(item, cat);
      } else {
        // Remove last entry for this item
        setOptionEntries((prev) => {
          const idx = [...prev].map((e, i) => ({ e, i })).reverse().find(({ e }) => e.itemId === item.id)?.i;
          if (idx === undefined) return prev;
          return prev.filter((_, i) => i !== idx);
        });
      }
    } else {
      setSimpleQty((prev) => ({ ...prev, [item.id]: Math.max(0, newValue) }));
    }
  }

  function openModal(item: MenuItem, cat: CategoryWithItems) {
    setModalItem(item);
    setModalCategoryName(cat.name);
    setModalCategoryId(cat.id);
    setModalSelections({});
    setModalError('');
  }

  function closeModal() {
    setModalItem(null);
    setModalError('');
  }

  function toggleSingle(groupId: string, choiceName: string) {
    setModalSelections((prev) => ({ ...prev, [groupId]: [choiceName] }));
  }

  function toggleMulti(groupId: string, choiceName: string) {
    setModalSelections((prev) => {
      const cur = prev[groupId] || [];
      const next = cur.includes(choiceName) ? cur.filter((c) => c !== choiceName) : [...cur, choiceName];
      return { ...prev, [groupId]: next };
    });
  }

  function confirmModal() {
    if (!modalItem) return;
    const groups = modalItem.optionGroups || [];
    for (const group of groups) {
      if (group.required && (!modalSelections[group.id] || modalSelections[group.id].length === 0)) {
        setModalError(`"${group.name}" is verplicht.`);
        return;
      }
    }
    const selectedOptions: SelectedOption[] = groups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      type: group.type,
      selected: modalSelections[group.id] || [],
    })).filter((o) => o.selected.length > 0 || groups.find((g) => g.id === o.groupId)?.required);

    const pricePerSlot = event?.pricePerSlot || 0;
    const entry: OptionEntry = {
      uid: Date.now().toString() + Math.random().toString(36).slice(2),
      itemId: modalItem.id,
      name: modalItem.name,
      slots: modalItem.slots,
      categoryId: modalCategoryId,
      categoryName: modalCategoryName,
      selectedOptions,
    };
    setOptionEntries((prev) => [...prev, entry]);
    closeModal();
  }

  async function handleSubmit() {
    if (!event || !table) return;
    const pricePerSlot = event.pricePerSlot || 0;
    const orderItems: OrderItem[] = [];

    // Simple items
    for (const cat of categories) {
      for (const item of cat.items) {
        const qty = simpleQty[item.id] || 0;
        if (qty > 0 && (!item.optionGroups || item.optionGroups.length === 0)) {
          orderItems.push({ itemId: item.id, name: item.name, quantity: qty, slots: item.slots, price: item.slots * pricePerSlot, categoryName: cat.name });
        }
      }
    }

    // Option items - group by itemId + options key
    const grouped = new Map<string, OptionEntry[]>();
    for (const entry of optionEntries) {
      const key = entry.itemId + '|' + buildOptionsKey(entry.selectedOptions);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(entry);
    }
    for (const [, entries] of grouped) {
      const first = entries[0];
      orderItems.push({
        itemId: first.itemId,
        name: first.name,
        quantity: entries.length,
        slots: first.slots,
        price: first.slots * pricePerSlot,
        categoryName: first.categoryName,
        selectedOptions: first.selectedOptions,
      });
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
    setSimpleQty({});
    setOptionEntries([]);
    setDrankkaarten(0);
    setNote('');
    setSuccess(false);
  }

  const accent = event?.accentColor || '#16a34a';
  const totalSelected = Object.values(simpleQty).reduce((a, b) => a + b, 0) + optionEntries.length + drankkaarten;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: accent }}></div>
        <p className="text-gray-600">Laden...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Oeps!</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${accent}dd, ${accent}99)` }}>
      <div className="text-center text-white">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-3">Bedankt!</h1>
        <p className="text-white/80 text-lg mb-8">Je bestelling is geplaatst.</p>
        <button onClick={resetOrder} className="bg-white font-semibold py-3 px-8 rounded-xl hover:bg-white/90 transition-colors shadow-lg" style={{ color: accent }}>
          Nieuwe bestelling
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Options Modal */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{modalItem.name}</h2>
              <p className="text-gray-500 text-sm">Kies je opties</p>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {(modalItem.optionGroups || []).map((group) => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-gray-800">{group.name}</p>
                    {group.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Verplicht</span>}
                    <span className="text-xs text-gray-400">{group.type === 'single' ? '(kies 1)' : '(meerdere)'}</span>
                  </div>
                  <div className="space-y-2">
                    {group.choices.map((choice) => {
                      const isSelected = (modalSelections[group.id] || []).includes(choice.name);
                      return (
                        <label
                          key={choice.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isSelected ? 'border-current bg-opacity-5' : 'border-gray-200 hover:border-gray-300'}`}
                          style={isSelected ? { borderColor: accent, backgroundColor: accent + '10' } : {}}
                        >
                          <input
                            type={group.type === 'single' ? 'radio' : 'checkbox'}
                            name={`group-${group.id}`}
                            checked={isSelected}
                            onChange={() => group.type === 'single' ? toggleSingle(group.id, choice.name) : toggleMulti(group.id, choice.name)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-${group.type === 'single' ? 'full' : 'md'} border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-current' : 'border-gray-300'}`} style={isSelected ? { borderColor: accent } : {}}>
                            {isSelected && <div className={`w-2.5 h-2.5 rounded-${group.type === 'single' ? 'full' : 'sm'}`} style={{ backgroundColor: accent }} />}
                          </div>
                          <span className="text-gray-800 font-medium">{choice.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {modalError && <p className="text-red-500 text-sm font-medium">{modalError}</p>}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                Annuleren
              </button>
              <button onClick={confirmModal} className="flex-1 py-3 rounded-xl text-white font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: accent }}>
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

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
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="text-lg font-bold text-gray-800 mb-3 pb-1 border-b-2" style={{ borderColor: accent + '60' }}>
              {cat.name}
            </h2>
            <div className="space-y-3">
              {cat.items.map((item) => {
                const pricePerSlot = event?.pricePerSlot || 0;
                const itemPrice = item.slots * pricePerSlot;
                const hasOptions = item.optionGroups && item.optionGroups.length > 0;
                const qty = getItemCount(item);
                const itemEntries = optionEntries.filter((e) => e.itemId === item.id);
                return (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
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
                          {hasOptions && <span className="text-xs text-gray-400 italic">Keuze vereist</span>}
                        </div>
                      </div>
                      <QuantitySelector
                        value={qty}
                        onChange={(v) => handleQuantityChange(item, cat, v)}
                        accent={accent}
                      />
                    </div>
                    {/* Show option entries for this item */}
                    {hasOptions && itemEntries.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2">
                        {itemEntries.map((entry, idx) => (
                          <div key={entry.uid} className="flex items-start justify-between gap-2 text-sm">
                            <div>
                              <span className="text-gray-600 font-medium">#{idx + 1}</span>
                              {entry.selectedOptions.filter((o) => o.selected.length > 0).map((opt) => (
                                <span key={opt.groupId} className="text-gray-500 ml-2">
                                  <span className="font-medium text-gray-600">{opt.groupName}:</span> {opt.selected.join(', ')}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => setOptionEntries((prev) => prev.filter((e) => e.uid !== entry.uid))}
                              className="text-red-400 hover:text-red-500 text-xs shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
