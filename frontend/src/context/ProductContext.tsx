import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiProduct } from '../types/product';
import { fetchProducts } from '../api/products';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'testsphere.product.selectedId';

interface ProductContextValue {
  currentProduct: ApiProduct | null;
  setCurrentProduct: (product: ApiProduct) => void;
  products: ApiProduct[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

interface ProductProviderProps {
  children: ReactNode;
}

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function ProductProvider({ children }: ProductProviderProps) {
  // ProductProvider sits above RequireAuth (it also needs to reset when the
  // user logs out), so its own effect -- not RequireAuth -- is what must
  // gate this fetch: firing it while unauthenticated (e.g. still on
  // /login, or before session restore resolves) would 401 once and never
  // retry, permanently starving the header switcher.
  const { user } = useAuth();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [currentProduct, setCurrentProductState] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setCurrentProduct = (product: ApiProduct) => {
    setCurrentProductState(product);
    try {
      localStorage.setItem(STORAGE_KEY, product.id);
    } catch {
      // localStorage unavailable (e.g. private browsing) -- selection just
      // won't persist across reloads.
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProducts();
      setProducts(list);
      const storedId = readStoredId();
      const restored = storedId ? list.find((p) => p.id === storedId) : undefined;
      setCurrentProductState(restored ?? list[0] ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setCurrentProductState(null);
      setError(null);
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value = useMemo<ProductContextValue>(
    () => ({ currentProduct, setCurrentProduct, products, loading, error, refresh: load }),
    [currentProduct, products, loading, error],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProductContext(): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
}
