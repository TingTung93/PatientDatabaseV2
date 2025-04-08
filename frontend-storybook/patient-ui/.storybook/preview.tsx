import React from 'react';
import type { Preview } from '@storybook/react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from '../src/theme'
import '../src/index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../src/context/ToastContext'

// Create a real QueryClient for the stories with the correct API URL
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Log the API URL being used
console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <Story />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
};

export default preview;