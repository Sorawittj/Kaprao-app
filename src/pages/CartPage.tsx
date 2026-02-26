import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MapPin,
  Truck,
  Trash2,
  Plus,
  Minus,
  Tag,
  Sparkles
} from 'lucide-react'
import { useCartStore, useAuthStore, useUIStore } from '@/store'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SmartUpsell } from '@/features/cart/components/SmartUpsell'
import { formatPrice } from '@/utils/formatPrice'
import { staggerContainer, fadeInUp } from '@/animations/variants'
import { trackPageView, trackBeginCheckout } from '@/lib/analytics'
import { cn } from '@/utils/cn'
import { hapticLight, hapticMedium } from '@/utils/haptics'
import { getValidImageUrl } from '@/utils/getImageUrl'
import { useCollaborativeCart, ShareCartButton, CollaborativeCartBadge, UserAvatar } from '@/features/collaboration/CollaborativeCart'

export default function CartPage() {
  const navigate = useNavigate()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const {
    items,
    finalTotal,
    subtotal,
    discountAmount,
    pointsUsed,
    deliveryMethod,
    setDeliveryMethod,
    updateQuantity,
    removeItem,
    clearCart
  } = useCartStore()
  const { user, isGuest } = useAuthStore()
  const { addToast } = useUIStore()

  const collabCart = useCollaborativeCart()

  useEffect(() => {
    console.log('📄 CartPage mounted, items:', items.length)
    trackPageView('/cart', 'Cart')
    if (items.length > 0) {
      trackBeginCheckout(items as any, finalTotal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const joinId = urlParams.get('join')
    if (joinId && user && !collabCart.isConnected) {
      collabCart.joinCart(joinId)
      addToast({ type: 'success', title: 'เข้าร่วมตะกร้ากลุ่มแล้ว' })
    }
  }, [user, collabCart, addToast])

  const handleShareCart = async () => {
    if (!user || isGuest) {
      addToast({ type: 'error', title: 'ไม่สามารถแชร์ได้', message: 'กรุณาเข้าสู่ระบบก่อน' })
      return
    }
    let cartId = collabCart.cart?.id
    if (!cartId) {
      cartId = (await collabCart.createCart()) || undefined
    }
    if (cartId) {
      const link = `${window.location.origin}/cart?join=${cartId}`
      navigator.clipboard.writeText(link)
      addToast({ type: 'success', title: 'คัดลอกลิงก์แชร์ตะกร้าแล้ว' })
    }
  }

  const handleRemoveItem = (itemId: string, itemName: string) => {
    console.log('🗑️ Removing item:', itemName)
    hapticMedium()
    removeItem(itemId)
    addToast({
      type: 'info',
      title: 'ลบรายการแล้ว',
      message: itemName,
    })
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    hapticLight()
    if (newQuantity <= 0) {
      const item = items.find(i => i.id === itemId)
      if (item) {
        handleRemoveItem(itemId, item.menuItem.name)
      }
    } else {
      console.log('📝 Updating quantity:', itemId, '→', newQuantity)
      updateQuantity(itemId, newQuantity)
    }
  }

  const handleClearCart = () => {
    setShowClearConfirm(true)
  }

  const confirmClearCart = () => {
    console.log('🧹 Clearing cart')
    hapticMedium()
    clearCart()
    setShowClearConfirm(false)
    addToast({
      type: 'info',
      title: 'ล้างตะกร้าแล้ว',
    })
  }

  const handleCheckout = () => {
    console.log('💳 Proceeding to checkout')
    navigate('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface safe-area-pt">
        <Container className="py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 mb-8 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>กลับ</span>
          </button>

          <EmptyState
            type="cart"
            onAction={() => navigate('/')}
          />
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface safe-area-pt pb-32">
      <Container className="py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black text-gray-800">ตะกร้าสินค้า</h1>
          </div>
          <div className="flex items-center gap-2">
            {!collabCart.isConnected && items.length > 0 && (
              <ShareCartButton onClick={handleShareCart} />
            )}
            <button
              onClick={handleClearCart}
              className="text-red-500 text-sm font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              ล้างตะกร้า
            </button>
          </div>
        </div>

        {/* Collaborative Avatars */}
        {collabCart.isConnected && (
          <div className="flex items-center justify-between mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <CollaborativeCartBadge count={collabCart.connectedUsers.length} />
              <div className="flex items-center -space-x-2">
                {collabCart.connectedUsers.map(u => <UserAvatar key={u.id} user={u} />)}
              </div>
            </div>
            <button onClick={handleShareCart} className="text-brand-600 font-bold text-xs px-3 py-2 bg-white rounded-lg shadow-sm border border-brand-100 active:scale-95 transition-transform">
              คัดลอกลิงก์
            </button>
          </div>
        )}

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Cart Items */}
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">
                  รายการอาหาร ({items.reduce((sum, i) => sum + i.quantity, 0)} รายการ)
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="p-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex gap-4">
                      <img
                        src={getValidImageUrl(item.menuItem.imageUrl)}
                        alt={item.menuItem.name}
                        className="w-20 h-20 rounded-xl object-cover bg-gray-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getValidImageUrl(null)
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-800 text-sm line-clamp-1">
                            {item.menuItem.name}
                          </h3>
                          <button
                            onClick={() => handleRemoveItem(item.id, item.menuItem.name)}
                            className="text-gray-400 hover:text-red-500 p-1 transition-colors active:scale-90"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Options */}
                        {item.selectedOptions.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {item.selectedOptions.map(o => o.name).join(', ')}
                          </p>
                        )}

                        {/* Note */}
                        {item.note && (
                          <p className="text-xs text-amber-600 mt-1 line-clamp-1">
                            หมายเหตุ: {item.note}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-gray-100 rounded-lg">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition-colors active:scale-90"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-bold text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition-colors active:scale-90"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Price */}
                          <span className="font-bold text-brand-600">
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Delivery Method */}
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">วิธีรับอาหาร</h2>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => {
                    setDeliveryMethod('workplace')
                    hapticLight()
                  }}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98]',
                    deliveryMethod === 'workplace'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    deliveryMethod === 'workplace' ? 'bg-brand-500 text-white' : 'bg-gray-100'
                  )}>
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-gray-800">ส่งที่ทำงาน</p>
                    <p className="text-sm text-gray-500">ในวันทำการถัดไป</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDeliveryMethod('village')
                    hapticLight()
                  }}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98]',
                    deliveryMethod === 'village'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    deliveryMethod === 'village' ? 'bg-brand-500 text-white' : 'bg-gray-100'
                  )}>
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-gray-800">ส่งในหมู่บ้าน</p>
                    <p className="text-sm text-gray-500">กรุณาระบุบ้านเลขที่และซอย</p>
                  </div>
                </button>
              </div>
            </Card>
          </motion.div>

          {/* Points Redemption (for logged in users) */}
          {!isGuest && user && user.points > 0 && (
            <motion.div variants={fadeInUp}>
              <Card>
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    ใช้พอยต์
                  </h2>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800">คุณมี {user.points.toLocaleString()} พอยต์</p>
                      <p className="text-xs text-gray-500">ใช้ 10 พอยต์ = ลด 1 บาท</p>
                    </div>
                    {pointsUsed > 0 && (
                      <button
                        onClick={() => useCartStore.getState().setPointsUsed(0)}
                        className="text-sm text-red-500 hover:text-red-600 active:scale-95"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {[10, 50, 100, 500].map((points) => (
                      <button
                        key={points}
                        disabled={user.points < points}
                        onClick={() => {
                          hapticLight()
                          useCartStore.getState().setPointsUsed(
                            pointsUsed === points ? 0 : points
                          )
                        }}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95',
                          pointsUsed === points
                            ? 'bg-amber-500 text-white'
                            : user.points >= points
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                      >
                        {points}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Coupon Code */}
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-brand-500" />
                  โค้ดส่วนลด
                </h2>
              </div>
              <div className="p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="กรอกโค้ดส่วนลด"
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm uppercase"
                  />
                  <Button variant="outline" size="default">
                    ใช้โค้ด
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Smart Upsell Recommendations */}
          <motion.div variants={fadeInUp}>
            <SmartUpsell />
          </motion.div>

          {/* Order Summary */}
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">สรุปยอดชำระ</h2>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ยอดรวม ({items.reduce((sum, i) => sum + i.quantity, 0)} รายการ)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">ส่วนลด</span>
                    <span className="text-green-600">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {pointsUsed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">ใช้พอยต์ ({pointsUsed})</span>
                    <span className="text-green-600">-{formatPrice(pointsUsed / 10)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
                  <span>ยอดสุทธิ</span>
                  <span className="text-brand-600">{formatPrice(finalTotal)}</span>
                </div>

                {/* Points to earn */}
                {!isGuest && (
                  <p className="text-xs text-amber-600 mt-2">
                    คุณจะได้รับ {Math.floor(finalTotal / 10)} พอยต์จากการสั่งซื้อนี้
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </Container>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-pb z-40">
        <Container>
          <Button
            size="lg"
            fullWidth
            onClick={handleCheckout}
          >
            ดำเนินการสั่งซื้อ {formatPrice(finalTotal)}
          </Button>

          {isGuest && (
            <button
              onClick={() => navigate('/profile')}
              className="w-full mt-2 text-sm text-orange-600 font-medium py-2 active:scale-95 transition-transform"
            >
              หรือ เข้าสู่ระบบเพื่อสะสมแต้ม
            </button>
          )}
        </Container>
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ล้างตะกร้าสินค้า?</h3>
              <p className="text-sm text-gray-500">
                ต้องการล้างตะกร้าสินค้าทั้งหมดหรือไม่?
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowClearConfirm(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                fullWidth
                onClick={confirmClearCart}
              >
                ล้างตะกร้า
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
