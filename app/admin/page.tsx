'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  query, orderBy, where, writeBatch, Timestamp, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { db } from '@/lib/firebase';
import { Event, MenuCategory, MenuItem, Table, Order, OrderItem, OptionGroup, OptionChoice, BarScreen, SelectedOption } from '@/lib/types';
import { checkAdminAuth, loginAdmin, logoutAdmin, updatePasswords, getBlockedKassaDevices, unblockKassaDevice, getKassaDevicesInfo, updateKassaDeviceName, KassaDeviceInfo } from '@/lib/auth';
import ConfirmModal from '@/components/ConfirmModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Tab = 'evenementen' | 'menu' | 'tafels' | 'bestellingen' | 'instellingen' | 'statistieken' | 'schermen';

const inp = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 text-sm';
const card = 'bg-gray-800 border border-gray-700 rounded-xl p-4';

function fmt(t: unknown): string {
  if (!t) return '';
  try { return (t instanceof Timestamp ? t.toDate() : new Date(t as string)).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('evenementen');

  useEffect(() => { if (checkAdminAuth()) setAuthed(true); }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const ok = await loginAdmin(password);
    if (ok) { setAuthed(true); setLoginError(''); }
    else setLoginError('Ongeldig wachtwoord.');
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          ← Terug naar home
        </a>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">⚙️ Admin</h1>
        <p className="text-gray-400 text-center mb-6">Beheerpaneel voor KSA Bestelapp</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin wachtwoord" className={inp + ' w-full'} autoFocus />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button type="submit" className="w-full bg-[var(--accent)] hover:brightness-90 text-white font-bold py-3 rounded-lg transition-all">Inloggen</button>
        </form>
      </div>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'evenementen', label: '📅 Evenementen' },
    { key: 'menu', label: '🍺 Menu' },
    { key: 'tafels', label: '切 Tafels' },
    { key: 'bestellingen', label: '📋 Bestellingen' },
    { key: 'schermen', label: '🖥️ Schermen' },
    { key: 'instellingen', label: '⚙️ Instellingen' },
    { key: 'statistieken', label: '📊 Statistieken' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">⚙️ KSA Admin</h1>
          <button onClick={() => { logoutAdmin(); router.push('/'); }} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
            Afmelden
          </button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-2 mb-6 min-w-max">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-4 rounded-lg font-semibold transition-colors text-sm whitespace-nowrap ${activeTab === tab.key ? 'bg-[var(--accent)] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}>
              {tab.label}
            </button>
          ))}
          </div>
        </div>
        {activeTab === 'evenementen' && <EvenementenTab />}
        {activeTab === 'menu' && <MenuTab />}
        {activeTab === 'tafels' && <TafelsTab />}
        {activeTab === 'bestellingen' && <BestellingenTab />}
        {activeTab === 'instellingen' && <InstellingenTab />}
        {activeTab === 'schermen' && <SchermenTab />}
        {activeTab === 'statistieken' && <StatistiekenTab />}
      </div>
    </div>
  );
}

/* -- Evenementen Tab -- */
function EvenementenTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newPricePerSlot, setNewPricePerSlot] = useState('');
  const [newAccent, setNewAccent] = useState('#16a34a');
  const [newDrankkaartSlots, setNewDrankkaartSlots] = useState('');
  const [newDrankkaartPrice, setNewDrankkaartPrice] = useState('');
  const [newQrLabel, setNewQrLabel] = useState('Scan om te bestellen');
  const [doCopyMenu, setDoCopyMenu] = useState(false);
  const [copyFromEventId, setCopyFromEventId] = useState('');
  const [copyingMenu, setCopyingMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [newDrankkaartMethod, setNewDrankkaartMethod] = useState('');
  const [newDrankkaartMethods, setNewDrankkaartMethods] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'events'), orderBy('startDate', 'desc')), (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
    });
    return () => unsub();
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newStart || !newEnd) return;
    const newEventRef = await addDoc(collection(db, 'events'), {
      name: newName.trim(),
      startDate: newStart,
      endDate: newEnd,
      active: false,
      showPrices: true,
      pricePerSlot: parseFloat(newPricePerSlot) || 0,
      accentColor: newAccent,
      drankkaartPrice: parseFloat(newDrankkaartPrice) || 0,
      qrLabel: newQrLabel.trim() || 'Scan om te bestellen',
      drankkaartPaymentMethods: newDrankkaartMethods,
    });
    if (doCopyMenu && copyFromEventId) {
      setCopyingMenu(true);
      try {
        const catsSnap = await getDocs(query(collection(db, 'events', copyFromEventId, 'categories'), orderBy('order')));
        for (const catDoc of catsSnap.docs) {
          const catData = catDoc.data();
          const newCatRef = await addDoc(collection(db, 'events', newEventRef.id, 'categories'), { name: catData.name, order: catData.order ?? 0 });
          const itemsSnap = await getDocs(query(collection(db, 'events', copyFromEventId, 'categories', catDoc.id, 'items'), orderBy('order')));
          for (const itemDoc of itemsSnap.docs) {
            const itemData = itemDoc.data();
            await addDoc(collection(db, 'events', newEventRef.id, 'categories', newCatRef.id, 'items'), {
              name: itemData.name,
              slots: itemData.slots ?? 1,
              available: itemData.available ?? true,
              order: itemData.order ?? 0,
              optionGroups: itemData.optionGroups || [],
            });
          }
        }
      } finally {
        setCopyingMenu(false);
      }
    }
    setNewName(''); setNewStart(''); setNewEnd(''); setNewPricePerSlot(''); setNewAccent('#16a34a'); setNewDrankkaartPrice(''); setNewQrLabel('Scan om te bestellen');
    setDoCopyMenu(false); setCopyFromEventId('');
    setNewDrankkaartMethods([]); setNewDrankkaartMethod('');
  }

  async function activateEvent(id: string) {
    const batch = writeBatch(db);
    events.forEach((ev) => batch.update(doc(db, 'events', ev.id), { active: ev.id === id }));
    await batch.commit();
  }

  async function deactivateEvent(id: string) {
    await updateDoc(doc(db, 'events', id), { active: false });
  }

  async function deleteEvent(id: string) {
    setConfirmModal({
      title: 'Evenement verwijderen',
      message: 'Zeker? Dit verwijdert het evenement.',
      onConfirm: async () => { setConfirmModal(null); await deleteDoc(doc(db, 'events', id)); },
    });
  }

  async function updateEventField(ev: Event, field: Partial<Event>) {
    await updateDoc(doc(db, 'events', ev.id), field as any);
  }

  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-bold mb-4 text-white">Nieuw evenement</h2>
        <form onSubmit={createEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Naam evenement" className={inp + ' sm:col-span-2'} />
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Startdatum</label>
            <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className={inp + ' w-full'} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Einddatum</label>
            <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className={inp + ' w-full'} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Prijs per vakje (€)</label>
            <input type="number" step="0.01" min="0" value={newPricePerSlot} onChange={(e) => setNewPricePerSlot(e.target.value)} placeholder="0.50" className={inp + ' w-full'} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Accentkleur</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={newAccent} onChange={(e) => setNewAccent(e.target.value)} className="w-10 h-9 rounded cursor-pointer border-0 bg-transparent" />
              <input value={newAccent} onChange={(e) => setNewAccent(e.target.value)} placeholder="#16a34a" className={inp + ' flex-1 font-mono'} maxLength={7} />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Prijs per drankkaart (€)</label>
            <input type="number" step="0.01" min="0" value={newDrankkaartPrice} onChange={(e) => setNewDrankkaartPrice(e.target.value)} placeholder="10.00" className={inp + ' w-full'} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Betaalmethoden drankkaarten</label>
            <div className="flex gap-2">
              <input
                value={newDrankkaartMethod}
                onChange={(e) => setNewDrankkaartMethod(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const v = newDrankkaartMethod.trim();
                    if (v && !newDrankkaartMethods.includes(v)) setNewDrankkaartMethods((p) => [...p, v]);
                    setNewDrankkaartMethod('');
                  }
                }}
                placeholder="Bv. Cash, Payconiq..."
                className={inp}
              />
              <button
                type="button"
                onClick={() => {
                  const v = newDrankkaartMethod.trim();
                  if (v && !newDrankkaartMethods.includes(v)) setNewDrankkaartMethods((p) => [...p, v]);
                  setNewDrankkaartMethod('');
                }}
                className="bg-[var(--accent)] hover:brightness-90 text-white px-3 rounded-lg text-sm font-semibold"
              >+</button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {newDrankkaartMethods.map((m) => (
                <span key={m} className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  {m}
                  <button type="button" onClick={() => setNewDrankkaartMethods((p) => p.filter((x) => x !== m))} className="hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">QR code label (tekst onder QR bij afdrukken)</label>
            <input value={newQrLabel} onChange={(e) => setNewQrLabel(e.target.value)} placeholder="Scan om te bestellen" className={inp + ' w-full'} />
          </div>
          <div className="sm:col-span-2 border-t border-gray-700 pt-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 text-sm">
              <input type="checkbox" checked={doCopyMenu} onChange={(e) => { setDoCopyMenu(e.target.checked); if (!e.target.checked) setCopyFromEventId(''); }} className="rounded" />
              Kopieer menu van bestaand evenement
            </label>
            {doCopyMenu && (
              <div className="space-y-2">
                <select value={copyFromEventId} onChange={(e) => setCopyFromEventId(e.target.value)} className={inp + ' w-full'}>
                  <option value="">Selecteer brongebeurtenis...</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}{ev.active ? ' (Actief)' : ''}</option>)}
                </select>
                {copyFromEventId && (
                  <p className="text-green-400 text-xs">✓ Menu van &apos;{events.find((e) => e.id === copyFromEventId)?.name}&apos; wordt gekopiëerd na aanmaken</p>
                )}
              </div>
            )}
          </div>
          <button type="submit" disabled={copyingMenu} className="sm:col-span-2 bg-[var(--accent)] hover:brightness-90 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            {copyingMenu ? '⏳ Menu kopiëren...' : 'Aanmaken'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className={card + ' space-y-3'}>
            <div className="flex flex-wrap gap-3 items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full mt-1 shrink-0 border border-gray-600" style={{ backgroundColor: ev.accentColor || '#16a34a' }} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-lg">{ev.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ev.active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-400'}`}>
                      {ev.active ? 'Actief' : 'Inactief'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{ev.startDate} → {ev.endDate}</p>
                  <p className="text-gray-400 text-sm">€{(ev.pricePerSlot || 0).toFixed(2)} per vakje · €{(ev.drankkaartPrice || 0).toFixed(2)} per drankkaart</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={ev.showPrices} onChange={() => updateEventField(ev, { showPrices: !ev.showPrices })} className="rounded" />
                  Prijzen tonen
                </label>
                {ev.active ? (
                  <button onClick={() => deactivateEvent(ev.id)} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
                    Deactiveren
                  </button>
                ) : (
                  <button onClick={() => activateEvent(ev.id)} className="bg-[var(--accent)] hover:brightness-90 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
                    Activeren
                  </button>
                )}
                <button onClick={() => deleteEvent(ev.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
                  Verwijderen
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs">Accentkleur:</label>
                <input type="color" value={ev.accentColor || '#16a34a'} onChange={(e) => updateEventField(ev, { accentColor: e.target.value })} className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
                <input value={ev.accentColor || '#16a34a'} onChange={(e) => updateEventField(ev, { accentColor: e.target.value })} className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs font-mono w-24 focus:outline-none" maxLength={7} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs">€/vakje:</label>
                <input type="number" step="0.01" min="0" defaultValue={ev.pricePerSlot || 0} onBlur={(e) => updateEventField(ev, { pricePerSlot: parseFloat(e.target.value) || 0 })} className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-20 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs">Prijs/drankkaart (€):</label>
                <input type="number" step="0.01" min="0" defaultValue={ev.drankkaartPrice || 0} onBlur={(e) => updateEventField(ev, { drankkaartPrice: parseFloat(e.target.value) || 0 })} className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-20 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 w-full">
                <label className="text-gray-400 text-xs shrink-0">QR label:</label>
                <input defaultValue={ev.qrLabel || 'Scan om te bestellen'} onBlur={(e) => updateEventField(ev, { qrLabel: e.target.value.trim() || 'Scan om te bestellen' })} className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs flex-1 focus:outline-none" placeholder="Scan om te bestellen" />
              </div>
              <EventPaymentMethods ev={ev} updateEventField={updateEventField} />
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-gray-500 text-center py-8">Nog geen evenementen aangemaakt.</p>}
      </div>
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message}
        danger={true}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        dark={true}
      />
    </div>
  );
}

