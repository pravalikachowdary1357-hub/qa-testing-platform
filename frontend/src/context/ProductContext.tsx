import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../types/product';
import { mockProducts } from '../data/mockProducts';

interface ProductContextValue {
  currentProduct: Product;
  setCurrentProduct: (product: Product) => void;
  products: Product[];
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

interface ProductProviderProps {
  children: ReactNode;
}

export function ProductProvider({ children }: ProductProviderProps) {
  const [currentProduct, setCurrentProduct] = useState<Product>(mockProducts[0]);

  const value = useMemo<ProductContextValue>(
    () => ({ currentProduct, setCurrentProduct, products: mockProducts }),
    [currentProduct],
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
