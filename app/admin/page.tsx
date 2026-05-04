'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  query, orderBy, where, writeBatch, Timestamp,
} from 'firebase/firestore';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { db } from '@/lib/firebase';
import { Event, MenuCategory, MenuItem, Table, Order } from '@/lib/types';
import { checkAdminAuth, loginAdmin, logoutAdmin } from '@/lib/auth';

type Tab = 'evenementen' | 'menu' | 'tafels' | 'bestellingen';

/* ── Dark input / card classes ── */
const inp = 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 text-sm';
const card = 'bg-gray-800 border border-gray-700 rounded-xl p-4';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('evenementen');

  useEffect(() => { if (checkAdminAuth()) setAuthed(true); }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginAdmin(password)) { setAuthed(true); setLoginError(''); }
    else setLoginError('Ongeldig wachtwoord.');
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">⚙️ Admin</h1>
        <p className="text-gray-400 text-center mb-6">Beheerpaneel voor KSA Bestelapp</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin wachtwoord" className={inp + ' w-full'} autoFocus />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors">Inloggen</button>
        </form>
      </div>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'evenementen', label: '📅 Evenementen' },
    { key: 'menu', label: '🍺 Menu' },
    { key: 'tafels', label: '🪑 Tafels' },
    { key: 'bestellingen', label: '📋 Bestellingen' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">⚙️ KSA Admin</h1>
          <button onClick={() => { logoutAdmin(); setAuthed(false); }} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
            Afmelden
          </button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-4 rounded-lg font-semibold transition-colors text-sm ${activeTab === tab.key ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'evenementen' && <EvenementenTab />}
        {activeTab === 'menu' && <MenuTab />}
        {activeTab === 'tafels' && <TafelsTab />}
        {activeTab === 'bestellingen' && <BestellingenTab />}
      </div>
    </div>
  );
}

/* ── Evenementen Tab ── */
function EvenementenTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newPricePerSlot, setNewPricePerSlot] = useState('');
  const [newAccent, setNewAccent] = useState('#16a34a');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const snap = await getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc')));
    setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
    setLoading(false);
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newStart || !newEnd) return;
    await addDoc(collection(db, 'events'), {
      name: newName.trim(),
      startDate: newStart,
      endDate: newEnd,
      active: false,
      showPrices: true,
      pricePerSlot: parseFloat(newPricePerSlot) || 0,
      accentColor: newAccent,
    });
    setNewName(''); setNewStart(''); setNewEnd(''); setNewPricePerSlot(''); setNewAccent('#16a34a');
    load();
  }

  async function activateEvent(id: string) {
    const batch = writeBatch(db);
    events.forEach((ev) => batch.update(doc(db, 'events', ev.id), { active: ev.id === id }));
    await batch.commit();
    load();
  }

  async function deactivateEvent(id: string) {
    await updateDoc(doc(db, 'events', id), { active: false });
    load();
  }

  async function deleteEvent(id: string) {
    if (!confirm('Zeker? Dit verwijdert het evenement.')) return;
    await deleteDoc(doc(db, 'events', id));
    load();
  }

  async function updateEventField(ev: Event, field: Partial<Event>) {
    await updateDoc(doc(db, 'events', ev.id), field as any);
    load();
  }

  if (loading) return <Spinner />;

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
          <button type="submit" className="sm:col-span-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Aanmaken
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
                  <p className="text-gray-400 text-sm">€{(ev.pricePerSlot || 0).toFixed(2)} per vakje</p>
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
                  <button onClick={() => activateEvent(ev.id)} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
                    Activeren
                  </button>
                )}
                <button onClick={() => deleteEvent(ev.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
                  Verwijderen
                </button>
              </div>
            </div>
            {/* Inline edit accentcolor & pricePerSlot */}
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
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-gray-500 text-center py-8">Nog geen evenementen aangemaakt.</p>}
      </div>
    </div>
  );
}

