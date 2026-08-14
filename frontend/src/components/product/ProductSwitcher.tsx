import { FormControl, MenuItem, Select } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useProductContext } from '../../context/ProductContext';

// Lets the user pick which of the 16+ products the shell is currently
// scoped to. This is the mechanism that avoids building a separate
// frontend app per product.
export function ProductSwitcher() {
  const { currentProduct, setCurrentProduct, products } = useProductContext();

  const handleChange = (event: SelectChangeEvent) => {
    const next = products.find((product) => product.id === event.target.value);
    if (next) {
      setCurrentProduct(next);
    }
  };

  return (
    <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 220 } }}>
      <Select value={currentProduct.id} onChange={handleChange}>
        {products.map((product) => (
          <MenuItem key={product.id} value={product.id}>
            {product.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
