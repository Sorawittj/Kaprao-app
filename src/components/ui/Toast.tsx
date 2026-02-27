import { motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, ShoppingCart } from 'lucide-react'
import { useUIStore } from '@/store'
import type { Toast as ToastType } from '@/types'
import { toastSlideUp } from '@/animations/variants'
import { getValidImageUrl } from '@/utils/getImageUrl'
interface ToastProps {
  toast: ToastType
}

const toastConfig = {
  success: {
    bg: 'linear-gradient(135deg, #22C55E, #16A34A)',
    icon: CheckCircle,
    shadow: 'rgba(34, 197, 94, 0.35)',
  },
  error: {
    bg: 'linear-gradient(135deg, #EF4444, #DC2626)',
    icon: AlertCircle,
    shadow: 'rgba(239, 68, 68, 0.35)',
  },
  info: {
    bg: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    icon: Info,
    shadow: 'rgba(59, 130, 246, 0.35)',
  },
  'cart-add': {
    bg: 'linear-gradient(135deg, #1C1917, #292524)',
    icon: ShoppingCart,
    shadow: 'rgba(0, 0, 0, 0.35)',
  },
}

export function Toast({ toast }: ToastProps) {
  const { removeToast } = useUIStore()
  const config = toastConfig[toast.type]
  const Icon = config.icon

  return (
    <motion.div
      layout
      variants={toastSlideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      drag="x"
      dragConstraints={{ left: 0, right: 100 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 50) removeToast(toast.id)
      }}
      className="pointer-events-auto relative overflow-hidden rounded-2xl shadow-2xl min-w-[300px] max-w-sm"
      style={{
        background: config.bg,
        boxShadow: `0 8px 30px -4px ${config.shadow}`,
      }}
    >
      {/* Shine effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
        }}
      />

      <div className="relative flex items-center gap-3 px-4 py-3.5">
        {/* Image or Icon */}
        {toast.imageUrl ? (
          <img
            src={getValidImageUrl(toast.imageUrl)}
            alt=""
            className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/20 flex-shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const fallback = getValidImageUrl(null);
              if (target.src !== new URL(fallback, window.location.href).href) {
                target.src = fallback;
              } else {
                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmM2YzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
              }
            }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-white">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-white/75 truncate mt-0.5">{toast.message}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => removeToast(toast.id)}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: 'rgba(255,255,255,0.35)', originX: 0 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}
