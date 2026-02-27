import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Edit2, Eye, EyeOff, Trash2, X, Check,
  Image as ImageIcon, DollarSign,
  Star, ChefHat, Save, ArrowUpDown,
  AlertTriangle,
  Flame
} from 'lucide-react'
import { useMenuItems } from '@/features/menu/hooks/useMenu'
import { categories } from '@/features/menu/api/menuApi'
import {
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useToggleMenuItemAvailability
} from '@/features/admin/hooks/useAdmin'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MenuGridSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/app/providers/ToastProvider'
import { formatPrice } from '@/utils/formatPrice'
import { cn } from '@/utils/cn'
import type { MenuItem, CategoryType } from '@/types'
import { getValidImageUrl } from '@/utils/getImageUrl'

const categoryOptions = [
  { value: 'all', label: 'ทั้งหมด', icon: ChefHat },
  { value: 'favorites', label: 'ยอดนิยม', icon: Star },
  { value: 'kaprao', label: 'กะเพรา', icon: Flame },
  { value: 'curry', label: 'แกง', icon: ChefHat },
  { value: 'noodle', label: 'เส้น', icon: ChefHat },
  { value: 'bamboo', label: 'หน่อไม้', icon: ChefHat },
  { value: 'garlic', label: 'กระเทียม', icon: ChefHat },
  { value: 'others', label: 'อื่นๆ', icon: ChefHat },
]

interface MenuFormData {
  name: string
  description: string
  price: string
  category: CategoryType
  imageUrl: string
  isAvailable: boolean
  isRecommended: boolean
  requiresMeat: boolean
}

const initialFormData: MenuFormData = {
  name: '',
  description: '',
  price: '',
  category: 'kaprao',
  imageUrl: '',
  isAvailable: true,
  isRecommended: false,
  requiresMeat: true,
}

