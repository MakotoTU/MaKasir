import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { connectDB } from './config/db';
import { ProductController } from './controllers/ProductController';
import { OrderController } from './controllers/OrderController';
import { AuthController } from './controllers/AuthController';
import { waService } from './services/whatsapp.service'; // Start WA Service on boot

// Setup koneksi DB
connectDB();

const requireAuth = async ({ jwt, headers: { authorization }, set }: any) => {
  if (!authorization) {
    set.status = 401;
    throw new Error('Unauthorized: Token tidak ditemukan');
  }
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  const payload = await jwt.verify(token);
  if (!payload) {
    set.status = 401;
    throw new Error('Unauthorized: Token tidak valid');
  }
  return {
    user: payload as { id: number; role: string }
  };
};

const requireAdmin = async ({ jwt, headers: { authorization }, set }: any) => {
  if (!authorization) {
    set.status = 401;
    throw new Error('Unauthorized: Token tidak ditemukan');
  }
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  const payload = await jwt.verify(token);
  if (!payload) {
    set.status = 401;
    throw new Error('Unauthorized: Token tidak valid');
  }
  if (payload.role !== 'admin') {
    set.status = 403;
    throw new Error('Forbidden: Akses khusus admin');
  }
  return {
    user: payload as { id: number; role: string }
  };
};

const app = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'supersecretmakasir'
    })
  )
  .get('/', () => 'Kasir WA API Running')

  // Error Handler global agar error message konsisten
  .onError(({ code, error, set }) => {
    const err = error as any;
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'Validasi gagal', detail: err.all };
    }
    const errMsg = err.message || '';
    if (errMsg.startsWith('Unauthorized')) {
      set.status = 401;
      return { error: errMsg };
    }
    if (errMsg.startsWith('Forbidden')) {
      set.status = 403;
      return { error: errMsg };
    }
    set.status = 500;
    return { error: errMsg || 'Terjadi kesalahan pada server' };
  })

  // Group 1: Public Routes
  .group('/api', app => app
    // Endpoint Auth
    .post('/auth/login', async ({ body, set, jwt }) => {
      try {
        const user = await AuthController.login(body.username, body.password);
        const token = await jwt.sign({ id: user.id, role: user.role });
        return { ...user, token };
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

    // Endpoint WA QR (public agar kasir bisa memantau / scan saat setup)
    .get('/wa/qr', () => waService.getQR())
  )

  // Group 2: Authenticated Routes (Admin & Kasir)
  .group('/api', app => app
    .derive(requireAuth)

    // Endpoint Product (Read)
    .get('/products', async () => await ProductController.getAll())
    .get('/products/:id', async ({ params: { id } }) => await ProductController.getById(id))

    // Endpoint Order (Read & Write)
    .get('/orders', async () => await OrderController.getHistory())
    .get('/orders/:id', async ({ params: { id } }) => await OrderController.getById(id))
    .post('/orders', async ({ body, set }) => {
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
  )

  // Group 3: Admin Only Routes
  .group('/api', app => app
    .derive(requireAdmin)

    // Endpoint Users / Kasir
    .get('/users', async () => await AuthController.getAll())
    .post('/users', async ({ body, set }) => {
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
    .put('/users/:id', async ({ params: { id }, body, set }) => {
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
    .delete('/users/:id', async ({ params: { id }, set }) => {
      try {
        return await AuthController.deleteCashier(id);
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    })

    // Endpoint Product (Write)
    .post('/products', async ({ body }) => await ProductController.create(body), {
      body: t.Object({
        name: t.String(),
        price: t.Number({ minimum: 0 }),
        category: t.String()
      })
    })
    .put('/products/:id', async ({ params: { id }, body }) => await ProductController.update(id, body), {
      body: t.Object({
        name: t.Optional(t.String()),
        price: t.Optional(t.Number({ minimum: 0 })),
        category: t.Optional(t.String())
      })
    })
    .delete('/products/:id', async ({ params: { id } }) => await ProductController.delete(id))

    // Endpoint WA Logout
    .post('/admin/wa/logout', async ({ set }) => {
      try {
        await waService.logout();
        return { success: true, message: 'WhatsApp disconnected' };
      } catch (e: any) {
        set.status = 500;
        return { error: e.message || 'Gagal memutus koneksi WhatsApp' };
      }
    })
  );

app.listen(process.env.PORT || 3000);
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);