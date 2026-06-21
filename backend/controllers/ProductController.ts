import { Product } from '../models';

export class ProductController {
  static async getAll() {
    return await Product.findAll();
  }

  static async getById(id: string) {
    return await Product.findByPk(id);
  }

  static async create(data: any) {
    return await Product.create(data);
  }

  static async update(id: string, data: any) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error('Produk tidak ditemukan');
    return await product.update(data);
  }

  static async delete(id: string) {
    const product = await Product.findByPk(id);
    if (product) {
      await product.destroy();
    }
    return { success: true };
  }
}
