import { Order, Product, OrderItem, User } from '../models';
import { eventEmitter, EVENTS } from '../services/event.service';
import { sequelize } from '../config/db';

export class OrderController {
  static async createOrder(data: any) {
    const { items, cashierId } = data;

    let totalPrice = 0;
    
    // Gunakan transaction untuk menjamin data integrity
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.create({
        totalPrice: 0,
        status: 'selesai',
        whatsappStatus: 'pending',
        cashierId
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
      await order.save({ transaction });
      
      await transaction.commit();

      // Emit object dengan data yang diperlukan
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
