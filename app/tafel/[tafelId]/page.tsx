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
import { Event, MenuCategory, MenuItem, Table, OrderItem, SelectedOption } from '@/lib/types';
import QuantitySelector from '@/components/QuantitySelector';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal from '@/components/AlertModal';

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

  const [customerName, setCustomerName] = useState('');
  const [nameDone, setNameDone] = useState(false);

  const [simpleQty, setSimpleQty] = useState<Record<string, number>>({});
  const [optionEntries, setOptionEntries] = useState<OptionEntry[]>([]);
  const [drankkaarten, setDrankkaarten] = useState(0);
  const [drankkaartPaymentMethod, setDrankkaartPaymentMethod] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalCategoryName, setModalCategoryName] = useState('');
  const [modalCategoryId, setModalCategoryId] = useState('');
  const [modalSelections, setModalSelections] = useState<Record<string, string[]>>({});
  const [modalError, setModalError] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message?: string; icon?: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBackToNameConfirm, setShowBackToNameConfirm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ksa_customer_theme');
    if (saved === 'dark') setIsDark(true);
    const savedCart = localStorage.getItem(`ksa_cart_${tafelId}`);
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        if (cart.customerName) setCustomerName(cart.customerName);
        if (cart.nameDone) setNameDone(cart.nameDone);
        if (cart.simpleQty) setSimpleQty(cart.simpleQty);
        if (cart.optionEntries) setOptionEntries(cart.optionEntries);
        if (cart.drankkaarten !== undefined) setDrankkaarten(cart.drankkaarten);
        if (cart.drankkaartPaymentMethod !== undefined) setDrankkaartPaymentMethod(cart.drankkaartPaymentMethod);
        if (cart.note !== undefined) setNote(cart.note);
      } catch {}
    }
  }, [tafelId]);

  // Save cart to localStorage on every change
  useEffect(() => {
    if (!success) {
      localStorage.setItem(`ksa_cart_${tafelId}`, JSON.stringify({ customerName, nameDone, simpleQty, optionEntries, drankkaarten, drankkaartPaymentMethod, note }));
    }
  }, [customerName, nameDone, simpleQty, optionEntries, drankkaarten, drankkaartPaymentMethod, note, success, tafelId]);

  useEffect(() => {
    if (drankkaarten === 0) setDrankkaartPaymentMethod('');
  }, [drankkaarten]);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('ksa_customer_theme', newDark ? 'dark' : 'light');
  }

  useEffect(() => { loadData(); }, [tafelId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const eventsSnap = await getDocs(query(collection(db, 'events'), where('active', '==', true)));
      if (eventsSnap.empty) { setError('Er is momenteel geen actief evenement.'); setLoading(false); return; }
      const eventDoc = eventsSnap.docs[0];
      const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
      setEvent(eventData);
      const tableDoc = await getDoc(doc(db, 'events', eventData.id, 'tables', tafelId));
      if (!tableDoc.exists()) { setError('Tafel niet gevonden. Controleer de QR-code.'); setLoading(false); return; }
      setTable({ id: tableDoc.id, ...tableDoc.data() } as Table);
      const catsSnap = await getDocs(query(collection(db, 'events', eventData.id, 'categories'), orderBy('order')));
      const cats: CategoryWithItems[] = [];
      for (const catDoc of catsSnap.docs) {
        const itemsSnap = await getDocs(query(collection(db, 'events', eventData.id, 'categories', catDoc.id, 'items'), orderBy('order')));
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
    for (const cat of categories) {
      for (const item of cat.items) {
        const qty = simpleQty[item.id] || 0;
        if (qty > 0 && (!item.optionGroups || item.optionGroups.length === 0)) {
          orderItems.push({ itemId: item.id, name: item.name, quantity: qty, slots: item.slots, price: item.slots * pricePerSlot, categoryName: cat.name });
        }
      }
    }
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
      setAlertModal({ title: 'Bestelling leeg', message: 'Voeg minstens een item of drankkaart toe.', icon: '🛒' });
      return;
    }
    const availableMethods = event?.drankkaartPaymentMethods || [];
    if (drankkaarten > 0 && availableMethods.length > 0 && !drankkaartPaymentMethod) {
      setAlertModal({ title: 'Betaalmethode vereist', message: 'Selecteer hoe je de drankkaarten wil betalen.', icon: '💳' });
      return;
    }
    setShowConfirm(false);
    try {
      setSubmitting(true);
      await addDoc(collection(db, 'events', event.id, 'orders'), {
        tableId: tafelId,
        tableName: table.name,
        customerName: customerName.trim(),
        items: orderItems,
        drankkaarten,
        drankkaartPaymentMethod: drankkaarten > 0 ? drankkaartPaymentMethod : '',
        note,
        status: 'besteld',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      localStorage.removeItem(`ksa_cart_${tafelId}`);
    } catch (err) {
      console.error(err);
      setAlertModal({ title: 'Fout', message: 'Er is een fout opgetreden. Probeer opnieuw.', icon: '⚠️' });
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
    setNameDone(false);
    setCustomerName('');
    localStorage.removeItem(`ksa_cart_${tafelId}`);
  }

  function clearOrder() {
    setSimpleQty({});
    setOptionEntries([]);
    setDrankkaarten(0);
    setDrankkaartPaymentMethod('');
    setNote('');
  }

  function goBackToName() {
    setSimpleQty({});
    setOptionEntries([]);
    setDrankkaarten(0);
    setDrankkaartPaymentMethod('');
    setNote('');
    setNameDone(false);
    setCustomerName('');
  }

  const accent = event?.accentColor || '#16a34a';
  const totalSelected = Object.values(simpleQty).reduce((a, b) => a + b, 0) + optionEntries.length + drankkaarten;
  const totalVakjes =
    categories.flatMap((cat) => cat.items.map((item) => (simpleQty[item.id] || 0) * (item.slots || 0))).reduce((a, b) => a + b, 0) +
    optionEntries.reduce((a, e) => a + (e.slots || 0), 0);
  const totalPrice = totalVakjes * (event?.pricePerSlot || 0);
  const drankkaartPrice = event?.drankkaartPrice || 0;
  const totalDrankkaartPrice = drankkaarten * drankkaartPrice;

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textMain = isDark ? 'text-gray-100' : 'text-gray-800';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderSub = isDark ? 'border-gray-700' : 'border-gray-200';

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${bg}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: accent }}></div>
        <p className={textSub}>Laden...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className={`min-h-screen flex items-center justify-center ${bg} p-4`}>
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className={`text-xl font-bold ${textMain} mb-2`}>Oeps!</h1>
        <p className={textSub}>{error}</p>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${accent}dd, ${accent}99)` }}>
      <div className="text-center text-white">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-3">Bedankt, {customerName}!</h1>
        <p className="text-white/80 text-lg mb-8">Je bestelling is geplaatst.</p>
        <button onClick={resetOrder} className="bg-white font-semibold py-3 px-8 rounded-xl hover:bg-white/90 transition-colors shadow-lg" style={{ color: accent }}>
          Nieuwe bestelling
        </button>
      </div>
    </div>
  );

  if (!nameDone) return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bg}`}>
      <div className={`${cardBg} rounded-2xl shadow-xl p-8 w-full max-w-sm`}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h1 className={`text-2xl font-bold ${textMain}`}>{event?.name}</h1>
          <p className={textSub + ' mt-1'}>Tafel {table?.name}</p>
        </div>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-4 text-center`}>Wat is je naam?</p>
        <form onSubmit={(e) => { e.preventDefault(); if (customerName.trim()) setNameDone(true); }} className="space-y-4">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Voer je naam in..."
            className={`w-full border-2 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-200 bg-white text-gray-800 placeholder-gray-300'} rounded-xl px-4 py-3 text-lg focus:outline-none`}
            autoFocus
            maxLength={50}
          />
          <button
            type="submit"
            disabled={!customerName.trim()}
            className="w-full text-white font-bold py-3 rounded-xl transition-opacity disabled:opacity-40 text-lg"
            style={{ backgroundColor: accent }}
          >
            Doorgaan →
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${bg}`}>
      <AlertModal
        open={alertModal !== null}
        title={alertModal?.title || ''}
        message={alertModal?.message}
        icon={alertModal?.icon}
        onClose={() => setAlertModal(null)}
        dark={isDark}
      />
      <ConfirmModal
        open={showClearConfirm}
        title="Bestelling leegmaken"
        message="Wil je alle geselecteerde items verwijderen?"
        icon="🗑️"
        confirmLabel="Ja, leegmaken"
        cancelLabel="Annuleren"
        danger={true}
        onConfirm={() => { clearOrder(); setShowClearConfirm(false); }}
        onCancel={() => setShowClearConfirm(false)}
        dark={isDark}
      />
      <ConfirmModal
        open={showBackToNameConfirm}
        title="Terug naar naam"
        message="Je huidige bestelling wordt verwijderd. Weet je het zeker?"
        icon="👤"
        confirmLabel="Ja, terug"
        cancelLabel="Annuleren"
        danger={true}
        onConfirm={() => { goBackToName(); setShowBackToNameConfirm(false); }}
        onCancel={() => setShowBackToNameConfirm(false)}
        dark={isDark}
      />
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className={`relative ${cardBg} rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col`}>
            <div className={`p-5 border-b ${borderSub}`}>
              <h2 className={`text-lg font-bold ${textMain}`}>{modalItem.name}</h2>
              <p className={textSub + ' text-sm'}>Kies je opties</p>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {(modalItem.optionGroups || []).map((group) => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`font-semibold ${textMain}`}>{group.name}</p>
                    {group.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Verplicht</span>}
                    <span className={`text-xs ${textSub}`}>{group.type === 'single' ? '(kies 1)' : '(meerdere)'}</span>
                  </div>
                  <div className="space-y-2">
                    {group.choices.map((choice) => {
                      const isSelected = (modalSelections[group.id] || []).includes(choice.name);
                      return (
                        <label
                          key={choice.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isDark ? 'border-gray-600' : ''}`}
                          style={isSelected ? { borderColor: accent, backgroundColor: accent + '20' } : undefined}
                        >
                          <input
                            type={group.type === 'single' ? 'radio' : 'checkbox'}
                            name={`group-${group.id}`}
                            checked={isSelected}
                            onChange={() => group.type === 'single' ? toggleSingle(group.id, choice.name) : toggleMulti(group.id, choice.name)}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${group.type === 'single' ? 'rounded-full' : 'rounded-md'}`}
                            style={isSelected ? { borderColor: accent } : { borderColor: '#d1d5db' }}
                          >
                            {isSelected && (
                              <div
                                className={`w-2.5 h-2.5 ${group.type === 'single' ? 'rounded-full' : 'rounded-sm'}`}
                                style={{ backgroundColor: accent }}
                              />
                            )}
                          </div>
                          <span className={`${textMain} font-medium`}>{choice.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {modalError && <p className="text-red-500 text-sm font-medium">{modalError}</p>}
            </div>
            <div className={`p-5 border-t ${borderSub} flex gap-3`}>
              <button onClick={closeModal} className={`flex-1 py-3 rounded-xl border-2 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} font-semibold transition-colors`}>
                Annuleren
              </button>
              <button onClick={confirmModal} className="flex-1 py-3 rounded-xl text-white font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: accent }}>
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirm(false)} />
          <div className={`relative ${cardBg} rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center`}>
            <div className="text-4xl mb-4">🛒</div>
            <h2 className={`text-xl font-bold ${textMain} mb-2`}>Bestelling bevestigen</h2>
            <p className={`${textSub} mb-6`}>Heb je alles besteld wat je wil?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className={`flex-1 py-3 rounded-xl border-2 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} font-semibold transition-colors`}>
                Nog even kijken
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-white font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {submitting ? 'Bezig...' : 'Ja, bevestigen!'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="text-white px-4 py-4 sticky top-0 z-10 shadow-md" style={{ backgroundColor: accent }}>
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBackToNameConfirm(true)}
              className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              ← Naam wijzigen
            </button>
            <div>
              <h1 className="text-xl font-bold">🍺 {event?.name}</h1>
              <p className="text-white/70 text-sm">{table?.name} · {customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalSelected > 0 && (
              <span className="bg-white/20 text-white font-bold rounded-full px-3 py-1 text-sm border border-white/30">
                {totalSelected} item{totalSelected !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={toggleTheme}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
              aria-label="Toggle thema"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className={`text-lg font-bold ${textMain} mb-3 pb-1 border-b-2`} style={{ borderColor: accent + '60' }}>
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
                  <div key={item.id} className={`${cardBg} rounded-xl p-4 shadow-sm`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className={`font-semibold ${textMain}`}>{item.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {item.slots} vakje{item.slots !== 1 ? 's' : ''}
                          </span>
                          {event?.showPrices && (
                            <span className="text-sm font-medium" style={{ color: accent }}>
                              €{itemPrice.toFixed(2)}
                            </span>
                          )}
                          {hasOptions && <span className={`text-xs ${textSub} italic`}>Keuze vereist</span>}
                        </div>
                      </div>
                      <QuantitySelector
                        value={qty}
                        onChange={(v) => handleQuantityChange(item, cat, v)}
                        accent={accent}
                        isDark={isDark}
                      />
                    </div>
                    {hasOptions && itemEntries.length > 0 && (
                      <div className={`mt-3 space-y-1.5 border-t ${borderSub} pt-2`}>
                        {itemEntries.map((entry, idx) => (
                          <div key={entry.uid} className="flex items-start justify-between gap-2 text-sm">
                            <div>
                              <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>#{idx + 1}</span>
                              {entry.selectedOptions.filter((o) => o.selected.length > 0).map((opt) => (
                                <span key={opt.groupId} className={`${textSub} ml-2`}>
                                  <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{opt.groupName}:</span> {opt.selected.join(', ')}
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

        <section>
          <h2 className={`text-lg font-bold ${textMain} mb-3 pb-1 border-b-2`} style={{ borderColor: accent + '60' }}>
            Drankkaarten
          </h2>
          <div className={`${cardBg} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className={`font-semibold ${textMain}`}>🎟️ Drankkaarten</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {drankkaartPrice > 0 && (
                    <span className="text-sm font-medium" style={{ color: accent }}>
                      €{drankkaartPrice.toFixed(2)} per drankkaart
                    </span>
                  )}
                </div>
                <p className={`${textSub} text-sm mt-1`}>Heb je nog drankkaarten nodig?</p>
              </div>
              <QuantitySelector value={drankkaarten} onChange={setDrankkaarten} accent={accent} isDark={isDark} />
            </div>
            {drankkaarten > 0 && (event?.drankkaartPaymentMethods?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className={`text-sm font-medium ${textMain} mb-2`}>💳 Betaalmethode drankkaarten</p>
                <div className="flex flex-wrap gap-2">
                  {(event?.drankkaartPaymentMethods || []).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setDrankkaartPaymentMethod(method)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        drankkaartPaymentMethod === method
                          ? 'text-white border-transparent'
                          : isDark
                          ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-400'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                      style={drankkaartPaymentMethod === method ? { backgroundColor: accent, borderColor: accent } : {}}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className={`text-lg font-bold ${textMain} mb-3 pb-1 border-b-2`} style={{ borderColor: accent + '60' }}>
            Opmerking
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Eventuele opmerkingen (allergieën, speciale wensen...)"
            className={`w-full ${cardBg} ${isDark ? 'text-gray-100 placeholder-gray-500 border-gray-700' : 'text-gray-800 placeholder-gray-400 border-gray-200'} rounded-xl p-4 shadow-sm border resize-none focus:outline-none focus:ring-2`}
            rows={3}
          />
        </section>

        {(totalVakjes > 0 || totalDrankkaartPrice > 0) && (
          <div className={`sticky bottom-2 rounded-xl px-4 py-3 flex justify-between items-center shadow-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div>
              {totalVakjes > 0 && (
                <>
                  <p className={`font-bold text-lg ${textMain}`}>{totalVakjes} vakje{totalVakjes !== 1 ? 's' : ''}</p>
                  <p className={`text-sm ${textSub}`}>Totaal vakjes</p>
                </>
              )}
              {totalDrankkaartPrice > 0 && (
                <p className={`text-sm ${textSub}`}>🎟️ {drankkaarten}× drankkaart = €{totalDrankkaartPrice.toFixed(2)}</p>
              )}
            </div>
            <div className="text-right">
              {event?.showPrices && (event?.pricePerSlot || 0) > 0 && totalVakjes > 0 && (
                <p className="font-bold text-lg" style={{ color: accent }}>€{totalPrice.toFixed(2)}</p>
              )}
              {totalDrankkaartPrice > 0 && (
                <p className="font-bold" style={{ color: accent }}>+€{totalDrankkaartPrice.toFixed(2)}</p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (totalSelected === 0) {
              setAlertModal({ title: 'Bestelling leeg', message: 'Voeg minstens een item of drankkaart toe.', icon: '🛒' });
              return;
            }
            setShowConfirm(true);
          }}
          disabled={submitting || totalSelected === 0}
          className="w-full text-white font-bold py-4 px-6 rounded-xl transition-opacity shadow-lg text-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: accent }}
        >
          🛒 Bestelling plaatsen
        </button>

        {totalSelected > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className={`w-full font-semibold py-3 px-6 rounded-xl border transition-colors text-sm mb-8 ${isDark ? 'border-white/30 text-white/70 hover:bg-white/10' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
          >
            🗑️ Bestelling leegmaken
          </button>
        )}
      </main>
    </div>
  );
}
