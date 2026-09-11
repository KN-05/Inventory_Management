import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppStyles from './AppStyles.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppStyles />
    <App />
  </StrictMode>,
)
