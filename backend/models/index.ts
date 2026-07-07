import { User } from './User';
import { Product } from './Product';
import { Order } from './Order';
import { OrderItem } from './OrderItem';
import { Expense } from './Expense';

// Definisikan Relasi
Order.belongsTo(User, { as: 'cashier', foreignKey: 'cashierId' });
User.hasMany(Order, { foreignKey: 'cashierId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

Expense.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
User.hasMany(Expense, { foreignKey: 'createdBy' });

export { User, Product, Order, OrderItem, Expense };
