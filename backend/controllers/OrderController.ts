import { Order, Product, OrderItem, User } from '../models';
import { eventEmitter, EVENTS } from '../services/event.service';
import { sequelize } from '../config/db';
import { Op } from 'sequelize';

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
    const affectedProducts: Product[] = [];

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

        // Atomic decrement stok — mencegah race condition
        const [rowsUpdated] = await Product.update(
          { stock: sequelize.literal(`stock - ${item.qty}`) },
          {
            where: {
              id: product.id,
              stock: { [Op.gte]: item.qty }
            },
            transaction
          }
        );

        if (rowsUpdated === 0) {
          throw new Error(`Stok produk "${product.name}" tidak mencukupi. Sisa stok: ${product.stock}`);
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

        // Simpan referensi produk untuk dicek setelah commit
        affectedProducts.push(product);
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

      // Reload stok terbaru dan emit STOCK_LOW jika stok menipis
      for (const product of affectedProducts) {
        const updatedProduct = await Product.findByPk(product.id);
        if (updatedProduct && updatedProduct.stock <= updatedProduct.minimumStock) {
          eventEmitter.emit(EVENTS.STOCK_LOW, updatedProduct);
        }
      }

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
}
