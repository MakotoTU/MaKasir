import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class Product extends Model {
  declare id: number;
  declare name: string;
  declare price: number;
  declare category: string;
  declare stock: number;
  declare minimumStock: number;
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
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  minimumStock: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'products'
});
