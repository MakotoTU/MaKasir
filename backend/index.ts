import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { connectDB } from './config/db';
import { ProductController } from './controllers/ProductController';
import { OrderController } from './controllers/OrderController';
import { AuthController } from './controllers/AuthController';
import { ExpenseController } from './controllers/ExpenseController';
import { Order, OrderItem, User } from './models';
import { eventEmitter, EVENTS } from './services/event.service';
import { waService } from './services/whatsapp.service'; // Start WA Service on boot
import { Op } from 'sequelize';

// Setup koneksi DB
connectDB();

// Pool untuk menyimpan semua koneksi WebSocket KDS yang aktif
const kdsClients = new Set<any>();

// Broadcast pesanan baru ke semua layar dapur yang terhubung saat ORDER_CREATED
eventEmitter.on(EVENTS.ORDER_CREATED, (order: any) => {
  const payload = JSON.stringify({ type: 'new_order', data: order });
  for (const ws of kdsClients) {
    try { ws.send(payload); } catch { kdsClients.delete(ws); }
  }
});


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
        clientUuid: t.Optional(t.String()),
        paymentMethod: t.Optional(t.Union([t.Literal('cash'), t.Literal('qris')])),
        amountPaid: t.Optional(t.Number({ minimum: 0 })),
        items: t.Array(t.Object({
          productId: t.Number(),
          qty: t.Number({ minimum: 1 })
        }), { minItems: 1 })
      })
    })

    // Endpoint Expenses (Read & Create — semua user terautentikasi)
    .get('/expenses', async () => await ExpenseController.getAll())
    .post('/expenses', async ({ body, set, user }: any) => {
      try {
        const userId = user?.id;
        return await ExpenseController.create(body, userId);
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    }, {
      body: t.Object({
        description: t.String(),
        amount: t.Number({ minimum: 1 }),
        category: t.Optional(t.String())
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
        category: t.Optional(t.String()),
        stock: t.Optional(t.Number({ minimum: 0 })),
        minimumStock: t.Optional(t.Number({ minimum: 0 }))
      })
    })
    .delete('/products/:id', async ({ params: { id } }) => await ProductController.delete(id))

    // Endpoint Expenses (Edit & Delete — hanya Admin)
    .put('/expenses/:id', async ({ params: { id }, body, set }) => {
      try {
        return await ExpenseController.update(id, body);
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    }, {
      body: t.Object({
        description: t.Optional(t.String()),
        amount: t.Optional(t.Number({ minimum: 1 })),
        category: t.Optional(t.String())
      })
    })
    .delete('/expenses/:id', async ({ params: { id }, set }) => {
      try {
        return await ExpenseController.delete(id);
      } catch (e: any) {
        set.status = 400;
        return { error: e.message };
      }
    })

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
  )

  // Group 4: WebSocket KDS - Kitchen Display System (tanpa auth, akses dari jaringan lokal)
  .ws('/ws/kds', {
    async open(ws) {
      // Tambahkan klien ke pool
      kdsClients.add(ws);
      console.log(`KDS client connected. Total clients: ${kdsClients.size}`);

      // Kirim semua pesanan aktif hari ini (status: pending/proses) saat klien baru terhubung
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeOrders = await Order.findAll({
        where: {
          status: { [Op.notIn]: ['siap_disajikan', 'selesai_ambil'] },
          createdAt: { [Op.gte]: today }
        },
        include: [
          { model: OrderItem, as: 'items' },
          { model: User, as: 'cashier', attributes: ['username'] }
        ],
        order: [['createdAt', 'ASC']]
      });
      ws.send(JSON.stringify({ type: 'init_orders', data: activeOrders }));
    },

    async message(ws, message: any) {
      // Terima pesan update status dari KDS
      if (message?.type === 'update_status' && message?.orderId && message?.status) {
        const order = await Order.findByPk(message.orderId);
        if (order) {
          order.status = message.status;
          await order.save();

          // Broadcast status terupdate ke semua klien KDS yang terhubung
          const broadcastPayload = JSON.stringify({
            type: 'status_updated',
            data: { orderId: message.orderId, status: message.status }
          });
          for (const client of kdsClients) {
            try { client.send(broadcastPayload); } catch { kdsClients.delete(client); }
          }

          // Jika sudah siap disajikan, kirim notifikasi WhatsApp ke pelanggan (jika ada nomor)
          if (message.status === 'siap_disajikan') {
            const fullOrder = await Order.findByPk(message.orderId, {
              include: [{ model: OrderItem, as: 'items' }]
            });
            if (fullOrder) {
              console.log(`Order #${message.orderId} siap disajikan.`);
              // Trigger WA notifikasi jika customerPhone tersedia di masa depan
            }
          }
        }
      }
    },

    close(ws) {
      kdsClients.delete(ws);
      console.log(`KDS client disconnected. Total clients: ${kdsClients.size}`);
    }
  });

app.listen(process.env.PORT || 3000);
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);