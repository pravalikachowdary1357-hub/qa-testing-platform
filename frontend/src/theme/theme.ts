import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1454A6', dark: '#0A2A57' },
    // TestSphere gold (logo)
    secondary: { main: '#C99400', light: '#F5B800', contrastText: '#0A2A57' },
    background: { default: '#F1F4FA', paper: '#FFFFFF' },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: ['Inter', 'Roboto', 'Segoe UI', 'Arial', 'sans-serif'].join(','),
  },
  components: {
    MuiAppBar: {
      defaultProps: { color: 'inherit', elevation: 0 },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
    },
    // Button labels never wrap onto two lines (e.g. "Import Products").
    MuiButton: {
      styleOverrides: {
        root: { whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
  },
});
