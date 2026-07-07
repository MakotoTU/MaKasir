import { Expense, User } from '../models';

export class ExpenseController {
  static async getAll() {
    return await Expense.findAll({
      include: [{ model: User, as: 'creator', attributes: ['username', 'role'] }],
      order: [['createdAt', 'DESC']]
    });
  }

  static async create(data: { description: string; amount: number; category?: string }, createdBy: number) {
    if (!data.description || !data.amount) throw new Error('Deskripsi dan nominal wajib diisi');
    if (data.amount <= 0) throw new Error('Nominal pengeluaran harus lebih dari 0');

    return await Expense.create({
      description: data.description,
      amount: data.amount,
      category: data.category || 'Operasional',
      createdBy
    });
  }

  static async update(id: string | number, data: { description?: string; amount?: number; category?: string }) {
    const expense = await Expense.findByPk(id);
    if (!expense) throw new Error('Pengeluaran tidak ditemukan');

    if (data.description) expense.description = data.description;
    if (data.amount !== undefined) {
      if (data.amount <= 0) throw new Error('Nominal pengeluaran harus lebih dari 0');
      expense.amount = data.amount;
    }
    if (data.category) expense.category = data.category;

    await expense.save();
    return expense;
  }

  static async delete(id: string | number) {
    const expense = await Expense.findByPk(id);
    if (!expense) throw new Error('Pengeluaran tidak ditemukan');

    await expense.destroy();
    return { success: true };
  }
}
