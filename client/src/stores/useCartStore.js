import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/axios';

/**
 * Cart store.
 * - Guest: chỉ local (persist). Mỗi item: { productId, name, price, image, quantity }
 * - Đã đăng nhập: gọi API /api/cart, sau mỗi thao tác cập nhật items từ response.
 */
const normalizeItems = (items) =>
  (items || []).map((i) => ({
    productId: i.productId?.toString?.() ?? i.productId,
    name: i.name ?? '',
    price: Number(i.price) || 0,
    image: i.image ?? '',
    quantity: Math.max(1, Number(i.quantity) || 1),
  }));

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      /** Đồng bộ store từ dữ liệu server (sau khi gọi API cart). */
      setItemsFromServer: (serverItems) => {
        set({ items: normalizeItems(serverItems) });
      },

      // ----- Local (guest) -----
      addToCart: (product, quantity = 1) => {
        const { items } = get();
        const id = (product._id || product.productId)?.toString?.() ?? product._id;
        const existing = items.find((i) => i.productId === id);
        let next;
        if (existing) {
          next = items.map((i) =>
            i.productId === id ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          next = [
            ...items,
            {
              productId: id,
              name: product.name ?? '',
              price: product.price ?? 0,
              image: product.images?.[0] || product.image || '',
              quantity: quantity || 1,
            },
          ];
        }
        set({ items: next });
      },

      removeItem: (productId) => {
        const id = productId?.toString?.() ?? productId;
        set({ items: get().items.filter((i) => i.productId === id) });
      },

      updateQuantity: (productId, quantity) => {
        const id = productId?.toString?.() ?? productId;
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === id ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      // ----- Server (đã đăng nhập) -----
      loadCartFromServer: async () => {
        try {
          const res = await api.get('/cart');
          const items = normalizeItems(res.data?.data?.items);
          set({ items });
        } catch (err) {
          if (err.response?.status === 401) return;
          console.error('loadCartFromServer:', err);
          set({ items: [] });
        }
      },

      addToCartServer: async (productId, quantity = 1) => {
        const res = await api.post('/cart/items', {
          productId: productId?.toString?.() ?? productId,
          quantity: Number(quantity) || 1,
        });
        set({ items: normalizeItems(res.data?.data?.items) });
      },

      updateQuantityServer: async (productId, quantity) => {
        const id = productId?.toString?.() ?? productId;
        const res = await api.put(`/cart/items/${id}`, {
          quantity: Math.max(0, Number(quantity) ?? 1),
        });
        set({ items: normalizeItems(res.data?.data?.items) });
      },

      removeItemServer: async (productId) => {
        const id = productId?.toString?.() ?? productId;
        const res = await api.delete(`/cart/items/${id}`);
        set({ items: normalizeItems(res.data?.data?.items) });
      },

      clearCartServer: async () => {
        await api.delete('/cart');
        set({ items: [] });
      },

      getTotalQuantity: () =>
        get().items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
    }),
    { name: 'cart-storage' }
  )
);
