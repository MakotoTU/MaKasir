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
    
    // ⚠️ WARNING: sync({ alter: true }) can drop columns silently. Only run this in development!
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Semua tabel tersinkronisasi (Mode Dev)');
    } else {
      await sequelize.sync({ force: false }); // production: no alter, safe sync
      console.log('✅ Mode Production: Melewati sinkronisasi otomatis (force: false)');
    }
  } catch (error) {
    console.error('❌ Gagal terhubung ke MySQL:', error);
    process.exit(1);
  }
};
