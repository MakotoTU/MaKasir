import { Order, Product, OrderItem, User } from '../models';
import { eventEmitter, EVENTS } from '../services/event.service';
import { sequelize } from '../config/db';
import { Op } from 'sequelize';
import { waService } from '../services/whatsapp.service';

export class OrderController {
  static async createOrder(data: any) {
    const { items, cashierId, clientUuid, paymentMethod = 'cash', amountPaid } = data;

    // Idempotency check: jika clientUuid sudah ada di DB, langsung kembalikan data pesanan tersebut
    if (clientUuid) {
      const existingOrder = await Order.findOne({
        where: { clientUuid },
        include: [{ model: OrderItem, as: 'items' }, { model: User, as: 'cashier' }]
      });
      if (existingOrder) {
        console.log(`Duplicate order detected for clientUuid: ${clientUuid}. Returning existing order.`);
        return existingOrder;
      }
    }

    let totalPrice = 0;

    // Gunakan transaction untuk menjamin data integrity
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.create({
        totalPrice: 0,
        status: 'selesai',
        whatsappStatus: 'pending',
        cashierId,
        paymentMethod,
        ...(clientUuid ? { clientUuid } : {})
      }, { transaction });

      const orderItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        const itemTotal = product.price * item.qty;
        totalPrice += itemTotal;

        orderItems.push({
          orderId: order.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          qty: item.qty
        });
      }

      await OrderItem.bulkCreate(orderItems, { transaction });

      order.totalPrice = totalPrice;

      // Hitung kembalian untuk pembayaran tunai
      if (paymentMethod === 'cash') {
        if (amountPaid == null || amountPaid < totalPrice) {
          throw new Error(`Uang yang diterima tidak mencukupi total belanja (${totalPrice})`);
        }
        order.amountPaid = amountPaid;
        order.changeDue = amountPaid - totalPrice;
      }

      await order.save({ transaction });
      await transaction.commit();

      // Emit event ORDER_CREATED untuk notifikasi WA dan KDS
      const orderData = await Order.findByPk(order.id, {
        include: [{ model: OrderItem, as: 'items' }, { model: User, as: 'cashier' }]
      });
      eventEmitter.emit(EVENTS.ORDER_CREATED, orderData);

      return orderData;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async getHistory() {
    return await Order.findAll({
      include: [{ model: User, as: 'cashier', attributes: ['username'] }],
      order: [['createdAt', 'DESC']]
    });
  }

  static async getById(id: string) {
    return await Order.findByPk(id, {
      include: [{ model: User, as: 'cashier', attributes: ['username'] }, { model: OrderItem, as: 'items' }]
    });
  }

  static async getSummary(date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        status: 'selesai'
      },
      include: [{ model: OrderItem, as: 'items' }]
    });

    let totalRevenue = 0;
    let cashTotal = 0;
    let qrisTotal = 0;
    const itemsSold: Record<string, { name: string, qty: number, revenue: number }> = {};

    orders.forEach(order => {
      totalRevenue += order.totalPrice;
      if (order.paymentMethod === 'cash') cashTotal += order.totalPrice;
      if (order.paymentMethod === 'qris') qrisTotal += order.totalPrice;

      if (order.items) {
        order.items.forEach(item => {
          if (!itemsSold[item.productId]) {
            itemsSold[item.productId] = { name: item.name, qty: 0, revenue: 0 };
          }
          itemsSold[item.productId].qty += item.qty;
          itemsSold[item.productId].revenue += (item.price * item.qty);
        });
      }
    });

    const products = Object.values(itemsSold).sort((a, b) => b.qty - a.qty);

    return {
      date,
      totalOrders: orders.length,
      totalRevenue,
      cashTotal,
      qrisTotal,
      products
    };
  }

  static async sendCsvWA(date: string) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        },
        status: 'selesai'
      },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'ASC']]
    });

    if (orders.length === 0) {
      throw new Error(`Tidak ada transaksi pada tanggal ${date}`);
    }

    const headers = ['Waktu', 'ID Pesanan', 'Total Belanja', 'Metode Pembayaran', 'Uang Diterima', 'Kembalian', 'Item Terjual'];
    const rows = orders.map(order => {
      const waktu = new Date(order.createdAt).toLocaleString('id-ID').replace(/,/g, '');
      const itemNames = (order.items || []).map((i: any) => `${i.name}(${i.qty})`).join(' | ');
      return [
        waktu,
        order.id,
        order.totalPrice,
        order.paymentMethod,
        order.amountPaid ?? 0,
        order.changeDue ?? 0,
        `"${itemNames}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    const myJid = waService.getMyJid();
    if (!myJid) {
      throw new Error('Sesi WhatsApp belum terhubung');
    }

    const caption = `Halo Kasir! Ini adalah rekapitulasi penjualan warung secara rinci untuk tanggal ${date}. File terlampir.`;
    const success = await waService.sendDocument(myJid, buffer, `Rekap_Penjualan_${date}.csv`, caption);

    if (!success) {
      throw new Error('Gagal mengirim dokumen melalui WhatsApp');
    }
    
    return { success: true, message: 'Berhasil mengirim rekap CSV ke WA' };
  }
}
