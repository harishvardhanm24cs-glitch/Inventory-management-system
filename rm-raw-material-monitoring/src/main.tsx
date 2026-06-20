import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { InventoryProvider } from './context/InventoryContext.tsx'

console.log('main.tsx starting App');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InventoryProvider>
      <App />
    </InventoryProvider>
  </StrictMode>,
)