/* -- EventPaymentMethods -- */
function EventPaymentMethods({ ev, updateEventField }: { ev: Event; updateEventField: (ev: Event, field: Partial<Event>) => Promise<void> }) {
  const [input, setInput] = useState('');
  const methods = ev.drankkaartPaymentMethods || [];
  function addMethod() {
    const v = input.trim();
    if (!v || methods.includes(v)) return;
    updateEventField(ev, { drankkaartPaymentMethods: [...methods, v] });
    setInput('');
  }
  function removeMethod(m: string) {
    updateEventField(ev, { drankkaartPaymentMethods: methods.filter((x) => x !== m) });
  }
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-gray-400 text-xs">Betaalmethoden drankkaarten:</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMethod(); } }}
          placeholder="Bv. Cash..."
          className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none flex-1"
        />
        <button type="button" onClick={addMethod} className="bg-[var(--accent)] hover:brightness-90 text-white px-2 rounded text-xs font-bold">+</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {methods.map((m) => (
          <span key={m} className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            {m}
            <button type="button" onClick={() => removeMethod(m)} className="hover:text-red-400">×</button>
          </span>
        ))}
        {methods.length === 0 && <span className="text-gray-600 text-xs italic">Geen betaalmethoden ingesteld</span>}
      </div>
    </div>
  );
}

/* -- Sortable Item wrapper for DnD -- */
function SortableItem({ id, children }: { id: string; children: (dragHandleProps: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

/* -- Menu Tab -- */
function MenuTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<(MenuCategory & { items: MenuItem[] })[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newItems, setNewItems] = useState<Record<string, { name: string; slots: string; available: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) { setSelectedEventId(active.id); setSelectedEvent(active); }
    });
  }, []);

  useEffect(() => {
    const ev = events.find((e) => e.id === selectedEventId) || null;
    setSelectedEvent(ev);
  }, [selectedEventId, events]);

  useEffect(() => {
    if (!selectedEventId) { setCategories([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'events', selectedEventId, 'categories'), orderBy('order')),
      (snap) => {
        const catDocs = snap.docs;
        Promise.all(
          catDocs.map((catDoc) =>
            getDocs(query(collection(db, 'events', selectedEventId, 'categories', catDoc.id, 'items'), orderBy('order')))
          )
        ).then((itemsResults) => {
          setCategories(catDocs.map((catDoc, i) => ({
            id: catDoc.id,
            ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>),
            items: itemsResults[i].docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)),
          })));
          setLoading(false);
        });
      }
    );
    return () => unsub();
  }, [selectedEventId]);

  async function refreshItems() {
    if (!selectedEventId) return;
    const catsSnap = await getDocs(query(collection(db, 'events', selectedEventId, 'categories'), orderBy('order')));
    const catDocs = catsSnap.docs;
    const itemsResults = await Promise.all(
      catDocs.map((catDoc) =>
        getDocs(query(collection(db, 'events', selectedEventId, 'categories', catDoc.id, 'items'), orderBy('order')))
      )
    );
    setCategories(catDocs.map((catDoc, i) => ({
      id: catDoc.id,
      ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>),
      items: itemsResults[i].docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)),
    })));
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim() || !selectedEventId) return;
    await addDoc(collection(db, 'events', selectedEventId, 'categories'), { name: newCatName.trim(), order: categories.length });
    setNewCatName('');
  }

  async function deleteCategory(catId: string) {
    setConfirmModal({
      title: 'Categorie verwijderen',
      message: 'Weet je zeker dat je deze categorie wil verwijderen?',
      onConfirm: async () => { setConfirmModal(null); await deleteDoc(doc(db, 'events', selectedEventId, 'categories', catId)); },
    });
  }

  async function addItem(catId: string) {
    const item = newItems[catId];
    if (!item?.name?.trim()) return;
    const cat = categories.find((c) => c.id === catId)!;
    await addDoc(collection(db, 'events', selectedEventId, 'categories', catId, 'items'), {
      name: item.name.trim(),
      slots: parseInt(item.slots) || 1,
      available: item.available ?? true,
      order: cat.items.length,
    });
    setNewItems((prev) => ({ ...prev, [catId]: { name: '', slots: '', available: true } }));
    await refreshItems();
  }

  async function toggleItemAvailable(catId: string, item: MenuItem) {
    await updateDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), { available: !item.available });
    await refreshItems();
  }

  async function deleteItem(catId: string, itemId: string) {
    await deleteDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', itemId));
    await refreshItems();
  }

  async function updateItem(catId: string, item: MenuItem, name: string, slots: string) {
    await updateDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), { name: name.trim(), slots: parseInt(slots) || 1 });
    await refreshItems();
  }

  async function updateItemOptionGroups(catId: string, item: MenuItem, optionGroups: OptionGroup[]) {
    await updateDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), { optionGroups });
    await refreshItems();
  }

  async function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const newOrder = arrayMove(categories, oldIndex, newIndex);
    setCategories(newOrder);
    const batch = writeBatch(db);
    newOrder.forEach((cat, index) => {
      batch.update(doc(db, 'events', selectedEventId, 'categories', cat.id), { order: index });
    });
    await batch.commit();
  }

  function handleReorderItems(catId: string, newItems: MenuItem[]) {
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, items: newItems } : c));
    const batch = writeBatch(db);
    newItems.forEach((item, index) => {
      batch.update(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), { order: index });
    });
    batch.commit();
  }

  return (
    <div className="space-y-6">
      <div className={card}>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Evenement</label>
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className={inp + ' w-full max-w-xs'}>
          <option value="">Selecteer evenement...</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}{ev.active ? ' (Actief)' : ''}</option>)}
        </select>
        {selectedEvent && (
          <p className="text-gray-500 text-xs mt-2">Prijs per vakje: €{(selectedEvent.pricePerSlot || 0).toFixed(2)}</p>
        )}
      </div>

      {selectedEventId && (
        <>
          <div className={card}>
            <h2 className="text-base font-bold mb-3 text-white">Categorie toevoegen</h2>
            <form onSubmit={addCategory} className="flex gap-3">
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Naam categorie" className={inp + ' flex-1'} />
              <button type="submit" className="bg-[var(--accent)] hover:brightness-90 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">Toevoegen</button>
            </form>
          </div>

          {loading ? <Spinner /> : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
              <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <SortableItem key={cat.id} id={cat.id}>
                      {(dragHandleProps) => (
                        <CategoryCard
                          cat={cat}
                          pricePerSlot={selectedEvent?.pricePerSlot || 0}
                          newItem={newItems[cat.id] || { name: '', slots: '', available: true }}
                          onNewItemChange={(field, value) => setNewItems((prev) => ({ ...prev, [cat.id]: { ...(prev[cat.id] || { name: '', slots: '', available: true }), [field]: value } }))}
                          onAddItem={() => addItem(cat.id)}
                          onDeleteCategory={() => deleteCategory(cat.id)}
                          onToggleAvailable={(item) => toggleItemAvailable(cat.id, item)}
                          onDeleteItem={(itemId) => deleteItem(cat.id, itemId)}
                          onUpdateItem={(item, name, slots) => updateItem(cat.id, item, name, slots)}
                          onUpdateOptionGroups={(item, groups) => updateItemOptionGroups(cat.id, item, groups)}
                          dragHandleProps={dragHandleProps}
                          onReorderItems={handleReorderItems}
                        />
                      )}
                    </SortableItem>
                  ))}
                  {categories.length === 0 && <p className="text-gray-500 text-center py-8">Nog geen categorieën.</p>}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message}
        danger={true}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        dark={true}
      />
    </div>
  );
}

