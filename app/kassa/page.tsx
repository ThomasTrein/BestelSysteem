'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, doc, setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, MenuCategory, MenuItem, OptionGroup, OrderItem, SelectedOption } from '@/lib/types';
import {
  checkKassaAuth, loginKassa, logoutKassa, getKassaAttempts, isKassaDeviceBlocked,
} from '@/lib/auth';

interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

interface CartEntry {
  uid: string; // itemId + JSON(options) key
  itemId: string;
  name: string;
  categoryName: string;
  slots: number;
  quantity: number;
  selectedOptions: SelectedOption[];
}

const KASSA_TABLE_NAME = 'Kassa';

// ---------- PIN NUMPAD ----------
function PinNumpad({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  useEffect(() => {
    async function check() {
      const isBlocked = await isKassaDeviceBlocked();
      if (isBlocked) setBlocked(true);
      else setAttemptsLeft(Math.max(0, 3 - getKassaAttempts()));
    }
    check();
  }, []);

  const press = useCallback(async (digit: string) => {
    if (loading || blocked) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      setLoading(true);
      setError('');
      const result = await loginKassa(newPin);
      setLoading(false);
      if (result === 'ok') {
        onSuccess();
      } else if (result === 'blocked') {
        setBlocked(true);
        setPin('');
      } else {
        const left = Math.max(0, 3 - getKassaAttempts());
        setAttemptsLeft(left);
        setError(left > 0 ? `Foute code. Nog ${left} poging${left === 1 ? '' : 'en'}.` : '');
        setPin('');
      }
    }
  }, [pin, loading, blocked, onSuccess]);

  const del = useCallback(() => {
    if (!loading) setPin((p) => p.slice(0, -1));
  }, [loading]);

  if (blocked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-800 border border-red-500/40 rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-red-400 mb-2">Toestel geblokkeerd</h1>
        <p className="text-gray-400 text-sm">Dit toestel is geblokkeerd na te veel mislukte pogingen. Vraag een admin om je toestel goed te keuren in het admin-paneel.</p>
        <a href="/" className="inline-block mt-6 text-gray-500 hover:text-white text-sm transition-colors">← Terug naar home</a>
      </div>
    </div>
  );

  const dots = [0, 1, 2, 3].map((i) => (
    <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-gray-500'}`} />
  ));

  const keys = ['1','2','3','4','5','6','7','8','9'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-xs text-center">
        <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors justify-start">← Home</a>
        <h1 className="text-2xl font-bold text-white mb-2">🏪 Kassa</h1>
        <p className="text-gray-400 text-sm mb-6">Voer de 4-cijferige pincode in</p>

        <div className="flex justify-center gap-4 mb-6">{dots}</div>

        {error && <p className="text-red-400 text-sm mb-4 font-medium">{error}</p>}

        <div className="grid grid-cols-3 gap-3 mb-3">
          {keys.map((k) => (
            <button key={k} onClick={() => press(k)} disabled={pin.length >= 4 || loading}
              className="h-14 rounded-xl bg-gray-700 hover:bg-gray-600 active:scale-95 text-white text-2xl font-bold transition-all disabled:opacity-30">
              {k}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div />
          <button onClick={() => press('0')} disabled={pin.length >= 4 || loading}
            className="h-14 rounded-xl bg-gray-700 hover:bg-gray-600 active:scale-95 text-white text-2xl font-bold transition-all disabled:opacity-30">
            0
          </button>
          <button onClick={del} disabled={pin.length === 0 || loading}
            className="h-14 rounded-xl bg-gray-700 hover:bg-red-700/60 active:scale-95 text-gray-300 text-xl font-bold transition-all disabled:opacity-30">
            ⌫
          </button>
        </div>
        {attemptsLeft < 3 && attemptsLeft > 0 && (
          <p className="text-yellow-400 text-xs mt-4">⚠️ Nog {attemptsLeft} poging{attemptsLeft === 1 ? '' : 'en'}</p>
        )}
      </div>
    </div>
  );
}

// ---------- OPTIONS MODAL ----------
function OptionsModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: MenuItem;
  onConfirm: (opts: SelectedOption[]) => void;
  onCancel: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');

  function toggleSingle(groupId: string, choice: string) {
    setSelections((p) => ({ ...p, [groupId]: [choice] }));
  }
  function toggleMulti(groupId: string, choice: string) {
    setSelections((p) => {
      const cur = p[groupId] || [];
      return { ...p, [groupId]: cur.includes(choice) ? cur.filter((c) => c !== choice) : [...cur, choice] };
    });
  }

  function confirm() {
    const groups = item.optionGroups || [];
    for (const g of groups) {
      if (g.required && !(selections[g.id] || []).length) {
        setError(`"${g.name}" is verplicht.`);
        return;
      }
    }
    const opts: SelectedOption[] = groups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      type: g.type,
      selected: selections[g.id] || [],
    }));
    onConfirm(opts);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-gray-800 border border-gray-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">{item.name}</h2>
          <p className="text-gray-400 text-sm">Kies je opties</p>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {(item.optionGroups || []).map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <p className="font-semibold text-white">{group.name}</p>
                {group.required && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">Verplicht</span>}
                <span className="text-xs text-gray-400">{group.type === 'single' ? '(kies 1)' : '(meerdere)'}</span>
              </div>
              <div className="space-y-2">
                {group.choices.map((choice) => {
                  const sel = (selections[group.id] || []).includes(choice.name);
                  return (
                    <label key={choice.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${sel ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-gray-600'}`}>
                      <input type={group.type === 'single' ? 'radio' : 'checkbox'}
                        checked={sel}
                        onChange={() => group.type === 'single' ? toggleSingle(group.id, choice.name) : toggleMulti(group.id, choice.name)}
                        className="sr-only" />
                      <div className={`w-5 h-5 border-2 flex items-center justify-center ${group.type === 'single' ? 'rounded-full' : 'rounded-md'} ${sel ? 'border-[var(--accent)]' : 'border-gray-500'}`}>
                        {sel && <div className={`w-2.5 h-2.5 bg-[var(--accent)] ${group.type === 'single' ? 'rounded-full' : 'rounded-sm'}`} />}
                      </div>
                      <span className="text-white font-medium">{choice.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
        </div>
        <div className="p-5 border-t border-gray-700 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border-2 border-gray-600 text-gray-300 hover:bg-gray-700 font-semibold transition-colors">Annuleren</button>
          <button onClick={confirm} className="flex-1 py-3 rounded-xl bg-[var(--accent)] hover:brightness-90 text-white font-bold transition-all">Toevoegen</button>
        </div>
      </div>
    </div>
  );
}

// ---------- MAIN KASSA PAGE ----------
export default function KassaPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalCatName, setModalCatName] = useState('');

  const [drankkaarten, setDrankkaarten] = useState(0);
  const [drankkaartPaymentMethod, setDrankkaartPaymentMethod] = useState('');
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setAuthed(checkKassaAuth());
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!authed) return;
    async function load() {
      setLoading(true);
      const evSnap = await getDocs(query(collection(db, 'events'), where('active', '==', true)));
      if (evSnap.empty) { setLoading(false); return; }
      const ev = { id: evSnap.docs[0].id, ...evSnap.docs[0].data() } as Event;
      setEvent(ev);
      const catSnap = await getDocs(query(collection(db, 'events', ev.id, 'categories'), orderBy('order')));
      const cats: CategoryWithItems[] = [];
      for (const d of catSnap.docs) {
        const cat = { id: d.id, ...d.data() } as CategoryWithItems;
        const itemSnap = await getDocs(query(collection(db, 'events', ev.id, 'categories', d.id, 'items'), orderBy('order')));
        cat.items = itemSnap.docs.map((id) => ({ id: id.id, ...id.data() } as MenuItem)).filter((i) => i.available);
        if (cat.items.length > 0) cats.push(cat);
      }
      setCategories(cats);
      if (cats.length > 0) setSelectedCatId(cats[0].id);
      setLoading(false);
    }
    load();
  }, [authed]);

  function cartKey(itemId: string, opts: SelectedOption[]): string {
    return itemId + '|' + JSON.stringify(opts.map((o) => ({ g: o.groupId, s: [...o.selected].sort() })));
  }

  function addToCart(item: MenuItem, catName: string, opts: SelectedOption[]) {
    const key = cartKey(item.id, opts);
    setCart((prev) => {
      const idx = prev.findIndex((e) => e.uid === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, {
        uid: key,
        itemId: item.id,
        name: item.name,
        categoryName: catName,
        slots: item.slots,
        quantity: 1,
        selectedOptions: opts,
      }];
    });
  }

  function changeQty(uid: string, delta: number) {
    setCart((prev) => {
      const next = prev.map((e) => e.uid === uid ? { ...e, quantity: e.quantity + delta } : e).filter((e) => e.quantity > 0);
      return next;
    });
  }

  function handleItemClick(item: MenuItem, catName: string) {
    if (item.optionGroups && item.optionGroups.length > 0) {
      setModalItem(item);
      setModalCatName(catName);
    } else {
      addToCart(item, catName, []);
    }
  }

  async function getOrCreateKassaTable(eventId: string): Promise<{ id: string; name: string }> {
    const tablesSnap = await getDocs(query(collection(db, 'events', eventId, 'tables'), where('name', '==', KASSA_TABLE_NAME)));
    if (!tablesSnap.empty) return { id: tablesSnap.docs[0].id, name: KASSA_TABLE_NAME };
    const ref = doc(collection(db, 'events', eventId, 'tables'));
    await setDoc(ref, { name: KASSA_TABLE_NAME });
    return { id: ref.id, name: KASSA_TABLE_NAME };
  }

  const totalItems = cart.reduce((s, e) => s + e.quantity, 0) + drankkaarten;

  async function handleSubmit() {
    if (!event || (totalItems === 0)) return;
    if (!customerName.trim()) return;
    setSubmitting(true);
    try {
      const table = await getOrCreateKassaTable(event.id);
      const items: OrderItem[] = cart.map((e) => ({
        itemId: e.itemId,
        name: e.name,
        quantity: e.quantity,
        slots: e.slots,
        price: e.slots * (event.pricePerSlot ?? 0),
        categoryName: e.categoryName,
        selectedOptions: e.selectedOptions,
      }));
      await addDoc(collection(db, 'events', event.id, 'orders'), {
        tableId: table.id,
        tableName: table.name,
        customerName: customerName.trim(),
        items,
        drankkaarten,
        drankkaartPaymentMethod: drankkaarten > 0 ? drankkaartPaymentMethod : '',
        note: note.trim(),
        status: 'besteld',
        createdAt: serverTimestamp(),
        screenStatuses: {},
        itemStatuses: {},
        drankkaartDone: false,
      });
      setCart([]);
      setDrankkaarten(0);
      setDrankkaartPaymentMethod('');
      setNote('');
      setCustomerName('');
      const count = items.reduce((s, i) => s + i.quantity, 0) + drankkaarten;
      setSuccessMsg(`✓ Bestelling geplaatst! (${count} item${count !== 1 ? 's' : ''})`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  if (checkingAuth) return null;

  if (!authed) return <PinNumpad onSuccess={() => setAuthed(true)} />;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-500 text-xl">
      Geen actief evenement gevonden.
    </div>
  );

  const selectedCat = categories.find((c) => c.id === selectedCatId) || null;
  const drankkaartPrice = event.drankkaartPrice ?? (event.drankkaartSlots * (event.pricePerSlot ?? 0));
  const paymentMethods = event.drankkaartPaymentMethods || [];
  const canPlace = totalItems > 0 && customerName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">🏪 Kassa</h1>
            <p className="text-gray-400 text-xs">{event.name}</p>
          </div>
          <button onClick={() => { logoutKassa(); router.push('/'); }} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm">
            Afmelden
          </button>
        </div>
      </header>

      {successMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white font-semibold px-6 py-3 rounded-xl shadow-xl">
          {successMsg}
        </div>
      )}

      {modalItem && (
        <OptionsModal
          item={modalItem}
          onConfirm={(opts) => { addToCart(modalItem, modalCatName, opts); setModalItem(null); }}
          onCancel={() => setModalItem(null)}
        />
      )}

      {/* Main layout: left categories + items | right cart */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: categories + items */}
        <div className="flex flex-1 overflow-hidden">
          {/* Category list */}
          <div className="w-36 sm:w-44 bg-gray-900 border-r border-gray-700 overflow-y-auto flex-shrink-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`w-full text-left px-3 py-3 text-sm font-medium border-b border-gray-800 transition-colors ${selectedCatId === cat.id ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-l-2 border-l-[var(--accent)]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                {cat.name}
              </button>
            ))}
            {/* Drankkaarten */}
            <button
              onClick={() => setSelectedCatId('__drankkaarten__')}
              className={`w-full text-left px-3 py-3 text-sm font-medium border-b border-gray-800 transition-colors ${selectedCatId === '__drankkaarten__' ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-l-2 border-l-[var(--accent)]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
            >
              🎟️ Drankkaarten
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {selectedCatId === '__drankkaarten__' ? (
              <div className="space-y-3">
                <h2 className="text-white font-bold text-base">🎟️ Drankkaarten{drankkaartPrice > 0 ? ` — €${drankkaartPrice.toFixed(2)}/stuk` : ''}</h2>
                <div className="flex items-center gap-4">
                  <button onClick={() => setDrankkaarten((v) => Math.max(0, v - 1))} disabled={drankkaarten === 0}
                    className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold flex items-center justify-center disabled:opacity-30">−</button>
                  <span className={`text-2xl font-bold w-10 text-center ${drankkaarten > 0 ? 'text-white' : 'text-gray-500'}`}>{drankkaarten}</span>
                  <button onClick={() => setDrankkaarten((v) => v + 1)}
                    className="w-10 h-10 rounded-full bg-[var(--accent)] hover:brightness-90 text-white text-xl font-bold flex items-center justify-center">+</button>
                </div>
                {drankkaarten > 0 && paymentMethods.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Betaalmethode</p>
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map((m) => (
                        <button key={m} onClick={() => setDrankkaartPaymentMethod(m)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${drankkaartPaymentMethod === m ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedCat ? (
              <div>
                <h2 className="text-white font-bold text-base mb-3">{selectedCat.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedCat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item, selectedCat.name)}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-3 text-left transition-colors active:scale-95"
                    >
                      <p className="text-white font-medium text-sm leading-tight">{item.name}</p>
                      {item.optionGroups && item.optionGroups.length > 0 && (
                        <p className="text-gray-500 text-xs mt-1">Opties beschikbaar</p>
                      )}
                      {event.showPrices && item.slots > 0 && (
                        <p className="text-[var(--accent)] text-xs mt-1 font-medium">€{(item.slots * (event.pricePerSlot ?? 0)).toFixed(2)}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT: cart */}
        <div className="w-64 sm:w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <p className="text-white font-bold text-sm">Bestelling</p>
          </div>

          {/* Name field */}
          <div className="px-3 pt-3">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="👤 Naam klant..."
              maxLength={50}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-gray-400"
            />
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && drankkaarten === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">Geen items geselecteerd</p>
            ) : (
              <>
                {cart.map((entry) => (
                  <div key={entry.uid} className="bg-gray-700/60 rounded-lg p-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-tight truncate">{entry.name}</p>
                        {entry.selectedOptions.flatMap((o) => o.selected).length > 0 && (
                          <p className="text-gray-400 text-xs mt-0.5 leading-tight">{entry.selectedOptions.flatMap((o) => o.selected).join(', ')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => changeQty(entry.uid, -1)} className="w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-500 text-white text-sm flex items-center justify-center">−</button>
                        <span className="text-white font-bold text-sm w-5 text-center">{entry.quantity}</span>
                        <button onClick={() => changeQty(entry.uid, 1)} className="w-6 h-6 rounded-full bg-[var(--accent)] hover:brightness-90 text-white text-sm flex items-center justify-center">+</button>
                      </div>
                    </div>
                  </div>
                ))}
                {drankkaarten > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-yellow-400 text-sm font-medium">🎟️ Drankkaarten</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDrankkaarten((v) => Math.max(0, v - 1))} className="w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-500 text-white text-sm flex items-center justify-center">−</button>
                      <span className="text-white font-bold text-sm w-5 text-center">{drankkaarten}</span>
                      <button onClick={() => setDrankkaarten((v) => v + 1)} className="w-6 h-6 rounded-full bg-[var(--accent)] hover:brightness-90 text-white text-sm flex items-center justify-center">+</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Note */}
          <div className="px-3 pb-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opmerking..."
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder-gray-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="p-3 border-t border-gray-700 space-y-2">
            {totalItems > 0 && (
              <button onClick={() => { setCart([]); setDrankkaarten(0); setNote(''); }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 rounded-lg text-sm transition-colors">
                Wissen
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canPlace || submitting}
              className="w-full bg-[var(--accent)] hover:brightness-90 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all text-sm"
            >
              {submitting ? 'Bezig...' : `✓ Plaatsen${totalItems > 0 ? ` (${totalItems})` : ''}`}
            </button>
            {totalItems > 0 && !customerName.trim() && (
              <p className="text-yellow-400 text-xs text-center">Voer eerst een naam in</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
