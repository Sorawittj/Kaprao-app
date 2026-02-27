import { NavLink, useLocation } from 'react-router-dom'
import { Home, ClipboardList, Ticket, User, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store'
import { cn } from '@/utils/cn'

const navItems = [
  { path: '/', icon: Home, label: 'หน้าหลัก', activeGradient: 'from-brand-500 to-orange-400' },
  { path: '/orders', icon: ClipboardList, label: 'ออเดอร์', activeGradient: 'from-blue-500 to-cyan-400' },
  { path: '/lottery', icon: Ticket, label: 'หวย', activeGradient: 'from-purple-500 to-pink-500' },
  { path: '/cart', icon: ShoppingCart, label: 'ตะกร้า', showBadge: true, activeGradient: 'from-green-500 to-emerald-400' },
  { path: '/profile', icon: User, label: 'โปรไฟล์', activeGradient: 'from-gray-600 to-gray-500' },
]

export function BottomNav() {
  const location = useLocation()
  const { totalItems } = useCartStore()

  if (
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/cart')
  ) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div
        className="border-t border-gray-100/80"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 -8px 32px -8px rgba(0,0,0,0.1)',
        }}
      >
        <div className="max-w-md mx-auto flex justify-around items-center h-[62px] safe-area-x px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1"
            >
              {({ isActive }) => (
                <>
                  {/* Active background pill */}
                  {isActive && (
                    <div
                      className={cn(
                        'absolute top-1 w-12 h-8 rounded-2xl bg-brand-500/10',
                      )}
                    />
                  )}

                  {/* Icon container */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className={cn(
                        'transition-all',
                        isActive ? '-translate-y-0.5' : 'translate-y-0'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'w-6 h-6 transition-colors',
                          isActive ? 'text-brand-600' : 'text-gray-400'
                        )}
                        style={isActive ? { strokeWidth: 2.5 } : { strokeWidth: 2 }}
                      />
                    </div>

                    {/* Cart Badge */}
                    {item.showBadge && totalItems > 0 && (
                      <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 border-2 border-white shadow-lg">
                        {totalItems > 99 ? '99+' : totalItems}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-[10px] font-bold mt-0.5 transition-all duration-200',
                      isActive ? 'text-gray-800 opacity-100' : 'text-gray-400 opacity-60'
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Active dot indicator */}
                  {isActive && (
                    <div
                      className={cn(
                        'absolute bottom-0 w-6 h-0.5 rounded-full bg-brand-500'
                      )}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}


export default BottomNav
