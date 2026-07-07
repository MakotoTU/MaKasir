import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class Order extends Model {
  declare id: number;
  declare totalPrice: number;
  declare status: string;
  declare whatsappStatus: string;
  declare cashierId: number;
  declare clientUuid?: string;
  declare createdAt: Date;
  declare items?: any[];
  declare cashier?: any;
}

Order.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  whatsappStatus: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  clientUuid: {
    type: DataTypes.STRING(36),
    unique: true,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Order',
  tableName: 'orders'
});
