import { CircularProgress, FormControl, MenuItem, Select, Box, Typography } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useProductContext } from '../../context/ProductContext';

// Lets the user pick which of the real products the shell is currently
// scoped to -- the single global selection every module filters its data by.
export function ProductSwitcher() {
  const { currentProduct, setCurrentProduct, products, loading, error } = useProductContext();

  const handleChange = (event: SelectChangeEvent) => {
    const next = products.find((product) => product.id === event.target.value);
    if (next) {
      setCurrentProduct(next);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: 140, sm: 220 } }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (error || !currentProduct) {
    return (
      <Typography variant="body2" color="error" sx={{ minWidth: { xs: 140, sm: 220 } }}>
        {error ?? 'No products available'}
      </Typography>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 220 } }}>
      <Select value={currentProduct.id} onChange={handleChange} aria-label="Selected product">
        {products.map((product) => (
          <MenuItem key={product.id} value={product.id}>
            {product.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
