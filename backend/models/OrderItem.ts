import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class OrderItem extends Model {
  declare id: number;
  declare orderId: number;
  declare productId: number;
  declare name: string;
  declare price: number;
  declare qty: number;
}

OrderItem.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'OrderItem',
  tableName: 'order_items'
});
