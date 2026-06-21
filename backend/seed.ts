import { connectDB, sequelize } from './config/db';
import { User, Product } from './models';

async function seed() {
  await connectDB();

  const existingAdmin = await User.findOne({ where: { username: 'admin' } });
  if (!existingAdmin) {
    await User.create({
      username: 'admin',
      passwordHash: 'password', // Mengikuti data mentah karena belum ada bcrypt
      role: 'admin'
    });
    console.log('✅ User admin berhasil dibuat! (Username: admin, Password: password)');
  } else {
    console.log('ℹ️ User admin sudah ada.');
  }

  const count = await Product.count();
  if (count === 0) {
    await Product.bulkCreate([
      { name: 'Kopi Susu Gula Aren', price: 18000, category: 'Minuman' },
      { name: 'Nasi Goreng Spesial', price: 25000, category: 'Makanan' },
      { name: 'Indomie Goreng Telur', price: 12000, category: 'Makanan' }
    ]);
    console.log('✅ Produk dummy berhasil dibuat!');
  }

  process.exit(0);
}

seed();
