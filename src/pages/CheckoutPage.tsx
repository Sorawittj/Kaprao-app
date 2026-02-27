import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  MapPin,
  Truck,
  Banknote,
  QrCode,
  Check,
  AlertCircle,
  User,
  Sparkles,
  Gift
} from 'lucide-react'
import { useCartStore, useAuthStore, useUIStore } from '@/store'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatPrice } from '@/utils/formatPrice'
import { staggerContainer, fadeInUp } from '@/animations/variants'
import { useAddPoints, usePointsCalculator } from '@/features/points/hooks/usePoints'

import type { Order } from '@/types'
import { cn } from '@/utils/cn'
import confetti from 'canvas-confetti'
import { buildLineOrderMessage, getThaiLotteryDrawDate, redirectToLineOA } from '@/utils/buildLineMessage'
// ✅ Unified Order System v2.0
import {
  createUnifiedOrder,
  getOrCreateGuestIdentity,
} from '@/features/v2/api/unifiedOrderApi'
import { GuestConversionPanel } from '@/features/v2/components/GuestConversionPanel'
import { CouponInputCompact } from '@/features/coupons/components/CouponInput'

// Payment method option component
function PaymentOption({
  method,
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  method: 'cod' | 'transfer' | 'promptpay'
  selected: string
  onSelect: (m: 'cod' | 'transfer' | 'promptpay') => void
  icon: React.ElementType
  title: string
  description: string
}) {
  const isSelected = selected === method

  return (
    <button
      onClick={() => onSelect(method)}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98]',
        isSelected
          ? 'border-brand-500 bg-brand-50'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center',
        isSelected ? 'bg-brand-500 text-white' : 'bg-gray-100'
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-left flex-1">
        <p className="font-bold text-gray-800">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {isSelected && <Check className="w-5 h-5 text-brand-500" />}
    </button>
  )
}

