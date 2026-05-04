'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@/lib/firebase';
import { Event, MenuCategory, MenuItem, Table, Order } from '@/lib/types';
import { checkAdminAuth, loginAdmin, logoutAdmin } from '@/lib/auth';

type Tab = 'evenementen' | 'menu' | 'tafels' | 'bestellingen';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('evenementen');

  useEffect(() => {
    if (checkAdminAuth()) setAuthed(true);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginAdmin(password)) {
      setAuthed(true);
    } else {
      setLoginError('Ongeldig wachtwoord.');
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-green-800 mb-2 text-center">⚙️ Admin</h1>
          <p className="text-gray-500 text-center mb-6">Beheerpaneel voor KSA Bestelapp</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin wachtwoord"
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'evenementen', label: '📅 Evenementen' },
    { key: 'menu', label: '🍺 Menu' },
    { key: 'tafels', label: '🪑 Tafels' },
    { key: 'bestellingen', label: '📋 Bestellingen' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white px-4 py-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">⚙️ KSA Admin</h1>
          <button
            onClick={() => { logoutAdmin(); setAuthed(false); }}
            className="bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Afmelden
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-4 rounded-lg font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
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
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const snap = await getDocs(query(collection(db, 'events'), orderBy('date', 'desc')));
    setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
    setLoading(false);
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newDate) return;
    await addDoc(collection(db, 'events'), {
      name: newName.trim(),
      date: newDate,
      active: false,
      showPrices: true,
    });
    setNewName(''); setNewDate('');
    loadEvents();
  }

  async function activateEvent(id: string) {
    const batch = writeBatch(db);
    events.forEach((ev) => {
      batch.update(doc(db, 'events', ev.id), { active: ev.id === id });
    });
    await batch.commit();
    loadEvents();
  }

  async function deleteEvent(id: string) {
    if (!confirm('Zeker? Dit verwijdert het evenement.')) return;
    await deleteDoc(doc(db, 'events', id));
    loadEvents();
  }

  async function toggleShowPrices(ev: Event) {
    await updateDoc(doc(db, 'events', ev.id), { showPrices: !ev.showPrices });
    loadEvents();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Nieuw evenement</h2>
        <form onSubmit={createEvent} className="flex flex-wrap gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Naam evenement"
            className="border border-gray-300 rounded-lg px-4 py-2 flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Aanmaken
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-800 text-lg">{ev.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ev.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {ev.active ? 'Actief' : 'Inactief'}
                </span>
              </div>
              <p className="text-gray-500 text-sm">{ev.date}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ev.showPrices}
                  onChange={() => toggleShowPrices(ev)}
                  className="rounded"
                />
                Prijzen tonen
              </label>
              {!ev.active && (
                <button
                  onClick={() => activateEvent(ev.id)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors"
                >
                  Activeren
                </button>
              )}
              <button
                onClick={() => deleteEvent(ev.id)}
                className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-gray-400 text-center py-8">Nog geen evenementen aangemaakt.</p>}
      </div>
    </div>
  );
}

