import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0F4C81' },
    secondary: { main: '#00897B' },
    background: { default: '#F4F6F8', paper: '#FFFFFF' },
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
  },
});