/* ── Menu Tab ── */
function MenuTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<(MenuCategory & { items: MenuItem[] })[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newItems, setNewItems] = useState<Record<string, { name: string; slots: string; available: boolean }>>({});
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
    if (selectedEventId) {
      const ev = events.find((e) => e.id === selectedEventId);
      setSelectedEvent(ev || null);
      loadMenu();
    }
  }, [selectedEventId]);

  async function loadMenu() {
    setLoading(true);
    const catsSnap = await getDocs(query(collection(db, 'events', selectedEventId, 'categories'), orderBy('order')));
    const cats: (MenuCategory & { items: MenuItem[] })[] = [];
    for (const catDoc of catsSnap.docs) {
      const itemsSnap = await getDocs(query(collection(db, 'events', selectedEventId, 'categories', catDoc.id, 'items'), orderBy('order')));
      cats.push({ id: catDoc.id, ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>), items: itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)) });
    }
    setCategories(cats);
    setLoading(false);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim() || !selectedEventId) return;
    await addDoc(collection(db, 'events', selectedEventId, 'categories'), { name: newCatName.trim(), order: categories.length });
    setNewCatName('');
    loadMenu();
  }

  async function deleteCategory(catId: string) {
    if (!confirm('Categorie verwijderen?')) return;
    await deleteDoc(doc(db, 'events', selectedEventId, 'categories', catId));
    loadMenu();
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
    loadMenu();
  }

  async function toggleItemAvailable(catId: string, item: MenuItem) {
    await updateDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), { available: !item.available });
    loadMenu();
  }

  async function deleteItem(catId: string, itemId: string) {
    await deleteDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', itemId));
    loadMenu();
  }

  async function updateItem(catId: string, item: MenuItem, name: string, slots: string) {
    await updateDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), { name: name.trim(), slots: parseInt(slots) || 1 });
    loadMenu();
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
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">Toevoegen</button>
            </form>
          </div>

          {loading ? <Spinner /> : (
            <div className="space-y-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id} cat={cat}
                  pricePerSlot={selectedEvent?.pricePerSlot || 0}
                  newItem={newItems[cat.id] || { name: '', slots: '', available: true }}
                  onNewItemChange={(field, value) => setNewItems((prev) => ({ ...prev, [cat.id]: { ...(prev[cat.id] || { name: '', slots: '', available: true }), [field]: value } }))}
                  onAddItem={() => addItem(cat.id)}
                  onDeleteCategory={() => deleteCategory(cat.id)}
                  onToggleAvailable={(item) => toggleItemAvailable(cat.id, item)}
                  onDeleteItem={(itemId) => deleteItem(cat.id, itemId)}
                  onUpdateItem={(item, name, slots) => updateItem(cat.id, item, name, slots)}
                />
              ))}
              {categories.length === 0 && <p className="text-gray-500 text-center py-8">Nog geen categorieën.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryCard({ cat, pricePerSlot, newItem, onNewItemChange, onAddItem, onDeleteCategory, onToggleAvailable, onDeleteItem, onUpdateItem }: {
  cat: MenuCategory & { items: MenuItem[] };
  pricePerSlot: number;
  newItem: { name: string; slots: string; available: boolean };
  onNewItemChange: (field: string, value: any) => void;
  onAddItem: () => void;
  onDeleteCategory: () => void;
  onToggleAvailable: (item: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (item: MenuItem, name: string, slots: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, { name: string; slots: string }>>({});

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-750 border-b border-gray-700">
        <button onClick={() => setExpanded(!expanded)} className="font-bold text-white text-base flex items-center gap-2">
          {expanded ? '▾' : '▸'} {cat.name}
          <span className="text-sm font-normal text-gray-500">({cat.items.length} items)</span>
        </button>
        <button onClick={onDeleteCategory} className="text-red-400 hover:text-red-300 text-sm font-semibold">Verwijderen</button>
      </div>

      {expanded && (
        <div className="p-4 space-y-2">
          {cat.items.map((item) => {
            const ev = editValues[item.id] || { name: item.name, slots: String(item.slots || 1) };
            const price = (parseInt(ev.slots) || 0) * pricePerSlot;
            return (
              <div key={item.id} className="flex flex-wrap gap-2 items-center bg-gray-700/50 rounded-lg p-3">
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
                <button onClick={() => onDeleteItem(item.id)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
              </div>
            );
          })}
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
            <button onClick={onAddItem} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
              + Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tafels Tab ── */
function TafelsTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [origin, setOrigin] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) setSelectedEventId(active.id);
    });
  }, []);

  useEffect(() => { if (selectedEventId) loadTables(); }, [selectedEventId]);

  async function loadTables() {
    const snap = await getDocs(collection(db, 'events', selectedEventId, 'tables'));
    setTables(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Table)));
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTableName.trim() || !selectedEventId) return;
    await addDoc(collection(db, 'events', selectedEventId, 'tables'), { name: newTableName.trim() });
    setNewTableName('');
    loadTables();
  }

  async function deleteTable(tableId: string) {
    if (!confirm('Tafel verwijderen?')) return;
    await deleteDoc(doc(db, 'events', selectedEventId, 'tables', tableId));
    loadTables();
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
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">Toevoegen</button>
            </form>
          </div>

          {tables.length > 0 && (
            <button onClick={downloadAllQRCodes} disabled={downloading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm flex items-center gap-2">
              {downloading ? '⏳ Bezig...' : '⬇️ Alle QR codes downloaden (ZIP)'}
            </button>
          )}

          {/* Hidden canvases for download */}
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
                  <h3 className="font-bold text-xl text-white mb-3">Tafel {table.name}</h3>
                  <div className="flex justify-center mb-3 bg-white p-3 rounded-lg inline-block mx-auto">
                    <QRCodeSVG value={url} size={160} />
                  </div>
                  <p className="text-xs text-gray-500 mb-4 break-all font-mono">{url}</p>
                  <div className="flex gap-2 justify-center">
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
    </div>
  );
}

