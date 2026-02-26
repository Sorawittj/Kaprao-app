import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react'
import { useCartStore, useUIStore } from '@/store'
import { formatPrice } from '@/utils/formatPrice'
import { getValidImageUrl } from '@/utils/getImageUrl'

export function CartDrawer() {
  const navigate = useNavigate()
  const { isCartOpen, closeCart } = useUIStore()
  const { items, updateQuantity, removeItem, finalTotal, clearCart } = useCartStore()

  const handleCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-[130]"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-[131] flex flex-col"
            style={{
              background: '#FAFAF9',
              boxShadow: '-20px 0 60px -10px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                background: 'white',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 1px 8px -2px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C42)', boxShadow: '0 4px 10px -2px rgba(255, 107, 0, 0.4)' }}
                >
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800">ตะกร้าสินค้า</h2>
                  {items.length > 0 && (
                    <p className="text-xs text-gray-400">{items.length} รายการ</p>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={closeCart}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="relative overflow-hidden rounded-2xl"
                    style={{
                      background: 'white',
                      boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex gap-3 p-3.5">
                      {/* Image */}
                      <img
                        src={getValidImageUrl(item.menuItem.imageUrl)}
                        alt={item.menuItem.name}
                        className="w-[72px] h-[72px] rounded-xl object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = getValidImageUrl(null) }}
                      />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate text-sm">{item.menuItem.name}</h3>

                        {item.selectedOptions.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                            {item.selectedOptions.map((o) => o.name).join(' · ')}
                          </p>
                        )}

                        {item.note && (
                          <p className="text-[11px] text-amber-600 mt-0.5 line-clamp-1">
                            📝 {item.note}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2.5">
                          {/* Quantity Control */}
                          <div
                            className="flex items-center gap-0 rounded-xl overflow-hidden"
                            style={{ border: '1.5px solid #E5E7EB' }}
                          >
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => {
                                if (item.quantity <= 1) {
                                  removeItem(item.id)
                                } else {
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                              }}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </motion.button>
                            <span className="w-8 text-center font-black text-sm text-gray-800">
                              {item.quantity}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors"
                              style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C42)', color: 'white' }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>

                          <span className="font-black text-brand-600 text-base">{formatPrice(item.subtotal)}</span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => removeItem(item.id)}
                        className="self-start p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Empty state */}
              {items.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
                    style={{ background: 'linear-gradient(135deg, #FFF5EB, #FFE6D1)' }}
                  >
                    <ShoppingBag className="w-12 h-12 text-brand-300" />
                  </motion.div>
                  <h3 className="text-lg font-black text-gray-800 mb-2">ตะกร้าว่างเปล่า</h3>
                  <p className="text-sm text-gray-500">เพิ่มรายการอาหารเพื่อสั่งซื้อ</p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-4"
                style={{
                  background: 'white',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: '0 -4px 20px -4px rgba(0,0,0,0.08)',
                }}
              >
                {/* Total */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="font-semibold text-gray-500">ยอดรวม</span>
                  <motion.div
                    key={finalTotal}
                    initial={{ scale: 1.15, color: '#FF6B00' }}
                    animate={{ scale: 1, color: '#111827' }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-2xl font-black">{formatPrice(finalTotal)}</span>
                  </motion.div>
                </div>

                {/* Checkout Button */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 12px 30px -6px rgba(255, 107, 0, 0.55)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCheckout}
                  className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
                    boxShadow: '0 8px 24px -4px rgba(255, 107, 0, 0.45)',
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                  ดำเนินการสั่งซื้อ
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <button
                  onClick={clearCart}
                  className="w-full mt-3 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium py-1"
                >
                  ล้างตะกร้าทั้งหมด
                </button>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
