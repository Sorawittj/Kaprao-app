import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, X, Sparkles, ChefHat, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useUIStore } from '@/store'
import type { MenuItem } from '@/types'
import { useMenuItems } from '@/features/menu/hooks/useMenu'
import { cn } from '@/utils/cn'
import { getValidImageUrl } from '@/utils/getImageUrl'

interface FoodRandomizerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: MenuItem) => void
}

const RANDOM_MESSAGES = [
  'กำลังเสี่ยงทาย...',
  'ดวงของคุณวันนี้...',
  'กำลังสืบเสาะความอร่อย...',
  'รอสักครู่ กำลังสุ่ม...',
  'จะได้กินอะไรน้า...',
]

export function FoodRandomizer({ isOpen, onClose, onSelect }: FoodRandomizerProps) {
  const { addToast } = useUIStore()
  const { data: menuItems, isLoading } = useMenuItems()
  const [isRandomizing, setIsRandomizing] = useState(false)
  const [displayItem, setDisplayItem] = useState<MenuItem | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [message, setMessage] = useState('คิดไม่ออก? ให้เราช่วยสุ่ม!')

  // Filter main dishes only
  const mainDishes = useMemo(() =>
    menuItems?.filter(item => item.isAvailable) || [],
    [menuItems]
  )

  const randomize = useCallback(() => {
    if (mainDishes.length === 0) return

    setIsRandomizing(true)
    setSelectedItem(null)
    setMessage(RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)])

    let iterations = 0
    const maxIterations = 20
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * mainDishes.length)
      setDisplayItem(mainDishes[randomIndex])
      iterations++

      if (iterations >= maxIterations) {
        clearInterval(interval)
        const finalIndex = Math.floor(Math.random() * mainDishes.length)
        const finalItem = mainDishes[finalIndex]
        setDisplayItem(finalItem)
        setSelectedItem(finalItem)
        setIsRandomizing(false)
        setMessage(`🎉 ดวงของคุณวันนี้คือ ${finalItem.name}!`)

        addToast({
          type: 'success',
          title: 'สุ่มสำเร็จ!',
          message: `วันนี้แนะนำ ${finalItem.name}`,
        })
      }
    }, 100)
  }, [mainDishes, addToast])

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem)
      onClose()
    }
  }

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setDisplayItem(null)
      setSelectedItem(null)
      setIsRandomizing(false)
      setMessage('คิดไม่ออก? ให้เราช่วยสุ่ม!')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl p-6 max-w-sm w-full relative overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center z-10 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl mb-3">
              <Shuffle className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-800">สุ่มเมนู</h2>
            <p className="text-sm text-gray-500 mt-1">คิดไม่ออก? ให้ดวงตัดสิน!</p>
          </div>

          {/* Display Area */}
          <div className="mb-6">
            <Card className={cn(
              'p-6 text-center transition-all duration-300',
              isRandomizing && 'animate-pulse'
            )}>
              {displayItem ? (
                <div className="space-y-4">
                  {/* Image */}
                  <div className="relative w-32 h-32 mx-auto">
                    <motion.div
                      key={displayItem.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full h-full rounded-2xl overflow-hidden bg-gray-100"
                    >
                      {displayItem.imageUrl ? (
                        <img
                          src={getValidImageUrl(displayItem.imageUrl)}
                          alt={displayItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                          🍱
                        </div>
                      )}
                    </motion.div>

                    {/* Sparkles when selected */}
                    {selectedItem && !isRandomizing && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center"
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <h3 className={cn(
                      'font-black text-xl transition-all',
                      isRandomizing ? 'text-gray-400 blur-sm' : 'text-gray-800'
                    )}>
                      {displayItem.name}
                    </h3>
                    <p className="text-brand-600 font-bold text-lg">
                      {displayItem.price} บาท
                    </p>
                  </div>

                  {/* Description */}
                  {!isRandomizing && selectedItem && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-gray-500"
                    >
                      {displayItem.description || 'เมนูยอดนิยมที่คุณไม่ควรพลาด!'}
                    </motion.p>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">พร้อมสุ่มเมนูอร่อย?</p>
                </div>
              )}
            </Card>

            {/* Status message */}
            <p className={cn(
              'text-center text-sm mt-4 font-medium transition-colors',
              isRandomizing ? 'text-brand-500' : 'text-gray-500'
            )}>
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!selectedItem ? (
              <Button
                onClick={randomize}
                disabled={isRandomizing || isLoading || mainDishes.length === 0}
                isLoading={isRandomizing}
                size="lg"
                fullWidth
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isRandomizing ? (
                  'กำลังสุ่ม...'
                ) : (
                  <>
                    <Shuffle className="w-5 h-5 mr-2" />
                    สุ่มเลย!
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSelect}
                  size="lg"
                  fullWidth
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  สั่งเมนูนี้เลย
                </Button>
                <Button
                  onClick={randomize}
                  variant="outline"
                  fullWidth
                  disabled={isRandomizing}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  สุ่มใหม่
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <p className="text-center text-xs text-gray-400 mt-4">
            มี {mainDishes.length} เมนูให้สุ่ม
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default FoodRandomizer
