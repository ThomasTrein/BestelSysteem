export interface OptionChoice {
  id: string;
  name: string;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: 'single' | 'multi'; // single = radio buttons, multi = checkboxes
  required: boolean;
  choices: OptionChoice[];
}

export interface SelectedOption {
  groupId: string;
  groupName: string;
  type: 'single' | 'multi';
  selected: string[]; // choice names
}

export interface MenuItem {
  id: string;
  name: string;
  slots: number; // aantal vakjes
  available: boolean;
  order: number;
  optionGroups?: OptionGroup[];
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
  slots: number;
  price: number; // slots * pricePerSlot op moment van bestelling
  categoryName: string;
  selectedOptions?: SelectedOption[];
}

export interface Order {
  id: string;
  tableId: string;
  tableName: string;
  customerName?: string;
  items: OrderItem[];
  drankkaarten: number;
  note: string;
  status: 'besteld' | 'klaar';
  createdAt: any;
}

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  showPrices: boolean;
  pricePerSlot: number;
  accentColor: string;
  drankkaartSlots: number; // kept for legacy, use drankkaartPrice if set
  drankkaartPrice?: number; // fixed euro price per drankkaart (replaces slots calculation)
  qrLabel?: string;// label printed under QR codes
}

export interface BarScreen {
  id: string;
  name: string;
  categoryIds: string[]; // show all items from these categories
  itemIds: string[];     // show only specific items (by itemId) — empty = show full category
}
