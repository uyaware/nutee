import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'

import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'

import { storefrontTheme } from '@/shared/theme'
import { reportErrorToast } from '@/shared/lib/errorToast'
import { initPostHog } from '@/shared/analytics/posthog'
import App from '@/app/App'

// Initialize PostHog Analytics
initPostHog()

const client: QueryClient = new QueryClient({
   queryCache: new QueryCache({
      onError: (error, query) => {
         if (!query.meta?.silentErrorToast) {
            reportErrorToast(error)
         }
      },
   }),
   mutationCache: new MutationCache({
      onError: (error) => {
         reportErrorToast(error)
      },
   }),
   defaultOptions: {
      queries: {
         staleTime: 15000,
         retry: false,
         refetchOnWindowFocus: 'always',
      },
      mutations: {
         retry: false,
      },
   },
})

createRoot(document.getElementById('root')!).render(
   <StrictMode>
      <QueryClientProvider client={client}>
         <ThemeProvider theme={storefrontTheme} storageManager={null}>
            <CssBaseline />
            <BrowserRouter>
               <App />
            </BrowserRouter>
         </ThemeProvider>
      </QueryClientProvider>
   </StrictMode>
)
