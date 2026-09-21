import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import { AuthProvider } from './admin/AuthContext.jsx'
import RequireAuth from './admin/RequireAuth.jsx'

// El panel administrativo solo lo carga quien entra a /admin — la tienda
// pública no necesita descargarlo.
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'))
const Login = lazy(() => import('./admin/pages/Login.jsx'))
const Dashboard = lazy(() => import('./admin/pages/Dashboard.jsx'))
const Products = lazy(() => import('./admin/pages/Products.jsx'))
const Purchases = lazy(() => import('./admin/pages/Purchases.jsx'))
const Sales = lazy(() => import('./admin/pages/Sales.jsx'))
const Discounts = lazy(() => import('./admin/pages/Discounts.jsx'))
const Coupons = lazy(() => import('./admin/pages/Coupons.jsx'))

function AdminFallback() {
  return <p className="p-8 text-sm text-neutral-400">Cargando…</p>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/coleccion" element={<App scrollTo="catalogo" />} />
          <Route path="/fragancias" element={<ComingSoon title="Fragancias" />} />
          <Route path="/nosotros" element={<ComingSoon title="Nosotros" />} />
          <Route path="/contacto" element={<ComingSoon title="Contacto" />} />
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Suspense fallback={<AdminFallback />}>
                  <AdminLayout />
                </Suspense>
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
    </BrowserRouter>
  </StrictMode>,
)