/* ── Bestellingen Tab ── */
function BestellingenTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'alle' | 'besteld' | 'klaar'>('alle');

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('startDate', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) { setSelectedEventId(active.id); setSelectedEvent(active); }
    });
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find((e) => e.id === selectedEventId);
      setSelectedEvent(ev || null);
      loadOrders();
    }
  }, [selectedEventId]);

  async function loadOrders() {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'events', selectedEventId, 'orders'), orderBy('createdAt', 'desc')));
    setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    setLoading(false);
  }

  function fmt(t: any): string {
    if (!t) return '';
    try { return (t instanceof Timestamp ? t.toDate() : new Date(t)).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  const filtered = orders.filter((o) => filter === 'alle' || o.status === filter);

  // Per-item summary
  const itemSummary: Record<string, { name: string; qty: number; vakjes: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      if (!itemSummary[item.name]) itemSummary[item.name] = { name: item.name, qty: 0, vakjes: 0 };
      itemSummary[item.name].qty += item.quantity;
      itemSummary[item.name].vakjes += (item.slots || 0) * item.quantity;
    }
  }
  const summaryItems = Object.values(itemSummary).sort((a, b) => b.qty - a.qty);

  const totalDrankkaarten = orders.reduce((s, o) => s + (o.drankkaarten || 0), 0);
  const totalVakjes = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + (i.slots || 0) * i.quantity, 0), 0);
  const totalWaarde = totalVakjes * (selectedEvent?.pricePerSlot || 0);

  return (
    <div className="space-y-6">
      <div className={card}>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Evenement</label>
        <div className="flex flex-wrap gap-3 items-end">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className={inp + ' flex-1 max-w-xs'}>
            <option value="">Selecteer evenement...</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}{ev.active ? ' (Actief)' : ''}</option>)}
          </select>
          {selectedEventId && <button onClick={loadOrders} className="bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 px-4 rounded-lg text-sm transition-colors">↻ Vernieuwen</button>}
        </div>
      </div>

      {selectedEventId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Bestellingen" value={String(orders.length)} />
            <StatCard label="Drankkaarten" value={String(totalDrankkaarten)} />
            <StatCard label="Totaal vakjes" value={String(totalVakjes)} />
            <StatCard label="Totale waarde" value={`€${totalWaarde.toFixed(2)}`} />
          </div>

          {/* Per-item summary */}
          {summaryItems.length > 0 && (
            <div className={card}>
              <h3 className="font-bold text-white mb-3">📊 Samenvatting per item</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 py-2 pr-4">Item</th>
                      <th className="text-right text-gray-400 py-2 px-2">Aantal</th>
                      <th className="text-right text-gray-400 py-2 px-2">Vakjes</th>
                      {(selectedEvent?.pricePerSlot || 0) > 0 && <th className="text-right text-gray-400 py-2 pl-2">Waarde</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryItems.map((item) => (
                      <tr key={item.name} className="border-b border-gray-700/50">
                        <td className="text-white py-2 pr-4">{item.name}</td>
                        <td className="text-right text-gray-300 py-2 px-2 font-semibold">{item.qty}×</td>
                        <td className="text-right text-gray-400 py-2 px-2">{item.vakjes}</td>
                        {(selectedEvent?.pricePerSlot || 0) > 0 && (
                          <td className="text-right text-green-400 py-2 pl-2">€{(item.vakjes * (selectedEvent?.pricePerSlot || 0)).toFixed(2)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2">
            {(['alle', 'besteld', 'klaar'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`py-1.5 px-4 rounded-lg text-sm font-semibold transition-colors capitalize ${filter === f ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'}`}>
                {f === 'alle' ? 'Alle' : f === 'besteld' ? 'Besteld' : 'Klaar'}
              </button>
            ))}
          </div>

          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {filtered.map((order) => (
                <div key={order.id} className={card}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-white text-lg">{order.tableName}</p>
                      <p className="text-gray-500 text-sm">{fmt(order.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === 'besteld' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                      {order.status === 'besteld' ? 'Besteld' : 'Klaar'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-300"><span className="font-bold text-white">{item.quantity}×</span> {item.name}</span>
                        <span className="text-gray-500">{(item.slots || 0) * item.quantity} vakjes{(selectedEvent?.pricePerSlot || 0) > 0 ? ` · €${((item.slots || 0) * item.quantity * (selectedEvent?.pricePerSlot || 0)).toFixed(2)}` : ''}</span>
                      </div>
                    ))}
                    {order.drankkaarten > 0 && (
                      <p className="text-yellow-400 text-sm">🎫 {order.drankkaarten} drankkaart{order.drankkaarten !== 1 ? 'en' : ''}</p>
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
    </div>
  );
}
