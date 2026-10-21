import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import { AuthProvider } from './admin/AuthContext.jsx'
import { SettingsProvider } from './settings.jsx'
import { AccountProvider } from './components/AccountModal.jsx'
import RequireAuth, { RequirePermission } from './admin/RequireAuth.jsx'

// Prototipo de diseño en prueba — no forma parte de la tienda real, así que
// se carga aparte y no pesa en el bundle principal.
const HomeV2 = lazy(() => import('./pages/HomeV2.jsx'))

// El panel administrativo solo lo carga quien entra a /admin — la tienda
// pública no necesita descargarlo.
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'))
const Login = lazy(() => import('./admin/pages/Login.jsx'))
const ResetPassword = lazy(() => import('./admin/pages/ResetPassword.jsx'))
const AdminHome = lazy(() => import('./admin/AdminHome.jsx'))
const Products = lazy(() => import('./admin/pages/Products.jsx'))
const Purchases = lazy(() => import('./admin/pages/Purchases.jsx'))
const Sales = lazy(() => import('./admin/pages/Sales.jsx'))
const Discounts = lazy(() => import('./admin/pages/Discounts.jsx'))
const Coupons = lazy(() => import('./admin/pages/Coupons.jsx'))
const Categories = lazy(() => import('./admin/pages/Categories.jsx'))
const Logistics = lazy(() => import('./admin/pages/Logistics.jsx'))
const Customers = lazy(() => import('./admin/pages/Customers.jsx'))
const Quotes = lazy(() => import('./admin/pages/Quotes.jsx'))
const Settings = lazy(() => import('./admin/pages/Settings.jsx'))
const Featured = lazy(() => import('./admin/pages/Featured.jsx'))
const Users = lazy(() => import('./admin/pages/Users.jsx'))
const Roles = lazy(() => import('./admin/pages/Roles.jsx'))

function AdminFallback() {
  return <p className="p-8 text-sm text-neutral-400">Cargando…</p>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
        <AccountProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/fragancias" element={<App view="fragancias" />} />
          <Route path="/cuenta" element={<App view="cuenta" />} />
          <Route path="/checkout" element={<App view="checkout" />} />
          <Route
            path="/cuenta/restablecer"
            element={
              <Suspense fallback={<AdminFallback />}>
                <ResetPassword />
              </Suspense>
            }
          />
          <Route
            path="/home-prueba"
            element={
              <Suspense fallback={<AdminFallback />}>
                <HomeV2 />
              </Suspense>
            }
          />
          <Route path="/nosotros" element={<ComingSoon title="Nosotros" />} />
          <Route path="/contacto" element={<ComingSoon title="Contacto" />} />
          <Route
            path="/admin/restablecer"
            element={
              <Suspense fallback={<AdminFallback />}>
                <ResetPassword />
              </Suspense>
            }
          />
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
            <Route index element={<AdminHome />} />
            <Route path="productos" element={<RequirePermission perm="products.view"><Products /></RequirePermission>} />
            <Route path="categorias" element={<RequirePermission perm="categories.view"><Categories /></RequirePermission>} />
            <Route path="destacados" element={<RequirePermission perm="settings.view"><Featured /></RequirePermission>} />
            <Route path="compras" element={<RequirePermission perm="purchases.view"><Purchases /></RequirePermission>} />
            <Route path="ventas" element={<RequirePermission perm="sales.view"><Sales /></RequirePermission>} />
            <Route path="clientes" element={<RequirePermission perm="customers.view"><Customers /></RequirePermission>} />
            <Route path="cotizaciones" element={<RequirePermission perm="quotes.view"><Quotes /></RequirePermission>} />
            <Route path="logistica" element={<RequirePermission perm="shipments.view"><Logistics /></RequirePermission>} />
            <Route path="descuentos" element={<RequirePermission perm="discounts.view"><Discounts /></RequirePermission>} />
            <Route path="cupones" element={<RequirePermission perm="coupons.view"><Coupons /></RequirePermission>} />
            <Route path="usuarios" element={<RequirePermission perm="users.view"><Users /></RequirePermission>} />
            <Route path="ajustes" element={<RequirePermission perm="settings.view"><Settings /></RequirePermission>} />
            <Route path="roles" element={<RequirePermission perm="roles.view"><Roles /></RequirePermission>} />
          </Route>
        </Routes>
        </AccountProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
