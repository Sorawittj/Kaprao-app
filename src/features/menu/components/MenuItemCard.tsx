import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Heart, Star, CheckCircle } from 'lucide-react'
import type { MenuItem } from '@/types'
import { useMenuStore, useCartStore, useUIStore } from '@/store'
import { formatPrice } from '@/utils/formatPrice'
import { cn } from '@/utils/cn'
import { hapticAddToCart, hapticLight } from '@/utils/haptics'
import { getValidImageUrl } from '@/utils/getImageUrl'
import { MenuItemModal } from './MenuItemModal'

interface MenuItemCardProps {
  item: MenuItem
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { addViewedItem, toggleFavorite, isFavorite } = useMenuStore()
  const { addItem } = useCartStore()
  const { addToast } = useUIStore()
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleQuickAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isAdding || justAdded) return

    hapticAddToCart()
    setIsAdding(true)
    setJustAdded(true)

    addItem(item, 1, [])

    addToast({
      type: 'cart-add',
      title: 'เพิ่มลงตะกร้าแล้ว! 🛒',
      message: item.name,
      imageUrl: item.imageUrl,
    })

    setTimeout(() => {
      setIsAdding(false)
    }, 300)
    setTimeout(() => {
      setJustAdded(false)
    }, 1800)
  }, [addItem, addToast, isAdding, justAdded, item])

  const handleCardClick = useCallback(() => {
    addViewedItem(item.id)
    setIsModalOpen(true)
  }, [addViewedItem, item.id])

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(item.id)
    hapticLight()
  }, [toggleFavorite, item.id])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const isFav = isFavorite(item.id)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, transition: { duration: 0.25, ease: [0, 0, 0.2, 1] } }}
        whileTap={{ scale: 0.97 }}
        onClick={handleCardClick}
        className={cn(
          'bg-white rounded-[1.25rem] overflow-hidden cursor-pointer select-none',
          'border border-gray-100/80',
          !item.isAvailable && 'opacity-65 grayscale'
        )}
        style={{
          boxShadow: '0 4px 20px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
          transition: 'box-shadow 0.25s ease',
        }}
        onHoverStart={(e) => {
          const el = e.target as HTMLElement
          el.closest?.('.menu-card')?.setAttribute('style', 'box-shadow: 0 16px 40px -8px rgba(0,0,0,0.15)')
        }}
      >
        {/* Image */}
        <div className="relative overflow-hidden" style={{ paddingBottom: '78%' }}>
          {/* Skeleton while loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}

          <img
            src={getValidImageUrl(item.imageUrl)}
            alt={item.name}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-all duration-500',
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
              'group-hover:scale-110'
            )}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true)
                ; (e.target as HTMLImageElement).src = getValidImageUrl(null)
            }}
          />

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

          {/* Favorite Button */}
          <motion.button
            onClick={handleToggleFavorite}
            whileTap={{ scale: 0.8 }}
            className={cn(
              'absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center',
              'shadow-lg backdrop-blur-sm transition-all duration-200',
              isFav ? 'bg-red-50 border border-red-200' : 'bg-white/90 border border-white/50'
            )}
            style={{ pointerEvents: 'auto' }}
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-all duration-300',
                isFav ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400'
              )}
            />
          </motion.button>

          {/* Recommended Badge */}
          {item.isRecommended && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-2.5 left-2.5"
            >
              <span className="inline-flex items-center gap-1 bg-brand-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                <Star className="w-2.5 h-2.5 fill-white" />
                แนะนำ
              </span>
            </motion.div>
          )}

          {/* Sold Out Overlay */}
          {!item.isAvailable && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center"
            >
              <span className="bg-gray-900/90 text-white font-black text-sm px-5 py-2 rounded-full border border-white/20 shadow-xl -rotate-6">
                SOLD OUT
              </span>
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-bold text-gray-800 text-sm line-clamp-1 mb-0.5 leading-snug">
            {item.name}
          </h3>

          <p className="text-[11px] text-gray-400 line-clamp-1 mb-2.5 leading-normal">
            {item.description || item.category}
          </p>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-black text-brand-600 text-base">
                {formatPrice(item.price)}
              </span>
            </div>

            {item.isAvailable && (
              <AnimatePresence mode="wait">
                {justAdded ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
                  >
                    <CheckCircle className="w-5 h-5 text-white fill-white/20" />
                  </motion.div>
                ) : (
                  <motion.button
                    key="add"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={handleQuickAdd}
                    disabled={isAdding}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md"
                    style={{
                      background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
                      boxShadow: '0 4px 12px -2px rgba(255, 107, 0, 0.45)',
                      pointerEvents: 'auto',
                    }}
                  >
                    <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </motion.div>

      {/* Detail Modal */}
      {isModalOpen && (
        <MenuItemModal
          item={item}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}
