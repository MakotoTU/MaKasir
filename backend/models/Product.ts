import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class Product extends Model {
  declare id: number;
  declare name: string;
  declare price: number;
  declare category: string;
}

Product.init({
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
  category: {
    type: DataTypes.STRING
  }
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'products'
});
