import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '../theme/theme';
import { ProductProvider } from '../context/ProductContext';
import { MainLayout } from '../layouts/MainLayout';
import { navItems } from '../routes/routeConfig';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProductProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              {navItems.map((item) => (
                <Route key={item.path} path={item.path} element={item.element} />
              ))}
            </Route>
          </Routes>
        </BrowserRouter>
      </ProductProvider>
    </ThemeProvider>
  );
}
