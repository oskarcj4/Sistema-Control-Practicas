import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AuthProvider from './context/AuthContext.jsx'
import RegisterProvider from './context/RegisterContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RegisterProvider>
        <App />
      </RegisterProvider>
    </AuthProvider>
  </StrictMode>,
)
