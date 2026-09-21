import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './admin/AuthContext.jsx'
import RequireAuth from './admin/RequireAuth.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import Login from './admin/pages/Login.jsx'
import Dashboard from './admin/pages/Dashboard.jsx'
import Products from './admin/pages/Products.jsx'
import Purchases from './admin/pages/Purchases.jsx'
import Sales from './admin/pages/Sales.jsx'
import Discounts from './admin/pages/Discounts.jsx'
import Coupons from './admin/pages/Coupons.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<Products />} />
            <Route path="compras" element={<Purchases />} />
            <Route path="ventas" element={<Sales />} />
            <Route path="descuentos" element={<Discounts />} />
            <Route path="cupones" element={<Coupons />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
