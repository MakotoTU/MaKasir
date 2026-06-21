import { User } from '../models';

export class AuthController {
  static async login(username: string, passwordPlain: string) {
    if (!username || !passwordPlain) throw new Error('Username dan password wajib diisi');

    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new Error('Kredensial tidak valid');
    }

    const isMatch = await Bun.password.verify(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new Error('Kredensial tidak valid');
    }

    return { id: user.id, username: user.username, role: user.role };
  }

  static async getAll() {
    return await User.findAll({ attributes: ['id', 'username', 'role'] });
  }

  static async createCashier(username: string, passwordPlain: string, role: string = 'cashier') {
    if (!username || !passwordPlain) throw new Error('Username dan password wajib diisi');
    
    const existing = await User.findOne({ where: { username } });
    if (existing) throw new Error('Username sudah digunakan');

    const passwordHash = await Bun.password.hash(passwordPlain);

    return await User.create({ username, passwordHash, role });
  }

  static async updateCashier(id: string | number, data: { username?: string, password?: string, role?: string }) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('User tidak ditemukan');
    
    if (data.username) user.username = data.username;
    if (data.password) {
      user.passwordHash = await Bun.password.hash(data.password);
    }
    if (data.role) user.role = data.role;
    
    await user.save();
    return { id: user.id, username: user.username, role: user.role };
  }

  static async deleteCashier(id: string | number) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('User tidak ditemukan');
    if (user.role === 'admin') throw new Error('Tidak bisa menghapus admin');
    
    await user.destroy();
    return { success: true };
  }
}
