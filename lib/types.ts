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
}
