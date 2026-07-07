import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class Expense extends Model {
  declare id: number;
  declare description: string;
  declare amount: number;
  declare category: string;
  declare createdBy: number;
  declare createdAt: Date;
  declare creator?: any;
}

Expense.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'Operasional'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Expense',
  tableName: 'expenses'
});
