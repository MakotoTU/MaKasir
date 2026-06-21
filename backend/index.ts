import { Elysia, t } from 'elysia';
import { connectDB } from './config/db';
import { ProductController } from './controllers/ProductController';
import { OrderController } from './controllers/OrderController';
import { AuthController } from './controllers/AuthController';
import { waService } from './services/whatsapp.service'; // Start WA Service on boot

// Setup koneksi DB
connectDB();

const app = new Elysia()
  .get('/', () => 'Kasir WA API Running')

  // Error Handler global agar error message konsisten
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'Validasi gagal', detail: error.all };
    }
    set.status = 500;
    return { error: error.message || 'Terjadi kesalahan pada server' };
  })

  // Endpoint Auth
  .post('/api/auth/login', async ({ body, set }) => {
    try {
      return await AuthController.login(body.username, body.password);
    } catch (e: any) {
      set.status = 401;
      return { error: e.message };
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  
  // Endpoint Users / Kasir
  .get('/api/users', async () => await AuthController.getAll())
  .post('/api/users', async ({ body, set }) => {
    try {
      return await AuthController.createCashier(body.username, body.password, body.role);
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      role: t.Optional(t.String())
    })
  })
  .put('/api/users/:id', async ({ params: { id }, body, set }) => {
    try {
      return await AuthController.updateCashier(id, body);
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    body: t.Object({
      username: t.Optional(t.String()),
      password: t.Optional(t.String()),
      role: t.Optional(t.String())
    })
  })
  .delete('/api/users/:id', async ({ params: { id }, set }) => {
    try {
      return await AuthController.deleteCashier(id);
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  })

  // Endpoint Product
  .get('/api/products', async () => await ProductController.getAll())
  .get('/api/products/:id', async ({ params: { id } }) => await ProductController.getById(id))
  .post('/api/products', async ({ body }) => await ProductController.create(body), {
    body: t.Object({
      name: t.String(),
      price: t.Number({ minimum: 0 }),
      category: t.String()
    })
  })
  .put('/api/products/:id', async ({ params: { id }, body }) => await ProductController.update(id, body), {
    body: t.Object({
      name: t.Optional(t.String()),
      price: t.Optional(t.Number({ minimum: 0 })),
      category: t.Optional(t.String())
    })
  })
  .delete('/api/products/:id', async ({ params: { id } }) => await ProductController.delete(id))

  // Endpoint Order
  .get('/api/orders', async () => await OrderController.getHistory())
  .get('/api/orders/:id', async ({ params: { id } }) => await OrderController.getById(id))
  .post('/api/orders', async ({ body, set }) => {
    try {
      return await OrderController.createOrder(body);
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    body: t.Object({
      cashierId: t.Number(),
      items: t.Array(t.Object({
        productId: t.Number(),
        qty: t.Number({ minimum: 1 })
      }), { minItems: 1 })
    })
  })

  // Endpoint WA
  .get('/api/wa/qr', () => waService.getQR());

app.listen(process.env.PORT || 3000);
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);