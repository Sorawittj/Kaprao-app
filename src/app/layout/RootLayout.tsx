import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'
import { CartDrawer } from '@/features/cart/components/CartDrawer'
import { GlobalLoadingBar } from '@/components/ui/GlobalLoadingBar'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Global Loading Bar */}
      <GlobalLoadingBar />

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-[#FAFAF9]" />

      {/* Main content */}
      <main className="pb-24 safe-area-x">
        <Outlet />
      </main>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