function CategoryCard({ cat, pricePerSlot, newItem, onNewItemChange, onAddItem, onDeleteCategory, onToggleAvailable, onDeleteItem, onUpdateItem, onUpdateOptionGroups, dragHandleProps, onReorderItems }: {
  cat: MenuCategory & { items: MenuItem[] };
  pricePerSlot: number;
  newItem: { name: string; slots: string; available: boolean };
  onNewItemChange: (field: string, value: any) => void;
  onAddItem: () => void;
  onDeleteCategory: () => void;
  onToggleAvailable: (item: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (item: MenuItem, name: string, slots: string) => void;
  onUpdateOptionGroups: (item: MenuItem, groups: OptionGroup[]) => void;
  dragHandleProps?: Record<string, unknown>;
  onReorderItems?: (catId: string, newItems: MenuItem[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, { name: string; slots: string }>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const [localOptionGroups, setLocalOptionGroups] = useState<Record<string, OptionGroup[]>>({});
  const itemSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cat.items.findIndex((i) => i.id === active.id);
    const newIndex = cat.items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(cat.items, oldIndex, newIndex);
    onReorderItems?.(cat.id, newItems);
  }

  function getOptionGroups(item: MenuItem): OptionGroup[] {
    return localOptionGroups[item.id] ?? item.optionGroups ?? [];
  }

  function saveOptionGroups(item: MenuItem, groups: OptionGroup[]) {
    setLocalOptionGroups((prev) => ({ ...prev, [item.id]: groups }));
    onUpdateOptionGroups(item, groups);
  }

  function addOptionGroup(item: MenuItem) {
    const groups = getOptionGroups(item);
    const newGroup: OptionGroup = {
      id: Date.now().toString(),
      name: 'Nieuwe optiegroep',
      type: 'single',
      required: false,
      choices: [],
    };
    saveOptionGroups(item, [...groups, newGroup]);
  }

  function removeOptionGroup(item: MenuItem, groupId: string) {
    saveOptionGroups(item, getOptionGroups(item).filter((g) => g.id !== groupId));
  }

  function updateOptionGroup(item: MenuItem, groupId: string, patch: Partial<OptionGroup>) {
    saveOptionGroups(item, getOptionGroups(item).map((g) => g.id === groupId ? { ...g, ...patch } : g));
  }

  function addChoice(item: MenuItem, groupId: string) {
    saveOptionGroups(item, getOptionGroups(item).map((g) =>
      g.id === groupId ? { ...g, choices: [...g.choices, { id: Date.now().toString(), name: '' }] } : g
    ));
  }

  function updateChoice(item: MenuItem, groupId: string, choiceId: string, name: string) {
    saveOptionGroups(item, getOptionGroups(item).map((g) =>
      g.id === groupId ? { ...g, choices: g.choices.map((c) => c.id === choiceId ? { ...c, name } : c) } : g
    ));
  }

  function updateChoiceField(item: MenuItem, groupId: string, choiceId: string, field: keyof OptionChoice, value: string | number) {
    saveOptionGroups(item, getOptionGroups(item).map((g) =>
      g.id === groupId ? { ...g, choices: g.choices.map((c) => c.id === choiceId ? { ...c, [field]: value } : c) } : g
    ));
  }

  function removeChoice(item: MenuItem, groupId: string, choiceId: string) {
    saveOptionGroups(item, getOptionGroups(item).map((g) =>
      g.id === groupId ? { ...g, choices: g.choices.filter((c) => c.id !== choiceId) } : g
    ));
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-700/30 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <button {...(dragHandleProps as React.HTMLAttributes<HTMLButtonElement>)} className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 text-lg select-none" title="Versleep categorie">⠿</button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="font-bold text-white text-base flex items-center gap-2">
            {expanded ? '▾' : '▸'} {cat.name}
            <span className="text-sm font-normal text-gray-500">({cat.items.length} items)</span>
          </button>
        </div>
        <button onClick={onDeleteCategory} className="text-red-400 hover:text-red-300 text-sm font-semibold">Verwijderen</button>
      </div>

      {expanded && (
        <div className="p-4 space-y-2">
          <DndContext sensors={itemSensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
            <SortableContext items={cat.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {cat.items.map((item) => (
                <SortableItem key={item.id} id={item.id}>
                  {(itemDragHandleProps) => {
                    const ev = editValues[item.id] || { name: item.name, slots: String(item.slots || 1) };
                    const price = (parseInt(ev.slots) || 0) * pricePerSlot;
                    const optGroups = getOptionGroups(item);
                    const showOpts = expandedOptions[item.id] ?? false;
                    return (
                      <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          <button {...(itemDragHandleProps as React.HTMLAttributes<HTMLButtonElement>)} className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing select-none" title="Versleep item">⠿</button>
                          <input
                            value={ev.name}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...ev, name: e.target.value } }))}
                            onBlur={() => onUpdateItem(item, ev.name, ev.slots)}
                            className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1.5 flex-1 min-w-28 text-sm focus:outline-none"
                          />
                          <div className="flex items-center gap-1">
                            <label className="text-gray-400 text-xs">Vakjes:</label>
                            <input
                              type="number" min="1" step="1"
                              value={ev.slots}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...ev, slots: e.target.value } }))}
                              onBlur={() => onUpdateItem(item, ev.name, ev.slots)}
                              className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1.5 w-16 text-sm focus:outline-none text-center"
                            />
                          </div>
                          {pricePerSlot > 0 && (
                            <span className="text-green-400 text-xs">€{price.toFixed(2)}</span>
                          )}
                          <label className="flex items-center gap-1 text-sm text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={item.available} onChange={() => onToggleAvailable(item)} className="rounded" />
                            Beschikbaar
                          </label>
                          <button
                            onClick={() => setExpandedOptions((prev) => ({ ...prev, [item.id]: !showOpts }))}
                            className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${showOpts ? 'bg-blue-600/30 text-blue-400' : 'bg-gray-600 text-gray-400 hover:text-white'}`}
                          >
                            ⚙ Opties {optGroups.length > 0 ? `(${optGroups.length})` : ''}
                          </button>
                          <button onClick={() => onDeleteItem(item.id)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                        </div>

                        {showOpts && (
                          <div className="border-t border-gray-600 pt-2 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Optiegroepen</p>
                              <button onClick={() => addOptionGroup(item)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 py-1 rounded transition-colors">
                                + Groep toevoegen
                              </button>
                            </div>
                            {optGroups.length === 0 && <p className="text-gray-600 text-xs">Geen optiegroepen</p>}
                            {optGroups.map((group) => (
                              <div key={group.id} className="bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-600">
                                <div className="flex flex-wrap gap-2 items-center">
                                  <input
                                    value={group.name}
                                    onChange={(e) => updateOptionGroup(item, group.id, { name: e.target.value })}
                                    className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 flex-1 min-w-24 text-sm focus:outline-none"
                                    placeholder="Groepsnaam"
                                  />
                                  <select
                                    value={group.type}
                                    onChange={(e) => updateOptionGroup(item, group.id, { type: e.target.value as 'single' | 'multi' })}
                                    className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none"
                                  >
                                    <option value="single">Enkelvoudig</option>
                                    <option value="multi">Meervoudig</option>
                                  </select>
                                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                                    <input type="checkbox" checked={group.required} onChange={(e) => updateOptionGroup(item, group.id, { required: e.target.checked })} className="rounded" />
                                    Verplicht
                                  </label>
                                  <button onClick={() => removeOptionGroup(item, group.id)} className="text-red-400 hover:text-red-300 text-xs">✕ Verwijder groep</button>
                                </div>
                                <div className="space-y-1 pl-2">
                                  {group.choices.map((choice) => (
                                    <div key={choice.id} className="flex gap-2 items-center">
                                      <input
                                        value={choice.name}
                                        onChange={(e) => updateChoice(item, group.id, choice.id, e.target.value)}
                                        className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 flex-1 text-xs focus:outline-none"
                                        placeholder="Keuzenaam"
                                      />
                                      <input
                                        type="number" min={0} step={1}
                                        value={choice.slots ?? 0}
                                        onChange={(e) => updateChoiceField(item, group.id, choice.id, 'slots', parseInt(e.target.value) || 0)}
                                        className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 w-14 text-xs focus:outline-none text-center"
                                        title="Extra vakjes voor deze keuze"
                                      />
                                      <span className="text-gray-500 text-xs">vk</span>
                                      <button onClick={() => removeChoice(item, group.id, choice.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                                    </div>
                                  ))}
                                  <button onClick={() => addChoice(item, group.id)} className="text-xs text-blue-400 hover:text-blue-300 mt-1">
                                    + Keuze toevoegen
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }}
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
          <div className="flex flex-wrap gap-2 items-center border-t border-gray-700 pt-3 mt-1">
            <input value={newItem.name} onChange={(e) => onNewItemChange('name', e.target.value)} placeholder="Naam item" className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1.5 flex-1 min-w-28 text-sm focus:outline-none placeholder-gray-500" />
            <div className="flex items-center gap-1">
              <label className="text-gray-400 text-xs">Vakjes:</label>
              <input type="number" min="1" step="1" value={newItem.slots} onChange={(e) => onNewItemChange('slots', e.target.value)} placeholder="1" className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1.5 w-16 text-sm focus:outline-none text-center placeholder-gray-500" />
            </div>
            <label className="flex items-center gap-1 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={newItem.available} onChange={(e) => onNewItemChange('available', e.target.checked)} className="rounded" />
              Beschikbaar
            </label>
            <button onClick={onAddItem} className="bg-[var(--accent)] hover:brightness-90 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
              + Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Tafels Tab -- */
function TafelsTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [origin, setOrigin] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [qrPerPage, setQrPerPage] = useState<1 | 2 | 4 | 6 | 9>(2);
  const [qrOrientation, setQrOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [qrSize, setQrSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkAdding, setBulkAdding] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) setSelectedEventId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEventId) { setTables([]); return; }
    const unsub = onSnapshot(collection(db, 'events', selectedEventId, 'tables'), (snap) => {
      setTables(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Table)));
    });
    return () => unsub();
  }, [selectedEventId]);

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTableName.trim() || !selectedEventId) return;
    await addDoc(collection(db, 'events', selectedEventId, 'tables'), { name: newTableName.trim() });
    setNewTableName('');
  }

  async function addBulkTables() {
    if (!bulkPrefix.trim() || bulkCount < 1 || !selectedEventId) return;
    setBulkAdding(true);
    try {
      for (let i = 1; i <= bulkCount; i++) {
        await addDoc(collection(db, 'events', selectedEventId, 'tables'), { name: `${bulkPrefix.trim()} ${i}` });
      }
      setBulkPrefix('');
    } finally {
      setBulkAdding(false);
    }
  }

  async function deleteTable(tableId: string) {
    setConfirmModal({
      title: 'Tafel verwijderen',
      message: 'Weet je zeker dat je deze tafel wil verwijderen?',
      onConfirm: async () => { setConfirmModal(null); await deleteDoc(doc(db, 'events', selectedEventId, 'tables', tableId)); },
    });
  }

  function downloadSingleQR(table: Table) {
    const canvas = document.getElementById(`qr-canvas-${table.id}`) as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `tafel-${table.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function downloadAllQRCodes() {
    if (tables.length === 0 || downloading) return;
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const table of tables) {
        const canvas = document.getElementById(`qr-canvas-${table.id}`) as HTMLCanvasElement;
        if (!canvas) continue;
        const dataURL = canvas.toDataURL('image/png');
        const base64 = dataURL.replace(/^data:image\/png;base64,/, '');
        zip.file(`tafel-${table.name}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = 'qr-codes.zip';
      link.href = URL.createObjectURL(blob);
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  function printQRCodes() {
    const event = events.find((e) => e.id === selectedEventId);
    const label = event?.qrLabel || 'Scan om te bestellen';
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;

    function halfHtml(table: Table) {
      const url = `${origin}/tafel/${table.id}`;
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
      return `
          <div class="half">
            <img src="${qrSrc}" width="320" height="320" alt="QR ${table.name}" />
            <p class="table-name">${table.name}</p>
            <p class="label">${label}</p>
          </div>`;
    }

    const pages: string[] = [];
    for (let i = 0; i < tables.length; i += 2) {
      const tableA = tables[i];
      const tableB = tables[i + 1];
      pages.push(`
        <div class="page">
          ${halfHtml(tableA)}
          ${tableB ? halfHtml(tableB) : '<div class="half"></div>'}
        </div>`);
    }

    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>QR Codes</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; }
  .page {
    width: 297mm;
    height: 210mm;
    display: flex;
    flex-direction: row;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .half {
    width: 148.5mm;
    height: 210mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .table-name { margin-top: 14px; font-size: 28px; font-weight: bold; color: #111; }
  .label { margin-top: 6px; font-size: 18px; color: #555; }
</style>
</head><body>${pages.join('')}<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script></body></html>`);
    win.document.close();
  }

  async function downloadQRPdf() {
    if (tables.length === 0 || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const event = events.find((e) => e.id === selectedEventId);
      const label = event?.qrLabel || 'Scan om te bestellen';

      // Page dimensions in mm
      const isLandscape = qrOrientation === 'landscape';
      const pageW = isLandscape ? 297 : 210;
      const pageH = isLandscape ? 210 : 297;

      // Grid layout
      const cols = qrPerPage <= 2 ? qrPerPage : qrPerPage <= 4 ? 2 : qrPerPage <= 6 ? 3 : 3;
      const rows = Math.ceil(qrPerPage / cols);

      const cellW = pageW / cols;
      const cellH = pageH / rows;

      const qrSizeMm = qrSize === 'small' ? Math.min(cellW, cellH) * 0.45
        : qrSize === 'large' ? Math.min(cellW, cellH) * 0.75
        : Math.min(cellW, cellH) * 0.60;

      const pdf = new jsPDF({ orientation: qrOrientation, unit: 'mm', format: 'a4' });
      let pageIdx = 0;

      for (let i = 0; i < tables.length; i++) {
        const posOnPage = i % qrPerPage;
        if (posOnPage === 0 && i > 0) {
          pdf.addPage();
          pageIdx++;
        }

        const col = posOnPage % cols;
        const row = Math.floor(posOnPage / cols);
        const cellX = col * cellW;
        const cellY = row * cellH;

        // Get QR canvas data
        const canvas = document.getElementById(`qr-canvas-${tables[i].id}`) as HTMLCanvasElement;
        if (canvas) {
          const imgData = canvas.toDataURL('image/png');
          const imgX = cellX + (cellW - qrSizeMm) / 2;
          const imgY = cellY + (cellH - qrSizeMm) / 2 - 6;
          pdf.addImage(imgData, 'PNG', imgX, imgY, qrSizeMm, qrSizeMm);

          // Table name
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(20, 20, 20);
          pdf.text(tables[i].name, cellX + cellW / 2, imgY + qrSizeMm + 5, { align: 'center' });

          // Label
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(label, cellX + cellW / 2, imgY + qrSizeMm + 10, { align: 'center' });
        }
      }

      pdf.save('qr-codes.pdf');
    } finally {
      setDownloadingPdf(false);
    }
  }


  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const qrLabel = selectedEvent?.qrLabel || 'Scan om te bestellen';

  return (
    <div className="space-y-6">
      <div className={card}>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Evenement</label>
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className={inp + ' w-full max-w-xs'}>
          <option value="">Selecteer evenement...</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}{ev.active ? ' (Actief)' : ''}</option>)}
        </select>
      </div>

      {selectedEventId && (
        <>
          <div className={card}>
            <h2 className="text-base font-bold mb-3 text-white">Tafel toevoegen</h2>
            <form onSubmit={addTable} className="flex gap-3">
              <input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Tafelnaam of -nummer" className={inp + ' flex-1'} />
              <button type="submit" className="bg-[var(--accent)] hover:brightness-90 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">Toevoegen</button>
            </form>
          </div>

          <div className={card}>
            <h2 className="text-base font-bold mb-3 text-white">📋 Bulk aanmaken</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="text-gray-400 text-xs mb-1 block">Naam-prefix</label>
                <input
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="bv. Tafel"
                  className={inp + ' w-full'}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Aantal</label>
                <input
                  type="number" min={1} max={100}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className={inp + ' w-24 text-center'}
                />
              </div>
              <button
                onClick={addBulkTables}
                disabled={bulkAdding || !bulkPrefix.trim() || !selectedEventId}
                className="bg-[var(--accent)] hover:brightness-90 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                {bulkAdding ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Bezig...</>
                ) : 'Aanmaken'}
              </button>
            </div>
            {bulkPrefix.trim() && bulkCount > 0 && (
              <p className="text-gray-500 text-xs mt-2">Maakt {bulkCount} tafels aan: &quot;{bulkPrefix.trim()} 1&quot; t/m &quot;{bulkPrefix.trim()} {bulkCount}&quot;</p>
            )}
          </div>

          {tables.length > 0 && (
            <div className={card + ' space-y-4'}>
              <h2 className="text-base font-bold text-white">📥 QR codes downloaden</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Aantal per pagina</label>
                  <select value={qrPerPage} onChange={(e) => setQrPerPage(Number(e.target.value) as 1 | 2 | 4 | 6 | 9)} className={inp + ' w-full'}>
                    {[1, 2, 4, 6, 9].map((n) => <option key={n} value={n}>{n} per pagina</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Oriëntatie</label>
                  <select value={qrOrientation} onChange={(e) => setQrOrientation(e.target.value as 'portrait' | 'landscape')} className={inp + ' w-full'}>
                    <option value="landscape">Liggend (landscape)</option>
                    <option value="portrait">Staand (portrait)</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">QR-grootte</label>
                  <select value={qrSize} onChange={(e) => setQrSize(e.target.value as 'small' | 'medium' | 'large')} className={inp + ' w-full'}>
                    <option value="small">Klein</option>
                    <option value="medium">Medium</option>
                    <option value="large">Groot</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button onClick={downloadAllQRCodes} disabled={downloading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm flex items-center gap-2">
                  {downloading ? '⏳ Bezig...' : '⬇️ Downloaden als ZIP'}
                </button>
                <button onClick={downloadQRPdf} disabled={downloadingPdf} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm flex items-center gap-2">
                  {downloadingPdf ? '⏳ Bezig...' : '📄 Downloaden als PDF'}
                </button>
              </div>
            </div>
          )}

          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            {tables.map((table) => (
              <QRCodeCanvas key={table.id} id={`qr-canvas-${table.id}`} value={`${origin}/tafel/${table.id}`} size={400} />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => {
              const url = `${origin}/tafel/${table.id}`;
              return (
                <div key={table.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                  <h3 className="font-bold text-xl text-white mb-3">{table.name}</h3>
                  <div className="flex justify-center mb-3 bg-white p-3 rounded-lg inline-block mx-auto">
                    <QRCodeSVG value={url} size={160} />
                  </div>
                  <p className="text-xs text-gray-500 mb-4 break-all font-mono">{url}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => window.open(url, '_blank')} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                      🔗 Open
                    </button>
                    <button onClick={() => downloadSingleQR(table)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                      ⬇️ Download
                    </button>
                    <button onClick={() => deleteTable(table.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                      Verwijderen
                    </button>
                  </div>
                </div>
              );
            })}
            {tables.length === 0 && <p className="text-gray-500 text-center py-8 col-span-3">Nog geen tafels toegevoegd.</p>}
          </div>

        </>
      )}
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message}
        danger={true}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        dark={true}
      />
    </div>
  );
}

/* -- Bestellingen Tab -- */
function BestellingenTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [screens, setScreens] = useState<BarScreen[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'alle' | 'besteld' | 'klaar'>('alle');
  const [nameFilter, setNameFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [eventCategories, setEventCategories] = useState<string[]>([]);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState<'besteld' | 'klaar'>('besteld');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editEventCategories, setEditEventCategories] = useState<(MenuCategory & { items: MenuItem[] })[]>([]);
  const [loadingEditCats, setLoadingEditCats] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addItemSelected, setAddItemSelected] = useState<MenuItem | null>(null);
  const [addItemCat, setAddItemCat] = useState<(MenuCategory & { items: MenuItem[] }) | null>(null);
  const [addItemOptions, setAddItemOptions] = useState<Record<string, string[]>>({});
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  function fmtDuration(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function tsToMs(ts: unknown): number | null {
    if (!ts) return null;
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts) return (ts as { toDate: () => Date }).toDate().getTime();
    return null;
  }

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) { setSelectedEventId(active.id); setSelectedEvent(active); }
    });
  }, []);

  useEffect(() => {
    const ev = events.find((e) => e.id === selectedEventId) || null;
    setSelectedEvent(ev);
    setCategoryFilter('');
    if (selectedEventId) {
      getDocs(collection(db, 'events', selectedEventId, 'screens')).then((snap) => {
        setScreens(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BarScreen)));
      }).catch(() => setScreens([]));
      getDocs(query(collection(db, 'events', selectedEventId, 'categories'), orderBy('order'))).then((snap) => {
        setEventCategories(snap.docs.map((d) => (d.data() as MenuCategory).name).filter(Boolean));
      }).catch(() => setEventCategories([]));
    } else {
      setScreens([]);
      setEventCategories([]);
    }
  }, [selectedEventId, events]);

  useEffect(() => {
    if (!selectedEventId) { setOrders([]); return; }
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'events', selectedEventId, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedEventId]);

  async function deleteOrder(orderId: string) {
    setConfirmModal({
      title: 'Bestelling verwijderen',
      message: 'Weet je zeker dat je deze bestelling wil verwijderen?',
      onConfirm: async () => { setConfirmModal(null); await deleteDoc(doc(db, 'events', selectedEventId, 'orders', orderId)); },
    });
  }

  function openEditOrder(order: Order) {
    setEditOrder(order);
    setEditNote(order.note || '');
    setEditStatus(order.status);
    setEditItems([...order.items]);
    setAddItemSearch('');
    setAddItemSelected(null);
    setAddItemOptions({});
    setLoadingEditCats(true);
    (async () => {
      try {
        const catsSnap = await getDocs(query(collection(db, 'events', selectedEventId, 'categories'), orderBy('order')));
        const cats: (MenuCategory & { items: MenuItem[] })[] = [];
        for (const catDoc of catsSnap.docs) {
          const itemsSnap = await getDocs(query(collection(db, 'events', selectedEventId, 'categories', catDoc.id, 'items'), orderBy('order')));
          cats.push({ id: catDoc.id, ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>), items: itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)) });
        }
        setEditEventCategories(cats);
      } finally {
        setLoadingEditCats(false);
      }
    })();
  }

  async function saveEditOrder() {
    if (!editOrder) return;
    const wasKlaar = editOrder.status === 'klaar';
    const nowKlaar = editStatus === 'klaar';
    const update: Record<string, unknown> = {
      items: editItems,
      note: editNote,
      status: editStatus,
    };
    if (nowKlaar && !wasKlaar) update.completedAt = serverTimestamp();
    if (!nowKlaar && wasKlaar) update.completedAt = null;
    await updateDoc(doc(db, 'events', selectedEventId, 'orders', editOrder.id), update);
    setEditOrder(null);
    setEditItems([]);
    setEditEventCategories([]);
  }

  async function exportOrdersExcel() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const data = orders.map((o) => ({
      'Tafel': o.tableName,
      'Naam': o.customerName || '',
      'Status': o.status,
      'Tijdstip': fmt(o.createdAt),
      'Items': o.items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
      'Drankkaarten': o.drankkaarten || 0,
      'Opmerking': o.note || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Bestellingen');
    const filename = `bestellingen-${selectedEvent?.name || 'export'}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  const tableNames = [...new Set(orders.map((o) => o.tableName).filter(Boolean))].sort();

  const filtered = orders.filter((o) => {
    if (filter !== 'alle' && o.status !== filter) return false;
    if (tableFilter && o.tableName !== tableFilter) return false;
    const search = nameFilter.trim().toLowerCase();
    if (search) {
      const inName = o.customerName?.toLowerCase().includes(search) ?? false;
      if (!inName) return false;
    }
    if (categoryFilter) {
      const hasCategory = o.items.some((item) => item.categoryName === categoryFilter);
      if (!hasCategory) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditOrder(null)} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white">✏️ Bestelling bewerken</h2>
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-2">Items</p>
              <div className="space-y-2 bg-gray-700/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {editItems.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-sm flex-1 min-w-0 truncate">{item.name}</span>
                      <button onClick={() => setEditItems((prev) => { const n = [...prev]; const newQty = n[i].quantity - 1; if (newQty <= 0) return prev.filter((_, idx) => idx !== i); n[i] = { ...n[i], quantity: newQty }; return n; })} className="w-7 h-7 rounded-full bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm flex items-center justify-center shrink-0">−</button>
                      <span className="text-white font-bold w-6 text-center text-sm shrink-0">{item.quantity}</span>
                      <button onClick={() => setEditItems((prev) => { const n = [...prev]; n[i] = { ...n[i], quantity: n[i].quantity + 1 }; return n; })} className="w-7 h-7 rounded-full bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm flex items-center justify-center shrink-0">+</button>
                      <button onClick={() => setEditItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 text-xs ml-1 shrink-0">✕</button>
                    </div>
                    {item.selectedOptions && item.selectedOptions.filter((o) => o.selected.length > 0).length > 0 && (
                      <div className="ml-2 pl-2 border-l border-gray-600 text-xs text-gray-500 flex flex-wrap gap-x-3">
                        {item.selectedOptions.filter((o) => o.selected.length > 0).map((o) => (
                          <span key={o.groupId}><span className="text-gray-400">{o.groupName}:</span> {o.selected.join(', ')}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {editOrder.drankkaarten > 0 && (
                  <p className="text-yellow-400 text-sm">🎟️ {editOrder.drankkaarten} drankkaart{editOrder.drankkaarten !== 1 ? 'en' : ''}</p>
                )}
                {editItems.length === 0 && <p className="text-gray-500 text-sm">Geen items</p>}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-2">Item toevoegen</p>
              {loadingEditCats ? <p className="text-gray-500 text-sm">Laden...</p> : (
                <div className="space-y-2">
                  <input
                    value={addItemSearch}
                    onChange={(e) => { setAddItemSearch(e.target.value); setAddItemSelected(null); setAddItemOptions({}); }}
                    placeholder="Zoek een item..."
                    className={inp + ' w-full'}
                  />
                  {addItemSearch.trim() && !addItemSelected && (
                    <div className="bg-gray-700 border border-gray-600 rounded-lg max-h-36 overflow-y-auto">
                      {(() => {
                        const results = editEventCategories.flatMap((cat) =>
                          cat.items.filter((item) => item.name.toLowerCase().includes(addItemSearch.toLowerCase())).map((item) => ({ item, cat }))
                        );
                        return results.length > 0 ? results.map(({ item, cat }) => (
                          <button key={item.id + cat.id} onClick={() => { setAddItemSelected(item); setAddItemCat(cat); setAddItemOptions({}); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 flex justify-between items-center">
                            <span>{item.name}</span><span className="text-gray-500 text-xs ml-2 shrink-0">{cat.name}</span>
                          </button>
                        )) : <p className="px-3 py-2 text-gray-500 text-sm">Geen items gevonden</p>;
                      })()}
                    </div>
                  )}
                  {addItemSelected && (
                    <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                      <p className="text-white text-sm font-semibold">{addItemSelected.name}</p>
                      {(addItemSelected.optionGroups || []).length > 0 && (
                        <div className="space-y-2">
                          {(addItemSelected.optionGroups || []).map((group) => (
                            <div key={group.id}>
                              <p className="text-gray-400 text-xs mb-1">{group.name}{group.required ? ' *' : ''}</p>
                              <div className="flex flex-wrap gap-1">
                                {group.choices.map((choice) => {
                                  const isSel = (addItemOptions[group.id] || []).includes(choice.name);
                                  return (
                                    <button key={choice.id} onClick={() => setAddItemOptions((prev) => { const cur = prev[group.id] || []; if (group.type === 'single') return { ...prev, [group.id]: [choice.name] }; return { ...prev, [group.id]: cur.includes(choice.name) ? cur.filter((c) => c !== choice.name) : [...cur, choice.name] }; })} className={`text-xs px-2 py-1 rounded-full border transition-colors ${isSel ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'}`}>{choice.name}</button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (!addItemSelected || !addItemCat) return;
                          for (const group of (addItemSelected.optionGroups || [])) {
                            if (group.required && (!addItemOptions[group.id] || addItemOptions[group.id].length === 0)) return;
                          }
                          const selectedOptions: SelectedOption[] = (addItemSelected.optionGroups || [])
                            .map((group) => ({ groupId: group.id, groupName: group.name, type: group.type, selected: addItemOptions[group.id] || [] }))
                            .filter((o) => o.selected.length > 0);
                          const newOrderItem: OrderItem = { itemId: addItemSelected.id, name: addItemSelected.name, quantity: 1, slots: addItemSelected.slots, price: addItemSelected.slots * (selectedEvent?.pricePerSlot || 0), categoryName: addItemCat.name, ...(selectedOptions.length > 0 ? { selectedOptions } : {}) };
                          setEditItems((prev) => [...prev, newOrderItem]);
                          setAddItemSearch('');
                          setAddItemSelected(null);
                          setAddItemOptions({});
                        }}
                        className="w-full bg-[var(--accent)] hover:brightness-90 text-white text-sm font-semibold py-1.5 rounded-lg transition-colors"
                      >
                        + Toevoegen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Status</label>
              <div className="flex gap-2">
                {(['besteld', 'klaar'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${editStatus === s ? (s === 'besteld' ? 'bg-red-500/30 text-red-400 border border-red-500/50' : 'bg-green-500/30 text-green-400 border border-green-500/50') : 'bg-gray-700 text-gray-400 border border-gray-600'}`}
                  >
                    {s === 'besteld' ? 'Besteld' : 'Klaar'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Opmerking</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className={inp + ' w-full resize-none'}
                rows={3}
                placeholder="Opmerking..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditOrder(null)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 text-sm font-semibold transition-colors">
                Annuleren
              </button>
              <button onClick={saveEditOrder} className="flex-1 py-2 rounded-lg bg-[var(--accent)] hover:brightness-90 text-white text-sm font-semibold transition-colors">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={card}>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Evenement</label>
        <div className="flex flex-wrap gap-3 items-end">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className={inp + ' flex-1 max-w-xs'}>
            <option value="">Selecteer evenement...</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}{ev.active ? ' (Actief)' : ''}</option>)}
          </select>
          {selectedEventId && orders.length > 0 && (
            <button onClick={exportOrdersExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm transition-colors font-semibold">
              📥 Exporteer Excel
            </button>
          )}
        </div>
      </div>

      {selectedEventId && (
        <>
          <div className={card + ' space-y-3'}>
            <div className="flex gap-2 flex-wrap">
              {(['alle', 'besteld', 'klaar'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`py-1.5 px-4 rounded-lg text-sm font-semibold transition-colors ${filter === f ? 'bg-[var(--accent)] text-white' : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'}`}>
                  {f === 'alle' ? 'Alle' : f === 'besteld' ? 'Besteld' : 'Klaar'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="🔍 Naam besteller..."
                className={inp + ' w-full'}
              />
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className={inp + ' w-full'}
              >
                <option value="">Alle tafels</option>
                {tableNames.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={inp + ' w-full'}
              >
                <option value="">Alle categorieën</option>
                {eventCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(nameFilter || tableFilter || categoryFilter || filter !== 'alle') && (
              <button
                onClick={() => { setNameFilter(''); setTableFilter(''); setCategoryFilter(''); setFilter('alle'); }}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                ✕ Filters wissen ({filtered.length} resultaten)
              </button>
            )}
          </div>

          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {filtered.map((order) => (
                <div key={order.id} className={card}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-white text-lg">{order.tableName}</p>
                      {order.customerName && <p className="text-gray-300 text-sm font-medium">👤 {order.customerName}</p>}
                      <p className="text-gray-500 text-sm">{fmt(order.createdAt)}</p>
                      {(() => {
                        const createdMs = tsToMs(order.createdAt);
                        const completedMs = tsToMs(order.completedAt);
                        if (createdMs && completedMs) {
                          return <p className="text-green-400 text-xs mt-0.5">⏱ Totaal: {fmtDuration(completedMs - createdMs)}</p>;
                        }
                        return null;
                      })()}
                      {order.screenCompletedAt && Object.keys(order.screenCompletedAt).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(order.screenCompletedAt).map(([screenId, ts]) => {
                            const screen = screens.find((s) => s.id === screenId);
                            const createdMs = tsToMs(order.createdAt);
                            const doneMs = tsToMs(ts);
                            if (!createdMs || !doneMs) return null;
                            return (
                              <p key={screenId} className="text-blue-400 text-xs">
                                📺 {screen?.name || screenId}: {fmtDuration(doneMs - createdMs)}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === 'besteld' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                        {order.status === 'besteld' ? 'Besteld' : 'Klaar'}
                      </span>
                      <button onClick={() => openEditOrder(order)} className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded hover:bg-blue-500/10 transition-colors" title="Bewerken">✏️</button>
                      <button onClick={() => deleteOrder(order.id)} className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/10 transition-colors" title="Verwijderen">🗑️</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-300"><span className="font-bold text-white">{item.quantity}×</span> {item.name}</span>
                        <span className="text-gray-500">{(item.slots || 0) * item.quantity} vakjes{(selectedEvent?.pricePerSlot || 0) > 0 ? ` · €${((item.slots || 0) * item.quantity * (selectedEvent?.pricePerSlot || 0)).toFixed(2)}` : ''}</span>
                      </div>
                    ))}
                    {order.drankkaarten > 0 && (
                      <p className="text-yellow-400 text-sm">🎟️ {order.drankkaarten} drankkaart{order.drankkaarten !== 1 ? 'en' : ''}</p>
                    )}
                    {order.note && <p className="text-gray-500 text-sm mt-1 bg-gray-700/50 rounded px-2 py-1">💬 {order.note}</p>}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-gray-500 text-center py-8">Geen bestellingen gevonden.</p>}
            </div>
          )}
        </>
      )}
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message}
        danger={true}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        dark={true}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-green-400">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
    </div>
  );
}

/* -- Instellingen Tab -- */
function InstellingenTab() {
  const [barPw, setBarPw] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [kassaPw, setKassaPw] = useState('');
  const [savingBar, setSavingBar] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingKassa, setSavingKassa] = useState(false);
  const [barMsg, setBarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [kassaMsg, setKassaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [blockedDevices, setBlockedDevices] = useState<string[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [devicesInfo, setDevicesInfo] = useState<Record<string, KassaDeviceInfo>>({});
  const [editingDeviceName, setEditingDeviceName] = useState<string | null>(null);
  const [editDeviceNameVal, setEditDeviceNameVal] = useState('');

  const [accentColor, setAccentColor] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('ksa_accent_color') || '#16a34a' : '#16a34a'));
  const [appName, setAppName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('ksa_app_name') || 'KSA Bestelapp' : 'KSA Bestelapp'));
  const [appNameSaved, setAppNameSaved] = useState(false);

  const [dangerConfirm, setDangerConfirm] = useState(false);
  const [deletingOrders, setDeletingOrders] = useState(false);

  useEffect(() => {
    getBlockedKassaDevices().then(setBlockedDevices);
    getKassaDevicesInfo().then(setDevicesInfo);
  }, []);

  async function handleUnblock(deviceId: string) {
    setUnblockingId(deviceId);
    try {
      await unblockKassaDevice(deviceId);
      setBlockedDevices((prev) => prev.filter((d) => d !== deviceId));
    } finally {
      setUnblockingId(null);
    }
  }

  async function handleRenameDevice(deviceId: string) {
    const name = editDeviceNameVal.trim();
    if (!name) return;
    await updateKassaDeviceName(deviceId, name);
    setDevicesInfo((prev) => ({ ...prev, [deviceId]: { ...prev[deviceId], blockCount: prev[deviceId]?.blockCount || 0, name } }));
    setEditingDeviceName(null);
    setEditDeviceNameVal('');
  }

  async function handleSaveBarPw(e: React.FormEvent) {
    e.preventDefault();
    if (!barPw.trim()) { setBarMsg({ type: 'error', text: 'Vul een nieuw barwachtwoord in.' }); return; }
    setSavingBar(true);
    try {
      const snap = await (await import('firebase/firestore')).getDoc((await import('firebase/firestore')).doc((await import('@/lib/firebase')).db, 'settings', 'passwords'));
      const current = snap.exists() ? snap.data() as { barPassword?: string; adminPassword?: string; kassaPassword?: string } : {};
      await updatePasswords(barPw.trim(), current.adminPassword || '', current.kassaPassword);
      setBarMsg({ type: 'success', text: 'Barwachtwoord opgeslagen!' });
      setBarPw('');
    } catch { setBarMsg({ type: 'error', text: 'Fout bij opslaan.' }); }
    finally { setSavingBar(false); }
  }

  async function handleSaveAdminPw(e: React.FormEvent) {
    e.preventDefault();
    if (!adminPw.trim()) { setAdminMsg({ type: 'error', text: 'Vul een nieuw adminwachtwoord in.' }); return; }
    setSavingAdmin(true);
    try {
      const snap = await (await import('firebase/firestore')).getDoc((await import('firebase/firestore')).doc((await import('@/lib/firebase')).db, 'settings', 'passwords'));
      const current = snap.exists() ? snap.data() as { barPassword?: string; adminPassword?: string; kassaPassword?: string } : {};
      await updatePasswords(current.barPassword || '', adminPw.trim(), current.kassaPassword);
      setAdminMsg({ type: 'success', text: 'Adminwachtwoord opgeslagen!' });
      setAdminPw('');
    } catch { setAdminMsg({ type: 'error', text: 'Fout bij opslaan.' }); }
    finally { setSavingAdmin(false); }
  }

  async function handleSaveKassaPw(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(kassaPw)) { setKassaMsg({ type: 'error', text: 'Voer exact 4 cijfers in.' }); return; }
    setSavingKassa(true);
    try {
      const snap = await (await import('firebase/firestore')).getDoc((await import('firebase/firestore')).doc((await import('@/lib/firebase')).db, 'settings', 'passwords'));
      const current = snap.exists() ? snap.data() as { barPassword?: string; adminPassword?: string } : {};
      await updatePasswords(current.barPassword || '', current.adminPassword || '', kassaPw);
      setKassaMsg({ type: 'success', text: 'Kassa-pincode opgeslagen!' });
      setKassaPw('');
    } catch { setKassaMsg({ type: 'error', text: 'Fout bij opslaan.' }); }
    finally { setSavingKassa(false); }
  }

  function handleAccentChange(color: string) {
    setAccentColor(color);
    localStorage.setItem('ksa_accent_color', color);
    document.documentElement.style.setProperty('--accent', color);
  }

  function handleAppNameSave() {
    localStorage.setItem('ksa_app_name', appName.trim() || 'KSA Bestelapp');
    setAppNameSaved(true);
    setTimeout(() => setAppNameSaved(false), 2000);
  }

  async function handleDeleteAllOrders() {
    setDeletingOrders(true);
    try {
      const { collection: col, getDocs: gd, query: q, where: wh, writeBatch: wb, doc: d } = await import('firebase/firestore');
      const { db: fdb } = await import('@/lib/firebase');
      const evSnap = await gd(q(col(fdb, 'events'), wh('active', '==', true)));
      if (evSnap.empty) return;
      const evId = evSnap.docs[0].id;
      const ordersSnap = await gd(col(fdb, 'events', evId, 'orders'));
      const batch = wb(fdb);
      ordersSnap.docs.forEach((dd) => batch.delete(d(fdb, 'events', evId, 'orders', dd.id)));
      await batch.commit();
      setDangerConfirm(false);
    } catch { /* ignore */ }
    finally { setDeletingOrders(false); }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Wachtwoorden */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={card}>
          <h2 className="text-base font-bold text-white mb-3">🍺 Barwachtwoord</h2>
          <form onSubmit={handleSaveBarPw} className="space-y-3">
            <input type="password" value={barPw} onChange={(e) => setBarPw(e.target.value)} placeholder="Nieuw barwachtwoord" className={inp + ' w-full'} />
            {barMsg && <p className={`text-xs font-medium ${barMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{barMsg.text}</p>}
            <button type="submit" disabled={savingBar} className="w-full bg-[var(--accent)] hover:brightness-90 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all text-sm">
              {savingBar ? 'Opslaan...' : 'Opslaan'}
            </button>
          </form>
        </div>
        <div className={card}>
          <h2 className="text-base font-bold text-white mb-3">🏪 Kassa-pincode</h2>
          <form onSubmit={handleSaveKassaPw} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={kassaPw}
              onChange={(e) => setKassaPw(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-cijferige pincode"
              className={inp + ' w-full tracking-[0.5em] text-center text-lg font-bold'}
            />
            {kassaMsg && <p className={`text-xs font-medium ${kassaMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{kassaMsg.text}</p>}
            <button type="submit" disabled={savingKassa} className="w-full bg-[var(--accent)] hover:brightness-90 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all text-sm">
              {savingKassa ? 'Opslaan...' : 'Opslaan'}
            </button>
          </form>
        </div>
        <div className={card}>
          <h2 className="text-base font-bold text-white mb-3">⚙️ Adminwachtwoord</h2>
          <form onSubmit={handleSaveAdminPw} className="space-y-3">
            <input type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} placeholder="Nieuw adminwachtwoord" className={inp + ' w-full'} />
            {adminMsg && <p className={`text-xs font-medium ${adminMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{adminMsg.text}</p>}
            <button type="submit" disabled={savingAdmin} className="w-full bg-[var(--accent)] hover:brightness-90 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all text-sm">
              {savingAdmin ? 'Opslaan...' : 'Opslaan'}
            </button>
          </form>
        </div>
      </div>

      {/* Weergave */}
      <div className={card}>
        <h2 className="text-base font-bold text-white mb-4">🎨 Weergave-instellingen</h2>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Accentkleur (actieknoppen &amp; spinners)</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleAccentChange(e.target.value)}
                className="w-12 h-10 rounded-lg border border-gray-600 bg-gray-700 cursor-pointer p-1"
              />
              <span className="text-gray-300 text-sm font-mono">{accentColor}</span>
              <button onClick={() => handleAccentChange('#16a34a')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Reset</button>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">App naam (lokale opslag)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className={inp + ' flex-1'}
                placeholder="KSA Bestelapp"
              />
              <button onClick={handleAppNameSave} className="bg-[var(--accent)] hover:brightness-90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all">
                {appNameSaved ? '✓' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kassa-toestellen */}
      {(blockedDevices.length > 0 || Object.keys(devicesInfo).length > 0) && (
        <div className={card + ' border-yellow-500/30 space-y-4'}>
          <h2 className="text-base font-bold text-yellow-400">🔒 Kassa-toestellen</h2>

          {blockedDevices.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Momenteel geblokkeerd</p>
              <div className="space-y-2">
                {blockedDevices.map((deviceId) => {
                  const info = devicesInfo[deviceId];
                  return (
                    <div key={deviceId} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      <div>
                        {info?.name ? (
                          <p className="text-green-400 text-sm font-semibold">{info.name}</p>
                        ) : null}
                        <p className="text-gray-400 text-xs font-mono truncate max-w-[200px]">{deviceId}</p>
                      </div>
                      <button
                        onClick={() => handleUnblock(deviceId)}
                        disabled={unblockingId === deviceId}
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 font-semibold py-1 px-3 rounded-lg text-xs transition-colors disabled:opacity-50"
                      >
                        {unblockingId === deviceId ? 'Bezig...' : '✓ Goedkeuren'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(devicesInfo).length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Toestelgeschiedenis</p>
              <div className="space-y-2">
                {Object.entries(devicesInfo).map(([deviceId, info]) => (
                  <div key={deviceId} className="bg-gray-700/50 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {info.name ? (
                          <p className="text-green-400 text-sm font-semibold">{info.name}</p>
                        ) : null}
                        <p className="text-gray-400 text-xs font-mono truncate">{deviceId}</p>
                        <p className="text-gray-500 text-xs">
                          {info.blockCount} keer geblokkeerd
                          {info.lastBlockedAt && (
                            <> · laatste: {(() => {
                              try {
                                const d = info.lastBlockedAt?.toDate ? info.lastBlockedAt.toDate() : new Date(info.lastBlockedAt);
                                return d.toLocaleDateString('nl-BE') + ' ' + d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
                              } catch { return ''; }
                            })()}</>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => { setEditingDeviceName(deviceId); setEditDeviceNameVal(info.name || ''); }}
                        className="text-gray-400 hover:text-white text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded transition-colors flex-shrink-0"
                        title="Naam bewerken"
                      >
                        ✏️
                      </button>
                    </div>
                    {editingDeviceName === deviceId && (
                      <div className="flex gap-2 mt-1">
                        <input
                          value={editDeviceNameVal}
                          onChange={(e) => setEditDeviceNameVal(e.target.value)}
                          placeholder="Naam toestel (bv. Bar iPad)"
                          className={inp + ' flex-1 text-xs py-1'}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameDevice(deviceId); if (e.key === 'Escape') setEditingDeviceName(null); }}
                        />
                        <button onClick={() => handleRenameDevice(deviceId)} className="bg-[var(--accent)] hover:brightness-90 text-white font-semibold py-1 px-3 rounded-lg text-xs transition-colors">
                          Opslaan
                        </button>
                        <button onClick={() => setEditingDeviceName(null)} className="bg-gray-600 hover:bg-gray-500 text-gray-300 font-semibold py-1 px-2 rounded-lg text-xs transition-colors">
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danger zone */}
      <div className={card + ' border-red-500/30'}>
        <h2 className="text-base font-bold text-red-400 mb-2">⚠️ Gevarenzone</h2>
        <p className="text-gray-400 text-sm mb-3">Verwijder alle bestellingen van het actieve evenement. Dit kan niet ongedaan worden gemaakt.</p>
        {!dangerConfirm ? (
          <button onClick={() => setDangerConfirm(true)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
            🗑️ Alle bestellingen verwijderen
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleDeleteAllOrders} disabled={deletingOrders} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
              {deletingOrders ? 'Bezig...' : 'Ja, verwijder alles'}
            </button>
            <button onClick={() => setDangerConfirm(false)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
              Annuleren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Statistieken Tab -- */
function StatistiekenTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) { setSelectedEventId(active.id); setSelectedEvent(active); }
    });
  }, []);

  useEffect(() => {
    const ev = events.find((e) => e.id === selectedEventId) || null;
    setSelectedEvent(ev);
  }, [selectedEventId, events]);

  useEffect(() => {
    if (!selectedEventId) { setOrders([]); return; }
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'events', selectedEventId, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedEventId]);

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const statsData: Record<string, string | number>[] = summaryItems.map((item) => ({
      'Item naam': item.name,
      'Aantal': item.qty,
      'Vakjes totaal': item.vakjes,
      'Waarde (EUR)': pricePerSlot > 0 ? Number((item.vakjes * pricePerSlot).toFixed(2)) : '',
    }));
    statsData.push({
      'Item naam': 'TOTAAL',
      'Aantal': totalQty,
      'Vakjes totaal': totalVakjes,
      'Waarde (EUR)': pricePerSlot > 0 ? Number(totalWaarde.toFixed(2)) : '',
    });
    const ws1 = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Statistieken');
    const ordersData = orders.map((o) => ({
      'Tafel': o.tableName,
      'Naam': o.customerName || '',
      'Status': o.status,
      'Tijdstip': fmt(o.createdAt),
      'Items': o.items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
      'Drankkaarten': o.drankkaarten || 0,
      'Opmerking': o.note || '',
    }));
    const ws2 = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Bestellingen');
    const filename = `statistieken-${selectedEvent?.name || 'export'}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  const pricePerSlot = selectedEvent?.pricePerSlot || 0;
  const itemMap: Record<string, { name: string; qty: number; vakjes: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, vakjes: 0 };
      itemMap[item.name].qty += item.quantity;
      itemMap[item.name].vakjes += (item.slots || 0) * item.quantity;
    }
  }
  const summaryItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
  const totalVakjes = summaryItems.reduce((s, i) => s + i.vakjes, 0);
  const totalQty = summaryItems.reduce((s, i) => s + i.qty, 0);
  const totalWaarde = totalVakjes * pricePerSlot;
  const totalDrankkaarten = orders.reduce((s, o) => s + (o.drankkaarten || 0), 0);

  return (
    <div className="space-y-6">
      <div className={card}>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Evenement</label>
        <div className="flex flex-wrap gap-3 items-end">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className={inp + ' flex-1 max-w-xs'}>
            <option value="">Selecteer evenement...</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}{ev.active ? ' (Actief)' : ''}</option>)}
          </select>
          {selectedEventId && (
            <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm transition-colors font-semibold">
              📥 Exporteer Excel
            </button>
          )}
        </div>
      </div>

      {selectedEventId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Bestellingen" value={String(orders.length)} />
            <StatCard label="Items totaal" value={String(totalQty)} />
            <StatCard label="Drankkaarten" value={String(totalDrankkaarten)} />
            <StatCard label="Totale waarde" value={`€${totalWaarde.toFixed(2)}`} />
          </div>

          {loading ? <Spinner /> : summaryItems.length > 0 ? (
            <div className={card}>
              <h3 className="font-bold text-white mb-3">📊 Per item</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 py-2 pr-4">Item naam</th>
                      <th className="text-right text-gray-400 py-2 px-2">Aantal</th>
                      <th className="text-right text-gray-400 py-2 px-2">Vakjes totaal</th>
                      {pricePerSlot > 0 && <th className="text-right text-gray-400 py-2 pl-2">Waarde</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryItems.map((item) => (
                      <tr key={item.name} className="border-b border-gray-700/50">
                        <td className="text-white py-2 pr-4">{item.name}</td>
                        <td className="text-right text-gray-300 py-2 px-2 font-semibold">{item.qty}</td>
                        <td className="text-right text-gray-400 py-2 px-2">{item.vakjes}</td>
                        {pricePerSlot > 0 && (
                          <td className="text-right text-green-400 py-2 pl-2">€{(item.vakjes * pricePerSlot).toFixed(2)}</td>
                        )}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-600 font-bold">
                      <td className="text-white py-2 pr-4">Totaal</td>
                      <td className="text-right text-white py-2 px-2">{totalQty}</td>
                      <td className="text-right text-white py-2 px-2">{totalVakjes}</td>
                      {pricePerSlot > 0 && (
                        <td className="text-right text-green-400 py-2 pl-2">€{totalWaarde.toFixed(2)}</td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Geen bestellingen gevonden.</p>
          )}
        </>
      )}
    </div>
  );
}

/* -- Schermen Tab -- */
function SchermenTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [screens, setScreens] = useState<BarScreen[]>([]);
  const [categories, setCategories] = useState<(MenuCategory & { items: MenuItem[] })[]>([]);
  const [origin, setOrigin] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategoryIds, setNewCategoryIds] = useState<string[]>([]);
  const [newItemIds, setNewItemIds] = useState<string[]>([]);
  const [newCanMarkDone, setNewCanMarkDone] = useState(true);
  const [newHasDrankkaarten, setNewHasDrankkaarten] = useState(false);
  const [catLoading, setCatLoading] = useState(false);
  const [editingScreen, setEditingScreen] = useState<BarScreen | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) setSelectedEventId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEventId) { setScreens([]); return; }
    const unsub = onSnapshot(collection(db, 'events', selectedEventId, 'screens'), (snap) => {
      setScreens(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BarScreen)));
    });
    return () => unsub();
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) { setCategories([]); return; }
    setCatLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'events', selectedEventId, 'categories'), orderBy('order')),
      (snap) => {
        const catDocs = snap.docs;
        Promise.all(
          catDocs.map((catDoc) =>
            getDocs(query(collection(db, 'events', selectedEventId, 'categories', catDoc.id, 'items'), orderBy('order')))
          )
        ).then((itemsResults) => {
          setCategories(catDocs.map((catDoc, i) => ({
            id: catDoc.id,
            ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>),
            items: itemsResults[i].docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)),
          })));
          setCatLoading(false);
        });
      }
    );
    return () => unsub();
  }, [selectedEventId]);

  async function createScreen(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !selectedEventId) return;
    if (editingScreen) {
      await updateDoc(doc(db, 'events', selectedEventId, 'screens', editingScreen.id), {
        name: newName.trim(),
        categoryIds: newCategoryIds,
        itemIds: newItemIds,
        canMarkDone: newCanMarkDone,
        hasDrankkaarten: newHasDrankkaarten,
      });
      setEditingScreen(null);
    } else {
      await addDoc(collection(db, 'events', selectedEventId, 'screens'), {
        name: newName.trim(),
        categoryIds: newCategoryIds,
        itemIds: newItemIds,
        canMarkDone: newCanMarkDone,
        hasDrankkaarten: newHasDrankkaarten,
      });
    }
    setNewName('');
    setNewCategoryIds([]);
    setNewItemIds([]);
    setNewCanMarkDone(true);
    setNewHasDrankkaarten(false);
  }

  async function deleteScreen(screenId: string) {
    setConfirmModal({
      title: 'Scherm verwijderen',
      message: 'Weet je zeker dat je dit scherm wil verwijderen?',
      onConfirm: async () => { setConfirmModal(null); await deleteDoc(doc(db, 'events', selectedEventId, 'screens', screenId)); },
    });
  }

  function startEditScreen(screen: BarScreen) {
    setEditingScreen(screen);
    setNewName(screen.name);
    setNewCategoryIds([...screen.categoryIds]);
    setNewItemIds([...screen.itemIds]);
    setNewCanMarkDone(screen.canMarkDone !== false);
    setNewHasDrankkaarten(screen.hasDrankkaarten === true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditScreen() {
    setEditingScreen(null);
    setNewName('');
    setNewCategoryIds([]);
    setNewItemIds([]);
    setNewCanMarkDone(true);
    setNewHasDrankkaarten(false);
  }

  function toggleCategory(catId: string) {
    setNewCategoryIds((prev) => prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]);
    setNewItemIds((prev) => {
      const cat = categories.find((c) => c.id === catId);
      if (!cat) return prev;
      const catItemIds = cat.items.map((i) => i.id);
      return prev.filter((id) => !catItemIds.includes(id));
    });
  }

  function toggleItem(itemId: string) {
    setNewItemIds((prev) => prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]);
  }

  return (
    <div className="space-y-6">
      <div className={card}>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Evenement</label>
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className={inp + ' w-full max-w-xs'}>
          <option value="">Selecteer evenement...</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}{ev.active ? ' (Actief)' : ''}</option>)}
        </select>
      </div>

      {selectedEventId && (
        <>
          <div className={card}>
            <h2 className="text-base font-bold mb-4 text-white">{editingScreen ? `✏️ Scherm aanpassen: ${editingScreen.name}` : 'Nieuw scherm aanmaken'}</h2>
            <form onSubmit={createScreen} className="space-y-4">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Schemanaam (bv. Cocktails scherm)" className={inp + ' w-full'} />
              {catLoading ? <Spinner /> : (
                <div className="space-y-3">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Categorieën &amp; items</p>
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={newCategoryIds.includes(cat.id)} onChange={() => toggleCategory(cat.id)} className="rounded" />
                        <span className="font-semibold text-white">{cat.name}</span>
                        <span className="text-gray-400 text-xs">(alle items)</span>
                      </label>
                      {!newCategoryIds.includes(cat.id) && (
                        <div className="ml-6 space-y-1">
                          {cat.items.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={newItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} className="rounded" />
                              <span className="text-gray-300 text-sm">{item.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && <p className="text-gray-500 text-sm">Geen categorieën gevonden voor dit evenement.</p>}
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={!newName.trim()} className="bg-[var(--accent)] hover:brightness-90 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm">
                  {editingScreen ? 'Opslaan' : '+ Scherm aanmaken'}
                </button>
                {editingScreen && (
                  <button type="button" onClick={cancelEditScreen} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-6 rounded-lg transition-colors text-sm border border-gray-600">
                    Annuleren
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newCanMarkDone} onChange={(e) => setNewCanMarkDone(e.target.checked)} className="rounded" />
                  <span className="text-gray-300 text-sm">Kan bestellingen als klaar markeren</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newHasDrankkaarten} onChange={(e) => setNewHasDrankkaarten(e.target.checked)} className="rounded" />
                  <span className="text-gray-300 text-sm">🎫 Drankkaarten scherm (toont en beheert drankkaarten)</span>
                </label>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-white text-base">Bestaande schermen</h3>
            {screens.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nog geen schermen aangemaakt.</p>
            ) : (
              screens.map((screen) => (
                <div key={screen.id} className={card}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{screen.name}</p>
                      <p className="text-gray-400 text-xs font-mono mt-1 break-all">{origin}/bar/scherm/{screen.id}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${screen.canMarkDone !== false ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>
                          {screen.canMarkDone !== false ? '✓ Klaar-knop aan' : '✗ Klaar-knop uit'}
                        </span>
                        {screen.hasDrankkaarten && (
                          <span className="bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 text-xs px-2 py-0.5 rounded-full font-medium">🎫 Drankkaarten</span>
                        )}
                        {screen.categoryIds.map((catId) => {
                          const cat = categories.find((c) => c.id === catId);
                          return cat ? (
                            <span key={catId} className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2 py-0.5 rounded-full">{cat.name}</span>
                          ) : null;
                        })}
                        {screen.itemIds.map((itemId) => {
                          const item = categories.flatMap((c) => c.items).find((i) => i.id === itemId);
                          return item ? (
                            <span key={itemId} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full">{item.name}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEditScreen(screen)} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold py-1.5 px-3 rounded-lg text-sm transition-colors">
                        ✏️ Aanpassen
                      </button>
                      <a href={`${origin}/bar/scherm/${screen.id}`} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg text-sm transition-colors">
                        Openen →
                      </a>
                      <button onClick={() => deleteScreen(screen.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-1.5 px-3 rounded-lg text-sm transition-colors">
                        Verwijderen
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message}
        danger={true}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        dark={true}
      />
    </div>
  );
}
