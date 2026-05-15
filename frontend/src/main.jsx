import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { NotificationsProvider } from '@/contexts/NotificationsContext'
import './index.css'
import 'sweetalert2/dist/sweetalert2.min.css'

// DEV-only: expose React instance for debugging duplicate React issues
if (import.meta.env && import.meta.env.DEV) {
  try {
    // attach to window so other modules can compare instances
    window.__REACT__ = React
    console.debug('[debug] main React version', React?.version)
  } catch (e) {
    // ignore
  }
}

// Expose webpush debug helpers on window for admin console use (lazy load to avoid startup overhead)
import('@/lib/pushNotifications').then((mod) => {
  window.__debugWebPush = mod.debugWebPush
  window.__webPushStatus = mod.webPushStatus
  window.__initWebPush = mod.initWebPush
  window.__isWebPushSubscribed = mod.isWebPushSubscribed // async
  window.__logSwStatus = mod.logSwStatus
}).catch(() => null)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationsProvider>
      <App />
    </NotificationsProvider>
  </React.StrictMode>,
)
