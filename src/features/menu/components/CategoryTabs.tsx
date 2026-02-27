import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useMenuStore } from '@/store'
import { categories } from '../api/menuApi'
import { cn } from '@/utils/cn'
import { hapticLight } from '@/utils/haptics'

const iconMap: Record<string, string> = {
  heart: '❤️',
  'pepper-hot': '🌶️',
  utensils: '🍽️',
  'bread-slice': '🧄',
  'bowl-food': '🥘',
  bacon: '🍜',
  'mug-hot': '🍲',
  'utensil-spoon': '🥄',
  'ice-cream': '🍨',
  tags: '🏷️',
  egg: '🍳',
  shrimp: '🦐',
  rice: '🍚',
  bamboo: '🎋',
}

// Map color names to actual gradient values
const categoryGradientMap: Record<string, [string, string]> = {
  red: ['#EF4444', '#F87171'],
  orange: ['#FF6B00', '#FB923C'],
  yellow: ['#F59E0B', '#FBBF24'],
  amber: ['#D97706', '#F59E0B'],
  emerald: ['#059669', '#34D399'],
  pink: ['#EC4899', '#F472B6'],
  purple: ['#059669', '#C084FC'],
  gray: ['#4B5563', '#9CA3AF'],
}

export function CategoryTabs() {
  const { activeCategory, setActiveCategory } = useMenuStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative">
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgb(250 250 249), transparent)' }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgb(250 250 249), transparent)' }}
      />

      {/* Tabs */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto hide-scrollbar py-1.5 px-2"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category.id
          const [colorStart, colorEnd] = categoryGradientMap[category.color] || ['#FF6B00', '#FB923C']

          return (
            <motion.button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id)
                hapticLight()
                // Scroll this tab into view
                const btn = document.getElementById(`cat-${category.id}`)
                btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
              }}
              id={`cat-${category.id}`}
              whileTap={{ scale: 0.93 }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-2xl whitespace-nowrap flex-shrink-0',
                'transition-all duration-300 font-bold text-sm',
                'border-2',
                isActive
                  ? 'text-white border-transparent shadow-lg'
                  : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 shadow-sm'
              )}
              style={
                isActive
                  ? {
                    background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})`,
                    boxShadow: `0 6px 20px -4px ${colorStart}60`,
                  }
                  : undefined
              }
            >
              {/* Animated icon */}
              <motion.span
                animate={isActive ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.4 }}
                className="text-base leading-none"
              >
                {iconMap[category.icon]}
              </motion.span>

              <span className={isActive ? 'font-black' : 'font-semibold'}>
                {category.name}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