/* ── Menu Tab ── */
function MenuTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [categories, setCategories] = useState<(MenuCategory & { items: MenuItem[] })[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newItems, setNewItems] = useState<Record<string, { name: string; price: string; available: boolean }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('date', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) setSelectedEventId(active.id);
    });
  }, []);

  useEffect(() => {
    if (selectedEventId) loadMenu();
  }, [selectedEventId]);

  async function loadMenu() {
    setLoading(true);
    const catsSnap = await getDocs(query(collection(db, 'events', selectedEventId, 'categories'), orderBy('order')));
    const cats: (MenuCategory & { items: MenuItem[] })[] = [];
    for (const catDoc of catsSnap.docs) {
      const itemsSnap = await getDocs(query(collection(db, 'events', selectedEventId, 'categories', catDoc.id, 'items'), orderBy('order')));
      cats.push({
        id: catDoc.id,
        ...(catDoc.data() as Omit<MenuCategory, 'id' | 'items'>),
        items: itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)),
      });
    }
    setCategories(cats);
    setLoading(false);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim() || !selectedEventId) return;
    await addDoc(collection(db, 'events', selectedEventId, 'categories'), {
      name: newCatName.trim(),
      order: categories.length,
    });
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
      price: parseFloat(item.price) || 0,
      available: item.available ?? true,
      order: cat.items.length,
    });
    setNewItems((prev) => ({ ...prev, [catId]: { name: '', price: '', available: true } }));
    loadMenu();
  }

  async function toggleItemAvailable(catId: string, item: MenuItem) {
    await updateDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), {
      available: !item.available,
    });
    loadMenu();
  }

  async function deleteItem(catId: string, itemId: string) {
    await deleteDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', itemId));
    loadMenu();
  }

  async function updateItem(catId: string, item: MenuItem, name: string, price: string) {
    await updateDoc(doc(db, 'events', selectedEventId, 'categories', catId, 'items', item.id), {
      name: name.trim(),
      price: parseFloat(price) || 0,
    });
    loadMenu();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Evenement</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Selecteer evenement...</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      {selectedEventId && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Categorie toevoegen</h2>
            <form onSubmit={addCategory} className="flex gap-3">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Naam categorie"
                className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                Toevoegen
              </button>
            </form>
          </div>

          {loading ? <Spinner /> : (
            <div className="space-y-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  newItem={newItems[cat.id] || { name: '', price: '', available: true }}
                  onNewItemChange={(field, value) =>
                    setNewItems((prev) => ({ ...prev, [cat.id]: { ...(prev[cat.id] || { name: '', price: '', available: true }), [field]: value } }))
                  }
                  onAddItem={() => addItem(cat.id)}
                  onDeleteCategory={() => deleteCategory(cat.id)}
                  onToggleAvailable={(item) => toggleItemAvailable(cat.id, item)}
                  onDeleteItem={(itemId) => deleteItem(cat.id, itemId)}
                  onUpdateItem={(item, name, price) => updateItem(cat.id, item, name, price)}
                />
              ))}
              {categories.length === 0 && <p className="text-gray-400 text-center py-8">Nog geen categorieën. Voeg er een toe hierboven.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryCard({ cat, newItem, onNewItemChange, onAddItem, onDeleteCategory, onToggleAvailable, onDeleteItem, onUpdateItem }: {
  cat: MenuCategory & { items: MenuItem[] };
  newItem: { name: string; price: string; available: boolean };
  onNewItemChange: (field: string, value: any) => void;
  onAddItem: () => void;
  onDeleteCategory: () => void;
  onToggleAvailable: (item: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (item: MenuItem, name: string, price: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, { name: string; price: string }>>({});

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <button onClick={() => setExpanded(!expanded)} className="font-bold text-gray-800 text-lg flex items-center gap-2">
          {expanded ? '▾' : '▸'} {cat.name}
          <span className="text-sm font-normal text-gray-500">({cat.items.length} items)</span>
        </button>
        <button onClick={onDeleteCategory} className="text-red-600 hover:text-red-800 text-sm font-semibold">
          Verwijderen
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {cat.items.map((item) => {
            const ev = editValues[item.id] || { name: item.name, price: String(item.price) };
            return (
              <div key={item.id} className="flex flex-wrap gap-2 items-center border border-gray-100 rounded-lg p-3">
                <input
                  value={ev.name}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...ev, name: e.target.value } }))}
                  onBlur={() => onUpdateItem(item, ev.name, ev.price)}
                  className="border border-gray-200 rounded px-3 py-1.5 flex-1 min-w-32 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={ev.price}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...ev, price: e.target.value } }))}
                    onBlur={() => onUpdateItem(item, ev.name, ev.price)}
                    className="border border-gray-200 rounded px-3 py-1.5 w-24 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={item.available} onChange={() => onToggleAvailable(item)} className="rounded" />
                  Beschikbaar
                </label>
                <button onClick={() => onDeleteItem(item.id)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
              </div>
            );
          })}

          {/* Add item form */}
          <div className="flex flex-wrap gap-2 items-center border-t pt-3 mt-2">
            <input
              value={newItem.name}
              onChange={(e) => onNewItemChange('name', e.target.value)}
              placeholder="Naam item"
              className="border border-gray-300 rounded px-3 py-1.5 flex-1 min-w-32 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">€</span>
              <input
                type="number"
                step="0.01"
                value={newItem.price}
                onChange={(e) => onNewItemChange('price', e.target.value)}
                placeholder="Prijs"
                className="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={newItem.available} onChange={(e) => onNewItemChange('available', e.target.checked)} className="rounded" />
              Beschikbaar
            </label>
            <button
              onClick={onAddItem}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors"
            >
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

  useEffect(() => {
    setOrigin(window.location.origin);
    getDocs(query(collection(db, 'events'), orderBy('date', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) setSelectedEventId(active.id);
    });
  }, []);

  useEffect(() => {
    if (selectedEventId) loadTables();
  }, [selectedEventId]);

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

  function printTable(table: Table) {
    const url = `${origin}/tafel/${table.id}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${table.name}</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            h1 { font-size: 3rem; margin-bottom: 1rem; }
            p { font-size: 1rem; color: #555; margin-top: 1rem; }
            svg { width: 300px; height: 300px; }
          </style>
        </head>
        <body>
          <h1>Tafel ${table.name}</h1>
          <div id="qr"></div>
          <p>${url}</p>
          <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.getElementById('qr'), '${url}', { width: 300 }, function(){
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Evenement</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Selecteer evenement...</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      {selectedEventId && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Tafel toevoegen</h2>
            <form onSubmit={addTable} className="flex gap-3">
              <input
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Tafelnaam of -nummer"
                className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                Toevoegen
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => {
              const url = `${origin}/tafel/${table.id}`;
              return (
                <div key={table.id} className="bg-white rounded-xl shadow-sm p-4 text-center">
                  <h3 className="font-bold text-xl text-gray-800 mb-3">Tafel {table.name}</h3>
                  <div className="flex justify-center mb-3">
                    <QRCodeSVG value={url} size={160} />
                  </div>
                  <p className="text-xs text-gray-400 mb-4 break-all">{url}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => printTable(table)}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                      🖨️ Afdrukken
                    </button>
                    <button
                      onClick={() => deleteTable(table.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              );
            })}
            {tables.length === 0 && (
              <p className="text-gray-400 text-center py-8 col-span-3">Nog geen tafels toegevoegd.</p>
            )}
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('date', 'desc'))).then((snap) => {
      const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(evs);
      const active = evs.find((e) => e.active);
      if (active) setSelectedEventId(active.id);
    });
  }, []);

  useEffect(() => {
    if (selectedEventId) loadOrders();
  }, [selectedEventId]);

  async function loadOrders() {
    setLoading(true);
    const snap = await getDocs(query(
      collection(db, 'events', selectedEventId, 'orders'),
      orderBy('createdAt', 'desc')
    ));
    setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    setLoading(false);
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

  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  const totalDrankkaarten = orders.reduce((sum, o) => sum + (o.drankkaarten || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Evenement</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Selecteer evenement...</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      {selectedEventId && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Bestellingen" value={totalOrders} />
            <StatCard label="Items besteld" value={totalItems} />
            <StatCard label="Drankkaarten" value={totalDrankkaarten} />
          </div>

          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{order.tableName}</p>
                      <p className="text-gray-500 text-sm">{formatTime(order.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      order.status === 'besteld' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {order.status === 'besteld' ? 'Besteld' : 'Klaar'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <p key={i} className="text-gray-700 text-sm">{item.quantity}× {item.name} — €{(item.price * item.quantity).toFixed(2)}</p>
                    ))}
                    {order.drankkaarten > 0 && (
                      <p className="text-gray-700 text-sm">🎫 {order.drankkaarten} drankkaarten</p>
                    )}
                    {order.note && (
                      <p className="text-gray-500 text-sm mt-1">💬 {order.note}</p>
                    )}
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-gray-400 text-center py-8">Geen bestellingen voor dit evenement.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
      <p className="text-3xl font-bold text-green-700">{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  );
}
