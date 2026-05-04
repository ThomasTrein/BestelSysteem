export interface MenuItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
  order: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
}

export interface Table {
  id: string;
  name: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tableId: string;
  tableName: string;
  items: OrderItem[];
  drankkaarten: number;
  note: string;
  status: 'besteld' | 'klaar';
  createdAt: any;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  active: boolean;
  showPrices: boolean;
}
