"use client";
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { StripeProvider } from '../contexts/StripeContext';
import { AuthProvider } from '../contexts/AuthContext';

const glossyAITheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0b1957',
      light: '#1a2d7a',
      dark: '#0a1445',
    },
    secondary: {
      main: '#7c3aed',
      light: '#9663f0',
      dark: '#5d2cb0',
    },
    error: {
      main: '#ff00e0',
    },
    background: {
      default: '#0a0e27',
      paper: 'rgba(255, 255, 255, 0.05)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h1: {
      background: 'linear-gradient(135deg, #00eaff, #7c3aed, #ff00e0)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontWeight: 700,
    },
    h2: {
      background: 'linear-gradient(135deg, #00eaff, #7c3aed)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontWeight: 600,
    },
    h3: {
      background: 'linear-gradient(135deg, #00eaff, #7c3aed)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0a0e27 0%, #141b2d 100%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid oklch(0.922 0 0)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease-in-out',
        },
      },
      variants: [
        {
          props: { variant: 'outlined' },
          style: {
            border: '1px solid oklch(0.922 0 0) !important',
            borderColor: 'oklch(0.922 0 0) !important',
            '&:hover': {
              borderColor: '#0b1957 !important',
            },
          },
        },
      ],
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(135deg, #00eaff, #7c3aed)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0, 234, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c3aed, #ff00e0)',
            boxShadow: '0 8px 30px rgba(124, 58, 237, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          border: '2px solid',
          borderImage: 'linear-gradient(135deg, #00eaff, #7c3aed, #ff00e0) 1',
          background: 'transparent',
          '&:hover': {
            borderImage: 'linear-gradient(135deg, #ff00e0, #7c3aed, #00eaff) 1',
            background: 'rgba(0, 234, 255, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'rgba(0, 234, 255, 0.5)',
              boxShadow: '0 0 20px rgba(0, 234, 255, 0.2)',
            },
            '&.Mui-focused': {
              borderColor: '#00eaff',
              boxShadow: '0 0 30px rgba(0, 234, 255, 0.4)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: `
            0 20px 60px 0 rgba(0, 0, 0, 0.5),
            0 0 40px 0 rgba(0, 234, 255, 0.2),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)
          `,
        },
      },
    },
  },
})

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Provider store={store}>
        <StripeProvider>
          {children}
        </StripeProvider>
      </Provider>
    </AuthProvider>
  );
}