export default function AdminMenuPage() {
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState<MenuFormData>(initialFormData)
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: menuItems, isLoading } = useMenuItems()
  const createMutation = useCreateMenuItem()
  const updateMutation = useUpdateMenuItem()
  const deleteMutation = useDeleteMenuItem()
  const toggleAvailabilityMutation = useToggleMenuItemAvailability()

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (!menuItems) return []

    let items = menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && item.isAvailable) ||
        (availabilityFilter === 'unavailable' && !item.isAvailable)
      return matchesSearch && matchesCategory && matchesAvailability
    })

    // Sort
    items = [...items].sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'price') {
        comparison = a.price - b.price
      } else if (sortBy === 'category') {
        comparison = a.category.localeCompare(b.category)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return items
  }, [menuItems, searchQuery, selectedCategory, availabilityFilter, sortBy, sortOrder])

  // Stats
  const stats = useMemo(() => {
    if (!menuItems) return null
    return {
      total: menuItems.length,
      available: menuItems.filter(i => i.isAvailable).length,
      unavailable: menuItems.filter(i => !i.isAvailable).length,
      recommended: menuItems.filter(i => i.isRecommended).length,
    }
  }, [menuItems])

  const handleOpenModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        category: item.category,
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
        isRecommended: item.isRecommended,
        requiresMeat: item.requiresMeat,
      })
      setImagePreview(item.imageUrl || '')
    } else {
      setEditingItem(null)
      setFormData(initialFormData)
      setImagePreview('')
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData(initialFormData)
    setImagePreview('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, upload to storage and get URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const itemData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, updates: itemData })
        showToast({
          type: 'success',
          title: 'อัพเดตเมนูสำเร็จ',
          message: `${itemData.name} ถูกอัพเดตแล้ว`,
        })
      } else {
        await createMutation.mutateAsync(itemData)
        showToast({
          type: 'success',
          title: 'เพิ่มเมนูสำเร็จ',
          message: `${itemData.name} ถูกเพิ่มเข้าระบบแล้ว`,
        })
      }
      handleCloseModal()
    } catch (error) {
      showToast({
        type: 'error',
        title: 'ไม่สามารถบันทึกได้',
        message: 'กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ "${item.name}"?`)) return

    try {
      await deleteMutation.mutateAsync(item.id)
      showToast({
        type: 'success',
        title: 'ลบเมนูสำเร็จ',
        message: `${item.name} ถูกลบออกจากระบบแล้ว`,
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'ไม่สามารถลบได้',
        message: 'กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await toggleAvailabilityMutation.mutateAsync({
        id: item.id,
        isAvailable: !item.isAvailable
      })
      showToast({
        type: 'success',
        title: 'อัพเดตสถานะสำเร็จ',
        message: `${item.name} ${!item.isAvailable ? 'พร้อมจำหน่าย' : 'หมดชั่วคราว'}`,
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'ไม่สามารถอัพเดตได้',
        message: 'กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการเมนู</h1>
          <p className="text-gray-500">เพิ่ม แก้ไข และจัดการรายการอาหาร</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
        >
          <Plus className="w-5 h-5" />
          เพิ่มเมนูใหม่
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="เมนูทั้งหมด"
            value={stats.total}
            icon={ChefHat}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="พร้อมจำหน่าย"
            value={stats.available}
            icon={Check}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            label="หมดชั่วคราว"
            value={stats.unavailable}
            icon={AlertTriangle}
            color="bg-red-100 text-red-600"
          />
          <StatCard
            label="แนะนำ"
            value={stats.recommended}
            icon={Star}
            color="bg-yellow-100 text-yellow-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาเมนู..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2',
                selectedCategory === cat.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Availability Filter */}
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value as typeof availabilityFilter)}
          className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 bg-white"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="available">พร้อมจำหน่าย</option>
          <option value="unavailable">หมดชั่วคราว</option>
        </select>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">จัดเรียงตาม:</span>
        <button
          onClick={() => {
            if (sortBy === 'name') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
            else { setSortBy('name'); setSortOrder('asc') }
          }}
          className={cn(
            'px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1',
            sortBy === 'name' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
          )}
        >
          ชื่อ
          {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
        </button>
        <button
          onClick={() => {
            if (sortBy === 'price') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
            else { setSortBy('price'); setSortOrder('asc') }
          }}
          className={cn(
            'px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1',
            sortBy === 'price' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
          )}
        >
          ราคา
          {sortBy === 'price' && <ArrowUpDown className="w-3 h-3" />}
        </button>
        <button
          onClick={() => {
            if (sortBy === 'category') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
            else { setSortBy('category'); setSortOrder('asc') }
          }}
          className={cn(
            'px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1',
            sortBy === 'category' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
          )}
        >
          หมวดหมู่
          {sortBy === 'category' && <ArrowUpDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Menu Grid */}
      {isLoading ? (
        <MenuGridSkeleton count={8} />
      ) : filteredItems?.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-bold">ไม่พบเมนู</p>
          <p className="text-sm">ลองเปลี่ยนตัวกรองหรือเพิ่มเมนูใหม่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems?.map((item) => (
              <MenuAdminCard
                key={item.id}
                item={item}
                onEdit={() => handleOpenModal(item)}
                onDelete={() => handleDelete(item)}
                onToggleAvailability={() => handleToggleAvailability(item)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <MenuModal
            formData={formData}
            setFormData={setFormData}
            imagePreview={imagePreview}
            fileInputRef={fileInputRef}
            isEditing={!!editingItem}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
            onImageChange={handleImageChange}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <div className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-black text-gray-800">{value}</p>
        </div>
      </div>
    </Card>
  )
}

// Menu Admin Card Component
interface MenuAdminCardProps {
  item: MenuItem
  onEdit: () => void
  onDelete: () => void
  onToggleAvailability: () => void
}

function MenuAdminCard({ item, onEdit, onDelete, onToggleAvailability }: MenuAdminCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Card className={cn('h-full flex flex-col', !item.isAvailable && 'opacity-75')}>
        {/* Image */}
        <div className="relative aspect-video bg-gray-100 rounded-t-xl overflow-hidden">
          <img
            src={getValidImageUrl(item.imageUrl) || '/placeholder-food.jpg'}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={onEdit}
              className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {!item.isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-full text-sm">
                หมดชั่วคราว
              </span>
            </div>
          )}

          {item.isRecommended && item.isAvailable && (
            <div className="absolute top-2 left-2">
              <span className="bg-yellow-400 text-yellow-900 font-bold px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                <Star className="w-3 h-3" />
                แนะนำ
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-800">{item.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{item.category}</p>
              </div>
              <span className="font-bold text-brand-600 text-lg">
                {formatPrice(item.price)}
              </span>
            </div>

            {item.description && (
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{item.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
            <div className="flex gap-2">
              {item.requiresMeat && (
                <Badge variant="default" className="text-[10px]">เลือกเนื้อได้</Badge>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onToggleAvailability}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  item.isAvailable
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                )}
                title={item.isAvailable ? 'ทำให้หมดชั่วคราว' : 'ทำให้พร้อมจำหน่าย'}
              >
                {item.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <button
                onClick={onEdit}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={onDelete}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Menu Modal Component
interface MenuModalProps {
  formData: MenuFormData
  setFormData: React.Dispatch<React.SetStateAction<MenuFormData>>
  imagePreview: string
  fileInputRef: React.RefObject<HTMLInputElement>
  isEditing: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isLoading: boolean
}

function MenuModal({
  formData,
  setFormData,
  imagePreview,
  fileInputRef,
  isEditing,
  onClose,
  onSubmit,
  onImageChange,
  isLoading
}: MenuModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">รูปภาพ</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-brand-500 transition-colors"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-12 h-12 mb-2" />
                    <p className="text-sm">คลิกเพื่ออัพโหลดรูปภาพ</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ชื่อเมนู <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                placeholder="เช่น กะเพราหมูสับ"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">หมวดหมู่</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as CategoryType }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ราคา <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                  placeholder="59"
                />
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">คำอธิบาย</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 resize-none"
                rows={3}
                placeholder="คำอธิบายเกี่ยวกับเมนู..."
              />
            </div>

            {/* Options */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-3">ตัวเลือก</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm">พร้อมจำหน่าย</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecommended}
                    onChange={(e) => setFormData(prev => ({ ...prev, isRecommended: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    แนะนำ
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresMeat}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiresMeat: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm">เลือกเนื้อได้</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มเมนู'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