// Order success component
function OrderSuccess({ order, onContinue }: { order: Order; onContinue: () => void }) {
  const navigate = useNavigate()
  const { isGuest } = useAuthStore()
  const { addToast } = useUIStore()
  const { calculateEarned } = usePointsCalculator()
  const pointsMissed = calculateEarned(order.totalPrice)

  // Slip upload state
  const [isUploading, setIsUploading] = useState(false)
  const [slipUrl, setSlipUrl] = useState<string | null>(order.paymentSlipUrl || null)

  // Get lotto number (queue display suffix or order id suffix)
  const lottoNumber = String(order.id).slice(-2).padStart(2, '0')
  const ticketsEarned = Math.floor(order.totalPrice / 100)

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { uploadPaymentSlip } = await import('@/lib/storage')
      const url = await uploadPaymentSlip(order.id, file)
      setSlipUrl(url)
      addToast({
        type: 'success',
        title: 'อัปโหลดสำเร็จ',
        message: 'ได้รับสลิปเรียบร้อยแล้ว แอดมินจะตรวจสอบโดยเร็วที่สุด',
      })
    } catch (err) {
      console.error('Slip upload error:', err)
      addToast({
        type: 'error',
        title: 'อัปโหลดไม่สำเร็จ',
        message: 'กรุณาลองใหม่อีกครั้ง หรือส่งทาง LINE',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 pb-20 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 mt-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Check className="w-12 h-12 text-green-600" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-black text-gray-800 mb-2"
        >
          สั่งซื้อสำเร็จ!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 mb-6"
        >
          ออเดอร์ #{order.id} ของคุณได้รับการบันทึกแล้ว
        </motion.p>

        {/* 💳 Payment QR & Slip Upload Section (World-Class UI) */}
        {(order.paymentMethod === 'promptpay' || order.paymentMethod === 'transfer') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-8"
          >
            <div className="bg-white rounded-3xl p-6 border-2 border-brand-100 shadow-xl shadow-brand-500/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3">
                <QrCode className="w-6 h-6 text-brand-200" />
              </div>

              <h3 className="font-black text-lg text-brand-600 mb-4 flex items-center justify-center gap-2">
                <Banknote className="w-5 h-5" />
                ชำระเงินผ่านพร้อมเพย์
              </h3>

              {/* QR Code Placeholder / Generator */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex flex-col items-center">
                <div className="w-48 h-48 bg-white rounded-xl shadow-inner flex items-center justify-center relative border border-gray-100 group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021129370016A00000067701011101130066XXXXXXXXX263801120000000000005204581453037645802TH6304`}
                    alt="PromptPay QR Code"
                    className="w-44 h-44"
                  />
                  <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 text-xs font-bold text-gray-600 text-center">
                    สแกนเพื่อโอนเงิน {formatPrice(order.totalPrice)}
                  </div>
                </div>
                <p className="mt-3 font-bold text-gray-700">0XX-XXX-XXXX</p>
                <p className="text-xs text-gray-400">ชื่อบัญชี: ร้านกะเพรา 52 (นายxxxx)</p>
              </div>

              {/* Slip Upload */}
              {!slipUrl ? (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipUpload}
                    disabled={isUploading}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <Button
                    variant="outline"
                    fullWidth
                    isLoading={isUploading}
                    className="border-dashed border-2 hover:bg-brand-50"
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    แนบสลิปเพื่อยืนยัน
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-full">
                    <Check className="w-4 h-4" />
                    แนบสลิปเรียบร้อยแล้ว
                  </div>
                  <button
                    onClick={() => setSlipUrl(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    เปลี่ยนรูปสลิป
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 🌟 Guest Conversion Panel v2.0 🌟 */}
        {isGuest && pointsMissed > 0 && (
          <GuestConversionPanel
            pointsToEarn={pointsMissed}
            ticketsToEarn={ticketsEarned}
            lottoNumber={lottoNumber}
            onLogin={async () => {
              try {
                // Ensure guest identity is created and saved
                const guestIdentity = getOrCreateGuestIdentity()
                // Save to localStorage for sync after login
                localStorage.setItem('kaprao_guest_identity', JSON.stringify(guestIdentity))
                const { loginWithLine } = await import('@/lib/auth')
                await loginWithLine()
              } catch (e) {
                console.error('Failed LINE login:', e)
              }
            }}
            variant="success"
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isGuest ? 0.6 : 0.5 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft mb-6 text-left"
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">ชื่อผู้สั่ง</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ยอดรวม</span>
              <span className="font-bold text-brand-600">{formatPrice(order.totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">วิธีชำระเงิน</span>
              <span className="font-medium">
                {order.paymentMethod === 'cod' && 'เงินสด'}
                {order.paymentMethod === 'transfer' && 'โอนเงิน'}
                {order.paymentMethod === 'promptpay' && 'พร้อมเพย์'}
              </span>
            </div>
            {order.pointsEarned > 0 && !isGuest && (
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="text-gray-500">ได้รับแต้ม</span>
                <span className="font-bold text-green-600">+{order.pointsEarned} พอยต์</span>
              </div>
            )}
            {isGuest && (
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="text-gray-500">การติดตามสถานะ</span>
                <span className="font-medium text-blue-600">กดดูรายละเอียดด้านล่าง</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isGuest ? 0.7 : 0.6 }}
          className="space-y-3"
        >
          <Button fullWidth onClick={() => navigate(`/orders/${order.id}${order.trackingToken ? `?token=${order.trackingToken}` : ''}`)}>
            ดูรายละเอียดออเดอร์
          </Button>
          <Button variant="outline" fullWidth onClick={onContinue}>
            ดูรายการสั่งซื้อทั้งหมด
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuthStore()
  const { addToast } = useUIStore()
  const {
    items,
    finalTotal,
    subtotal,
    discountAmount,
    pointsUsed,
    deliveryMethod,
    setDeliveryMethod,
    clearCart,
    applyCoupon,
    removeCoupon,
    couponCode
  } = useCartStore()

  const { mutateAsync: addPoints } = useAddPoints()
  const { calculateEarned } = usePointsCalculator()

  // Form state
  const [customerName, setCustomerName] = useState(user?.displayName || (isGuest ? 'Guest' : ''))
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'transfer' | 'promptpay'>('cod')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Points calculation
  const pointsToEarn = calculateEarned(finalTotal)
  const ticketsToEarn = Math.floor(finalTotal / 100)

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !showSuccess) {
      console.log('🛒 Cart empty, redirecting to /cart')
      navigate('/cart')
    }
  }, [items.length, navigate, showSuccess])

  const handlePlaceOrder = useCallback(async () => {
    console.log('📝 Placing order with Unified Order System v2...')

    // Validation
    if (deliveryMethod === 'village' && !customerName.trim()) {
      addToast({
        type: 'error',
        title: 'กรุณากรอกชื่อ',
        message: 'ชื่อผู้สั่งซื้อจำเป็นต้องกรอกเมื่อจัดส่งในหมู่บ้าน',
      })
      return
    }

    if (deliveryMethod === 'workplace' && !user?.displayName && !customerName.trim()) {
      addToast({
        type: 'error',
        title: 'กรุณากรอกชื่อ',
        message: 'กรุณาระบุชื่อผู้สั่งซื้อ',
      })
      return
    }

    if (deliveryMethod === 'village' && !address.trim()) {
      addToast({
        type: 'error',
        title: 'กรุณากรอกที่อยู่',
        message: 'กรุณาระบุบ้านเลขที่และซอย',
      })
      return
    }

    if (deliveryMethod === 'village' && !phoneNumber.trim()) {
      addToast({
        type: 'error',
        title: 'กรุณากรอกเบอร์โทร',
        message: 'เบอร์โทรศัพท์จำเป็นต้องกรอกเมื่อจัดส่งในหมู่บ้าน',
      })
      return
    }

    setIsProcessing(true)

    try {
      // ✅ Get or create guest identity for non-logged in users
      let guestId: string | undefined
      let userId: string | undefined
      let lineUserId: string | undefined

      if (user?.id) {
        // Member mode
        userId = user.id
        lineUserId = user.lineUserId
        console.log('👤 Member order:', userId)
      } else {
        // Guest mode - create/get persistent guest identity
        const guestIdentity = getOrCreateGuestIdentity()
        guestId = guestIdentity.id
        console.log('👤 Guest order:', guestId)
      }

      // ✅ Use Unified Order API v2
      const unifiedOrder = await createUnifiedOrder({
        guestId,
        userId,
        lineUserId,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        items: items.map(item => ({
          id: item.id,
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity,
          options: item.selectedOptions.map(opt => ({
            optionId: opt.optionId,
            name: opt.name,
            price: opt.price,
          })),
          note: item.note,
          subtotal: item.subtotal,
        })),
        subtotalPrice: subtotal,
        discountAmount: discountAmount,
        discountCode: couponCode || undefined,
        pointsRedeemed: pointsUsed,
        totalPrice: finalTotal,
        paymentMethod: paymentMethod,
        deliveryMethod: deliveryMethod,
        address: deliveryMethod === 'village' ? address.trim() : undefined,
        specialInstructions: specialInstructions.trim() || undefined,
      })

      console.log('✅ Unified order created:', unifiedOrder)
      console.log('🎫 Queue number:', unifiedOrder.queue?.display)

      // Convert UnifiedOrder to legacy Order type for compatibility
      const order: Order = {
        id: unifiedOrder.id,
        userId: unifiedOrder.userId,
        lineUserId: unifiedOrder.lineUserId,
        customerName: unifiedOrder.customerName,
        phoneNumber: unifiedOrder.phoneNumber,
        address: unifiedOrder.address,
        deliveryMethod: unifiedOrder.deliveryMethod,
        specialInstructions: unifiedOrder.specialInstructions,
        items: unifiedOrder.items.map(item => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          options: item.options.map(opt => ({
            optionId: opt.optionId,
            name: opt.name,
            price: opt.price,
          })),
          note: item.note || '',
          subtotal: item.subtotal,
        })),
        status: unifiedOrder.status as Order['status'],
        totalPrice: unifiedOrder.totalPrice,
        subtotalPrice: unifiedOrder.subtotalPrice,
        discountAmount: unifiedOrder.discountAmount,
        discountCode: unifiedOrder.discountCode,
        pointsRedeemed: unifiedOrder.pointsRedeemed,
        pointsEarned: unifiedOrder.pointsEarned,
        paymentMethod: unifiedOrder.paymentMethod,
        paymentStatus: unifiedOrder.paymentStatus,
        trackingToken: undefined, // Will be handled by guest_id system
        createdAt: unifiedOrder.createdAt,
        updatedAt: unifiedOrder.updatedAt,
        estimatedReadyTime: unifiedOrder.estimatedReadyTime,
      }

      // ✅ Add points for logged in users immediately
      if (user?.id && pointsToEarn > 0) {
        try {
          console.log('⭐ Adding points for member:', pointsToEarn)
          await addPoints({
            userId: user.id,
            amount: pointsToEarn,
            action: 'EARN',
            note: `สั่งซื้อออเดอร์ #${order.id}`,
            orderId: order.id,
          })
        } catch (e) {
          console.error('⚠️ Error adding points:', e)
        }
      }

      // Note: Lottery tickets are generated automatically by the database trigger
      // tr_create_lotto_ticket on the orders table. No need for manual generation here.


      setCreatedOrder(order)
      clearCart()

      // Update local order count
      useAuthStore.getState().incrementOrderCount()

      // Update gamification engine
      const targetId = user?.id || guestId
      if (targetId) {
        import('@/features/gamification/GamificationEngine').then(m => {
          const gameEngine = m.getUserGamification(targetId)
          gameEngine.recordOrder()
        })
      }

      setShowSuccess(true)

      // Trigger confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B00', '#22C55E', '#10B981'],
      })

      addToast({
        type: 'success',
        title: 'สั่งซื้อสำเร็จ!',
        message: unifiedOrder.queue?.display
          ? `ออเดอร์ #${order.id} - คิว ${unifiedOrder.queue.display}`
          : `ออเดอร์ #${order.id} ของคุณได้รับการบันทึกแล้ว`,
      })

      // Build and send LINE message
      const drawDate = getThaiLotteryDrawDate()
      const isGuestUser = !user?.lineUserId
      const lineMessage = buildLineOrderMessage({
        order,
        lottoNumber: unifiedOrder.queue?.display?.slice(-2) || String(order.id).slice(-2).padStart(2, '0'),
        drawDate,
        isGuest: isGuestUser,
        pointsEarned: pointsToEarn,
        ticketsEarned: ticketsToEarn,
      })

      // Delay redirect to let user see success screen
      setTimeout(async () => {
        console.log('📱 Redirecting to LINE OA...')
        await redirectToLineOA(lineMessage)
      }, 2000)

    } catch (error) {
      console.error('❌ Order creation error:', error)
      addToast({
        type: 'error',
        title: 'สั่งซื้อไม่สำเร็จ',
        message: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
      })
    } finally {
      setIsProcessing(false)
    }
  }, [addPoints, addToast, address, clearCart, couponCode, customerName, deliveryMethod, discountAmount, finalTotal, items, paymentMethod, phoneNumber, pointsToEarn, pointsUsed, specialInstructions, subtotal, ticketsToEarn, user])

  if (showSuccess && createdOrder) {
    return <OrderSuccess order={createdOrder} onContinue={() => navigate('/orders')} />
  }

  return (
    <div className="min-h-screen bg-surface safe-area-pt pb-32">
      <Container className="py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-gray-800">ยืนยันการสั่งซื้อ</h1>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Customer Info */}
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-500" />
                  ข้อมูลผู้สั่งซื้อ
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อ-นามสกุล {deliveryMethod === 'village' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={user?.displayName ? user.displayName : (isGuest ? 'Guest' : 'กรอกชื่อของคุณ')}
                    readOnly={deliveryMethod === 'workplace' && !!user?.displayName}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none transition-all",
                      (deliveryMethod === 'workplace' && !!user?.displayName)
                        ? "bg-gray-50 text-gray-500 cursor-not-allowed"
                        : "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
                    )}
                  />
                </div>

                <AnimatePresence>
                  {deliveryMethod === 'village' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="เช่น 0812345678"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
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
                  onClick={() => setDeliveryMethod('workplace')}
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
                  {deliveryMethod === 'workplace' && <Check className="w-5 h-5 text-brand-500" />}
                </button>

                <button
                  onClick={() => setDeliveryMethod('village')}
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
                  {deliveryMethod === 'village' && <Check className="w-5 h-5 text-brand-500" />}
                </button>

                <AnimatePresence>
                  {deliveryMethod === 'village' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        บ้านเลขที่ ซอย (ที่อยู่จัดส่ง) <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="เช่น บ้านเลขที่ 99/99 ซอย 1"
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>

          {/* Payment Method */}
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">วิธีชำระเงิน</h2>
              </div>
              <div className="p-4 space-y-3">
                <PaymentOption
                  method="cod"
                  selected={paymentMethod}
                  onSelect={setPaymentMethod}
                  icon={Banknote}
                  title="เงินสด"
                  description="ชำระเงินสดเมื่อรับอาหาร"
                />
                <PaymentOption
                  method="promptpay"
                  selected={paymentMethod}
                  onSelect={setPaymentMethod}
                  icon={QrCode}
                  title="โอนเงินผ่านธนาคาร"
                  description="สแกน QR Code เพื่อชำระเงิน"
                />
              </div>
            </Card>
          </motion.div>

          {/* Special Instructions */}
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">หมายเหตุเพิ่มเติม</h2>
              </div>
              <div className="p-4">
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="เช่น ไม่ใส่ผัก ไม่เผ็ด ฯลฯ"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">โค้ดส่วนลด</h2>
              </div>
              <div className="p-4">
                <CouponInputCompact
                  orderTotal={subtotal}
                  menuItemIds={items.map(i => i.menuItem.id)}
                  onApply={(result) => applyCoupon(result.code, result.discount)}
                  onRemove={removeCoupon}
                  appliedCoupon={couponCode ? { couponId: 0, code: couponCode, name: couponCode, discount: discountAmount } : null}
                  disabled={isProcessing}
                />
              </div>
            </Card>
          </motion.div>

          {/* Rewards Preview (for logged in users) */}
          {!isGuest && user && (
            <motion.div variants={fadeInUp}>
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <div className="p-4">
                  <h2 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5" />
                    รางวัลที่จะได้รับ
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-700">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm">
                        รับ <strong>{pointsToEarn}</strong> พอยต์
                      </span>
                    </div>
                    {ticketsToEarn > 0 && (
                      <div className="flex items-center gap-2 text-amber-700">
                        <Gift className="w-4 h-4" />
                        <span className="text-sm">
                          รับ <strong>{ticketsToEarn}</strong> ตั๋วหวย
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

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
              </div>
            </Card>
          </motion.div>

          {/* Guest Incentive Banner v2.0 — shown BEFORE placing order */}
          {isGuest && (
            <motion.div variants={fadeInUp}>
              <GuestConversionPanel
                pointsToEarn={pointsToEarn}
                ticketsToEarn={ticketsToEarn}
                onLogin={async () => {
                  const { loginWithLine } = await import('@/lib/auth')
                  await loginWithLine()
                }}
                variant="checkout"
              />

              {/* Small reminder */}
              <div className="flex items-center gap-2 mt-2 px-1">
                <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                  สั่งแบบ Guest ได้เลย — login ทีหลังก็รับพอยต์ย้อนหลังได้
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </Container >

      {/* Fixed Bottom Button */}
      < div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-pb z-40" >
        <Container>
          <Button
            size="lg"
            fullWidth
            isLoading={isProcessing}
            onClick={handlePlaceOrder}
          >
            ยืนยันการสั่งซื้อ {formatPrice(finalTotal)}
          </Button>
        </Container>
      </div >
    </div >
  )
}
