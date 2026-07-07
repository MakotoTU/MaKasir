import { connectDB } from '../config/db';
import { User } from '../models';

async function migrate() {
  console.log('🔄 Memulai migrasi password...');
  await connectDB();

  const users = await User.findAll();
  let migratedCount = 0;

  for (const user of users) {
    // Jika password tidak diawali dengan '$', asumsikan itu plain text
    if (!user.passwordHash.startsWith('$')) {
      console.log(`🔑 Mengenkripsi password untuk user: ${user.username}`);
      const hashedPassword = await Bun.password.hash(user.passwordHash);
      user.passwordHash = hashedPassword;
      await user.save();
      migratedCount++;
    } else {
      console.log(`ℹ️ User ${user.username} sudah menggunakan password terenkripsi.`);
    }
  }

  console.log(`✅ Migrasi selesai! ${migratedCount} password berhasil dimigrasi.`);
  process.exit(0);
}

migrate().catch((error) => {
  console.error('❌ Terjadi kesalahan saat migrasi:', error);
  process.exit(1);
});
