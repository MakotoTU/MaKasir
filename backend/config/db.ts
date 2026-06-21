import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'kasir_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Terhubung ke MySQL menggunakan Sequelize');
    
    // Sinkronisasi model ke DB (auto-create table di dev mode)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Semua tabel tersinkronisasi (Mode Dev)');
    } else {
      console.log('✅ Mode Production: Melewati sinkronisasi otomatis');
    }
  } catch (error) {
    console.error('❌ Gagal terhubung ke MySQL:', error);
    process.exit(1);
  }
};
