import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import { eventEmitter, EVENTS } from './event.service';

export class WhatsAppService {
  private sock: any;
  private qrDataURL: string | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.init();
    this.setupEventListeners();
  }

  async init() {
    const { state, saveCreds } = await useMultiFileAuthState('./wa_session');

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true, // kita tetap tampilkan di terminal untuk debugging backup
    });

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrDataURL = await QRCode.toDataURL(qr);
      }

      if (connection === 'close') {
        this.isConnected = false;
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('WhatsApp connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
        if (shouldReconnect) {
          this.init();
        } else {
          console.log('You are logged out from WhatsApp. Please delete wa_session folder and restart.');
        }
      } else if (connection === 'open') {
        this.isConnected = true;
        this.qrDataURL = null; // Clear QR code karena sudah connect
        console.log('WhatsApp connected successfully!');
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
  }

  public getQR() {
    if (this.isConnected) {
      return { status: 'connected' };
    }
    if (this.qrDataURL) {
      return { status: 'waiting_for_scan', qr: this.qrDataURL };
    }
    return { status: 'initializing' };
  }

  public async logout() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (err) {
        console.error('Error during Baileys logout:', err);
      }
      try {
        this.sock.end(undefined);
      } catch (err) {
        // Ignored
      }
      this.sock = null;
    }
    // Hapus folder session agar QR fresh saat reconnect
    await fs.rm('./wa_session', { recursive: true, force: true });
    this.isConnected = false;
    this.qrDataURL = null;
    
    // Mulai inisialisasi ulang socket baru untuk menunggu scan QR baru
    this.init();
  }

  public async sendMessage(to: string, text: string) {
    if (!this.isConnected) {
      console.error('WhatsApp is not connected. Cannot send message to:', to);
      return false;
    }
    try {
      // Pastikan format nomor yang valid (e.g. 628...)
      const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text });
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  private setupEventListeners() {
    // Dengarkan event order_created dari module order
    eventEmitter.on(EVENTS.ORDER_CREATED, async (order: any) => {
      try {
        const formatRupiah = (angka: number) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
          }).format(angka);
        };

        const itemsList = order.items.map((item: any) => `- ${item.name} (${item.qty}x) = ${formatRupiah(item.price * item.qty)}`).join('\n');
        
        // Baris pembayaran
        let paymentInfo = `Metode: ${order.paymentMethod === 'qris' ? 'QRIS' : 'Tunai'}`;
        if (order.paymentMethod === 'cash' && order.amountPaid != null) {
          paymentInfo += `\nUang Diterima: ${formatRupiah(order.amountPaid)}`;
          paymentInfo += `\nKembalian: ${formatRupiah(order.changeDue ?? 0)}`;
        }

        const message = `Halo Kasir! Pesanan Baru Masuk.\n\n` +
                        `Berikut rincian pesanan pelanggan:\n` +
                        `${itemsList}\n\n` +
                        `Total: ${formatRupiah(order.totalPrice)}\n` +
                        `${paymentInfo}\n\n` +
                        `Waktu: ${new Date().toLocaleString()}`;

        // Kirim ke nomor WA yang terhubung (dirinya sendiri)
        const myJid = this.sock?.user?.id;
        if (!myJid) throw new Error("WA session not active");
        
        // Membersihkan JID (hilangkan :device_id jika ada)
        const targetJid = myJid.split(':')[0] + '@s.whatsapp.net';

        console.log(`Mengirim notifikasi WhatsApp ke akun kasir (${targetJid})...`);
        const success = await this.sendMessage(targetJid, message);
        
        // Update order status di database berdasarkan hasil pengiriman
        if (success) {
          order.whatsappStatus = 'sent';
        } else {
          order.whatsappStatus = 'failed';
        }
        await order.save();
        console.log(`WhatsApp notification for order #${order.id} handled. Status: ${order.whatsappStatus}`);
      } catch (e) {
        console.error('Failed to process ORDER_CREATED event in WhatsAppService:', e);
      }
    });

    // Dengarkan event STOCK_LOW untuk notifikasi stok menipis
    eventEmitter.on(EVENTS.STOCK_LOW, async (product: any) => {
      try {
        if (!this.isConnected || !this.sock?.user?.id) return;

        const formatRupiah = (angka: number) =>
          new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

        const message = `⚠️ *Peringatan Stok Menipis!*\n\n` +
                        `Produk: *${product.name}*\n` +
                        `Harga: ${formatRupiah(product.price)}\n` +
                        `Stok Saat Ini: *${product.stock} pcs*\n` +
                        `Minimum Stok: ${product.minimumStock} pcs\n\n` +
                        `Segera lakukan restok sebelum kehabisan!`;

        const myJid = this.sock.user.id;
        const targetJid = myJid.split(':')[0] + '@s.whatsapp.net';
        await this.sendMessage(targetJid, message);
        console.log(`⚠️ Notifikasi stok menipis terkirim untuk produk: ${product.name}`);
      } catch (e) {
        console.error('Failed to process STOCK_LOW event in WhatsAppService:', e);
      }
    });
  }
}

// Singleton instance agar hanya ada 1 session berjalan
export const waService = new WhatsAppService();
