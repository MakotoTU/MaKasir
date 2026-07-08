export interface Product {
  id: number
  name: string
  price: number
  category: string
}

export interface User {
  id: number
  username: string
  role: 'admin' | 'cashier'
}

export interface CartItem {
  productId: number
  name: string
  price: number
  qty: number
}

export interface Order {
  id: number
  cashierId: number
  totalPrice: number
  status: string
  whatsappStatus: string
  paymentMethod: string
  amountPaid?: number
  changeDue?: number
  createdAt: string
  cashier?: {
    username: string
  }
}
