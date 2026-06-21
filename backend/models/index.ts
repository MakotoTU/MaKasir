import { User } from './User';
import { Product } from './Product';
import { Order } from './Order';
import { OrderItem } from './OrderItem';

// Definisikan Relasi
Order.belongsTo(User, { as: 'cashier', foreignKey: 'cashierId' });
User.hasMany(Order, { foreignKey: 'cashierId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

export { User, Product, Order, OrderItem };
