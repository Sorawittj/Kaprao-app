import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AppProviders } from './providers/AppProviders'
import { RootLayout } from './layout/RootLayout'
import { AdminLayout } from './layout/AdminLayout'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/HomePage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const LotteryPage = lazy(() => import('@/pages/LotteryPage'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'))
const AdminMenuPage = lazy(() => import('@/pages/admin/AdminMenuPage'))
const AdminCustomersPage = lazy(() => import('@/pages/admin/AdminCustomersPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'))
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfServicePage'))

// Loading fallback
// eslint-disable-next-line react-refresh/only-export-components
function PageLoader() {
  return <LoadingScreen message="กำลังโหลดหน้า..." />
}

// Wrap component with Suspense and ErrorBoundary
function withSuspense(Component: React.ComponentType) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter(
  [
    {
      element: <AppProviders><Outlet /></AppProviders>,
      children: [
        {
          element: <RootLayout />,
          children: [
            { path: '/', element: withSuspense(HomePage) },
            { path: '/cart', element: withSuspense(CartPage) },
            { path: '/checkout', element: withSuspense(CheckoutPage) },
            { path: '/orders', element: withSuspense(OrdersPage) },
            { path: '/orders/:id', element: withSuspense(OrderDetailPage) },
            { path: '/profile', element: withSuspense(ProfilePage) },
            { path: '/lottery', element: withSuspense(LotteryPage) },
            { path: '/privacy', element: withSuspense(PrivacyPolicyPage) },
            { path: '/terms', element: withSuspense(TermsOfServicePage) },
          ],
        },
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: withSuspense(AdminDashboard) },
            { path: 'orders', element: withSuspense(AdminOrdersPage) },
            { path: 'menu', element: withSuspense(AdminMenuPage) },
            { path: 'customers', element: withSuspense(AdminCustomersPage) },
            { path: 'settings', element: withSuspense(AdminSettingsPage) },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  {
    basename: import.meta.env.BASE_URL,
  } as any
)
