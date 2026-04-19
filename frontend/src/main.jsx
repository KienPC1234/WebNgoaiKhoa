import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import { FCM_DEBUG, FCM_DEBUG_PREFIX, setupFirebaseAnalytics } from '@/lib/firebase.js'

const GOOGLE_OAUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

const bootLog = (...args) => {
  if (!FCM_DEBUG) return
  console.log(FCM_DEBUG_PREFIX, ...args)
}

setupFirebaseAnalytics()
  .then((analytics) => {
    bootLog('setupFirebaseAnalytics completed', { enabled: Boolean(analytics) })
  })
  .catch((error) => {
    bootLog('setupFirebaseAnalytics failed', error)
  })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {GOOGLE_OAUTH_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
)
