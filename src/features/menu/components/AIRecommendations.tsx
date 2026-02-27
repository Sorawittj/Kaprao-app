import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useMenuStore, useAuthStore } from '@/store'
import { recommendationEngine } from '@/features/ai/hooks/useAIRecommendations'
import { useMenuItems } from '../hooks/useMenu'
import type { AIRecommendation } from '@/types'
import { getValidImageUrl } from '@/utils/getImageUrl'

export function AIRecommendations() {
  const { user } = useAuthStore()
  const { viewedItemIds } = useMenuStore()
  const { data: menuItems } = useMenuItems()
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [isVisible, setIsVisible] = useState(true)
  const [, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || !menuItems) return

    const loadRecommendations = async () => {
      setIsLoading(true)
      try {
        // Get recommendations from AI service
        await recommendationEngine.initialize()
        const AI_recs = await recommendationEngine.getRecommendations(
          user,
          [],
          menuItems,
          3
        )

        const mappedRecs = AI_recs.map(r => ({
          menuItem: r.item,
          reason: r.reasons[0] || 'เมนูแนะนำสำหรับคุณ',
          confidence: r.confidence,
          basedOn: []
        }))

        setRecommendations(mappedRecs)
      } finally {
        setIsLoading(false)
      }
    }

    // Delay showing recommendations
    const timer = setTimeout(loadRecommendations, 1500)
    return () => clearTimeout(timer)
  }, [user, menuItems, viewedItemIds])

  if (!isVisible || recommendations.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 text-white"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold">แนะนำสำหรับคุณ</h3>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.menuItem.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex gap-3"
            >
              <img
                src={getValidImageUrl(rec.menuItem.imageUrl)}
                alt={rec.menuItem.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate">{rec.menuItem.name}</h4>
                <p className="text-xs text-white/80 line-clamp-2 mt-1">
                  {rec.reason}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
