import Dexie, { type Table } from 'dexie';

// --- Interface Definitions ---

export interface LocalProduct {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface LocalOrderItem {
  productId: number;
  qty: number;
}

export interface LocalOrder {
  id?: number;          // Auto-increment primary key (IndexedDB)
  clientUuid: string;  // Idempotency key - UUID v4 unik per transaksi
  cashierId: number;
  items: LocalOrderItem[];
  createdAt: Date;
}

// --- Dexie Database Class ---

class MaKasirLocalDB extends Dexie {
  products!: Table<LocalProduct>;
  offline_orders!: Table<LocalOrder>;

  constructor() {
    super('MaKasirLocalDB');
    this.version(1).stores({
      // products: key adalah 'id' (dari server), bukan auto-increment
      products: 'id, name, category',
      // offline_orders: key adalah auto-increment, dengan index pada clientUuid
      offline_orders: '++id, clientUuid, createdAt'
    });
  }
}

export const db = new MaKasirLocalDB();
