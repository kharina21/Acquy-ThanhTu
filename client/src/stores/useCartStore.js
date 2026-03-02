import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cart store - client only, không gọi backend.
 * Mỗi item: { productId, name, price, image, quantity }
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (product, quantity = 1) => {
        const { items } = get();
        const id = product._id;
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
              name: product.name,
              price: product.price ?? 0,
              image: product.images?.[0] || product.image || '',
              quantity,
            },
          ];
        }
        set({ items: next });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalQuantity: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
);
