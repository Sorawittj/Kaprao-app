import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList,
  Flame,
  CheckCircle,
  Coins,
  TrendingUp,
  Users,
  RefreshCw,
  ChefHat,
  Utensils,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  AlertCircle
} from 'lucide-react'
import { useAdminStats, useRecentActivity, useTopSellingItems } from '@/features/admin/hooks/useAdmin'
import { Card } from '@/components/ui/Card'
import { useAllOrdersRealtime } from '@/features/orders/hooks/useOrders'
import { staggerContainer, fadeInUp } from '@/animations/variants'
import { formatPrice } from '@/utils/formatPrice'
import { trackPageView } from '@/lib/analytics'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { RecentActivity, TopSellingItem } from '@/types'
import { getValidImageUrl } from '@/utils/getImageUrl'



export default function AdminDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')

  const { data: stats, isLoading, refetch } = useAdminStats(selectedPeriod)
  const { data: activities } = useRecentActivity(10)
  const { data: topItems } = useTopSellingItems(5)

  // Subscribe to realtime order updates
  useAllOrdersRealtime()

  useEffect(() => {
    trackPageView('/admin', 'Admin Dashboard')
  }, [])

  const handleRefresh = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all() })
  }

  // Calculate trends
  const trends = useMemo(() => {
    if (!stats) return null
    return {
      revenue: stats.todayRevenue > stats.yesterdayRevenue ? 'up' : 'down',
      revenuePercent: stats.yesterdayRevenue > 0
        ? Math.round(((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100)
        : 0,
      orders: stats.totalOrdersToday > 0 ? 'up' : 'stable',
    }
  }, [stats])

  // Chart data - fetch from API or generate sample
  const revenueChartData = useMemo(() => {
    if (stats?.chartData) return stats.chartData
    // Sample data if not available
    return [
      { label: '08:00', value: 1200 },
      { label: '10:00', value: 2500 },
      { label: '12:00', value: 4800 },
      { label: '14:00', value: 3200 },
      { label: '16:00', value: 2100 },
      { label: '18:00', value: 4500 },
    ]
  }, [stats])

  const statCards = [
    {
      title: 'ออเดอร์ใหม่',
      value: stats?.pendingOrders || 0,
      icon: ClipboardList,
      color: 'bg-amber-100 text-amber-600',
      trend: '+12%',
      hasAction: true,
      onClick: () => navigate('/admin/orders?status=placed')
    },
    {
      title: 'กำลังทำ',
      value: stats?.cookingOrders || 0,
      icon: Flame,
      color: 'bg-orange-100 text-orange-600',
      trend: '+5%',
      hasAction: true,
      onClick: () => navigate('/admin/orders?status=preparing')
    },
    {
      title: 'พร้อมเสิร์ฟ',
      value: stats?.readyOrders || 0,
      icon: Package,
      color: 'bg-blue-100 text-blue-600',
      trend: stats?.readyOrders && stats.readyOrders > 0 ? 'รอรับ' : '-',
      hasAction: true,
      onClick: () => navigate('/admin/orders?status=ready')
    },
    {
      title: 'เสร็จสิ้นวันนี้',
      value: stats?.completedOrders || 0,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
      trend: '+23%',
      hasAction: true,
      onClick: () => navigate('/admin/orders?status=delivered')
    },
  ]

  const revenueCards = [
    {
      title: 'รายได้วันนี้',
      value: formatPrice(stats?.todayRevenue || 0),
      icon: Coins,
      color: 'bg-emerald-100 text-emerald-600',
      trend: trends?.revenue === 'up' ? `+${trends.revenuePercent}%` : `${trends?.revenuePercent || 0}%`,
      trendUp: trends?.revenue === 'up',
      subtitle: 'เทียบกับเมื่อวาน'
    },
    {
      title: 'รายได้สัปดาห์นี้',
      value: formatPrice(stats?.weekRevenue || 0),
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600',
      trend: '+15%',
      trendUp: true,
      subtitle: 'สะสม 7 วัน'
    },
    {
      title: 'รายได้เดือนนี้',
      value: formatPrice(stats?.monthRevenue || 0),
      icon: BarChart3,
      color: 'bg-indigo-100 text-indigo-600',
      trend: '+8%',
      trendUp: true,
      subtitle: 'สะสม 30 วัน'
    },
    {
      title: 'ลูกค้าใหม่วันนี้',
      value: stats?.newCustomersToday || 0,
      icon: Users,
      color: 'bg-pink-100 text-pink-600',
      trend: '+5',
      trendUp: true,
      subtitle: 'คน'
    },
  ]

  const quickActions = [
    {
      label: 'ดูออเดอร์',
      icon: Utensils,
      color: 'bg-blue-500',
      action: () => navigate('/admin/orders'),
      badge: stats?.pendingOrders || 0
    },
    {
      label: 'จัดการเมนู',
      icon: ChefHat,
      color: 'bg-orange-500',
      action: () => navigate('/admin/menu')
    },
    {
      label: 'ลูกค้า',
      icon: Users,
      color: 'bg-green-500',
      action: () => navigate('/admin/customers')
    },
    {
      label: 'รายงาน',
      icon: BarChart3,
      color: 'bg-purple-500',
      action: () => navigate('/admin/reports')
    },
  ]

  // Status breakdown for pie chart
  const statusData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'รอดำเนินการ', value: stats.pendingOrders, color: '#f59e0b' },
      { name: 'กำลังทำ', value: stats.cookingOrders, color: '#f97316' },
      { name: 'พร้อมเสิร์ฟ', value: stats.readyOrders, color: '#3b82f6' },
      { name: 'เสร็จสิ้น', value: stats.completedOrders, color: '#22c55e' },
    ].filter(d => d.value > 0)
  }, [stats])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ภาพรวมร้านค้า</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('th-TH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            {(['today', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedPeriod === period
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {period === 'today' && 'วันนี้'}
                {period === 'week' && 'สัปดาห์'}
                {period === 'month' && 'เดือน'}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Order Status Stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.title}
            variants={fadeInUp}
            onClick={stat.onClick}
            className={stat.hasAction ? 'cursor-pointer' : ''}
          >
            <Card isHoverable={!!stat.onClick}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  {stat.trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+')
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-50 text-gray-500'
                      }`}>
                      {stat.trend}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                  {stat.title}
                </p>
                <p className="text-2xl font-black text-gray-800 mt-1">
                  {isLoading ? '-' : stat.value}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Revenue Stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {revenueCards.map((stat) => (
          <motion.div key={stat.title} variants={fadeInUp}>
            <Card>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold ${stat.trendUp ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                </div>
                <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                <p className="text-xl font-black text-gray-800 mt-1">{isLoading ? '-' : stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp} initial="hidden" animate="visible">
        <h3 className="font-bold text-gray-800 mb-4">ทำงานด่วน</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-brand-200 hover:shadow-soft transition-all text-center group relative"
            >
              {item.badge ? (
                <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="lg:col-span-2">
          <Card>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">กราฟรายได้</h3>
                <p className="text-sm text-gray-500">แนวโน้มรายได้ตามช่วงเวลา</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-brand-500"></span>
                <span className="text-sm text-gray-500">รายได้</span>
              </div>
            </div>
            <div className="p-5">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `฿${value}`} />
                    <Tooltip
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Order Status Distribution */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">สถานะออเดอร์</h3>
              <p className="text-sm text-gray-500">การกระจายตามสถานะ</p>
            </div>
            <div className="p-5">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Top Selling Items & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">เมนูขายดี</h3>
                <p className="text-sm text-gray-500">5 อันดับยอดนิยม</p>
              </div>
              <button
                onClick={() => navigate('/admin/menu')}
                className="text-sm text-brand-600 font-bold hover:underline"
              >
                ดูทั้งหมด
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {topItems?.map((item, index) => (
                <TopSellingItemRow key={item.id} item={item} index={index} />
              ))}
              {!topItems?.length && (
                <div className="p-8 text-center text-gray-400">
                  <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>ยังไม่มีข้อมูลการขาย</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">กิจกรรมล่าสุด</h3>
              <p className="text-sm text-gray-500">อัพเดตแบบเรียลไทม์</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              <AnimatePresence>
                {activities?.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </AnimatePresence>
              {!activities?.length && (
                <div className="p-8 text-center text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>ยังไม่มีกิจกรรมล่าสุด</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// Top Selling Item Component
function TopSellingItemRow({ item, index }: { item: TopSellingItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-600' :
        index === 1 ? 'bg-gray-200 text-gray-600' :
          index === 2 ? 'bg-orange-100 text-orange-600' :
            'bg-gray-100 text-gray-500'
        }`}>
        {index + 1}
      </div>
      <img
        src={getValidImageUrl(item.imageUrl) || '/placeholder-food.jpg'}
        alt={item.name}
        className="w-12 h-12 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 truncate">{item.name}</p>
        <p className="text-xs text-gray-500">{item.category}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-brand-600">{formatPrice(item.revenue)}</p>
        <p className="text-xs text-gray-500">{item.totalSold} ที่สั่ง</p>
      </div>
    </motion.div>
  )
}

// Activity Item Component
function ActivityItem({ activity }: { activity: RecentActivity }) {
  const icons = {
    order: ClipboardList,
    customer: Users,
    menu: ChefHat,
    system: AlertCircle
  }

  const colors = {
    order: 'bg-blue-100 text-blue-600',
    customer: 'bg-green-100 text-green-600',
    menu: 'bg-orange-100 text-orange-600',
    system: 'bg-gray-100 text-gray-600'
  }

  const Icon = icons[activity.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl ${colors[activity.type]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm">{activity.title}</p>
        <p className="text-sm text-gray-500 truncate">{activity.description}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(activity.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}
