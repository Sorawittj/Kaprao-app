/**
 * ============================================================================
 * Kaprao52 - Validation Utilities Tests
 * ============================================================================
 */

import { describe, it, expect } from 'vitest'
import {
  validatePhone,
  formatPhone,
  validateName,
  validateAddress,
  validateEmail,
  validateCart,
  validateOrderForm,
  validateCouponCode,
  validatePointsUsage,
  sanitizeInput,
  sanitizeNumber,
} from './validation'
import type { CartItem } from '@/types'

describe('Phone Validation', () => {
  it('should validate correct Thai phone numbers', () => {
    expect(validatePhone('0812345678')).toEqual({
      isValid: true,
      sanitized: '0812345678',
    })
    expect(validatePhone('089-123-4567')).toEqual({
      isValid: true,
      sanitized: '0891234567',
    })
  })

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('1234567890')).toEqual({
      isValid: false,
      error: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0',
    })
    expect(validatePhone('081234567')).toEqual({
      isValid: false,
      error: 'เบอร์โทรศัพท์ต้องมี 10 หลัก',
    })
    expect(validatePhone('')).toEqual({
      isValid: false,
      error: 'กรุณากรอกเบอร์โทรศัพท์',
    })
  })
})

describe('Phone Formatting', () => {
  it('should format phone numbers correctly', () => {
    expect(formatPhone('0812345678')).toBe('081-234-5678')
    expect(formatPhone('0891234567')).toBe('089-123-4567')
  })

  it('should return original if invalid length', () => {
    expect(formatPhone('08123456')).toBe('08123456')
  })
})

describe('Name Validation', () => {
  it('should validate correct names', () => {
    expect(validateName('สมชาย ใจดี')).toEqual({
      isValid: true,
      sanitized: 'สมชาย ใจดี',
    })
    expect(validateName('John Doe')).toEqual({
      isValid: true,
      sanitized: 'John Doe',
    })
  })

  it('should normalize names', () => {
    expect(validateName('john doe')).toEqual({
      isValid: true,
      sanitized: 'John Doe',
    })
  })

  it('should reject invalid names', () => {
    expect(validateName('')).toEqual({
      isValid: false,
      error: 'กรุณากรอกชื่อ',
    })
    expect(validateName('A')).toEqual({
      isValid: false,
      error: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร',
    })
  })
})

describe('Address Validation', () => {
  it('should validate correct addresses', () => {
    const address = '123/45 ซอยสุขุมวิท 21'
    expect(validateAddress(address).isValid).toBe(true)
  })

  it('should reject too short addresses', () => {
    expect(validateAddress('123')).toEqual({
      isValid: false,
      error: 'ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร',
    })
  })
})

describe('Email Validation', () => {
  it('should validate correct emails', () => {
    expect(validateEmail('test@example.com')).toEqual({
      isValid: true,
      sanitized: 'test@example.com',
    })
  })

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toEqual({
      isValid: false,
      error: 'รูปแบบอีเมลไม่ถูกต้อง',
    })
  })
})

describe('Cart Validation', () => {
  const mockCartItem: CartItem = {
    id: '1',
    menuItem: {
      id: 1,
      name: 'Test Item',
      price: 100,
      category: 'kaprao',
      requiresMeat: true,
      isRecommended: false,
      isAvailable: true,
    },
    quantity: 2,
    selectedOptions: [],
    subtotal: 200,
  }

  it('should validate non-empty cart', () => {
    const result = validateCart([mockCartItem])
    expect(result.isValid).toBe(true)
    expect(result.validItems).toHaveLength(1)
  })

  it('should reject empty cart', () => {
    const result = validateCart([])
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('ตะกร้าว่างเปล่า')
  })

  it('should reject too many items', () => {
    const manyItems = Array(51).fill(mockCartItem)
    const result = validateCart(manyItems)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain('มากเกินไป')
  })
})

describe('Order Form Validation', () => {
  it('should validate complete workplace order', () => {
    const result = validateOrderForm({
      customerName: 'สมชาย',
      phoneNumber: '0812345678',
      deliveryMethod: 'workplace',
      address: '',
    })
    expect(result.isValid).toBe(true)
  })

  it('should require address for village delivery', () => {
    const result = validateOrderForm({
      customerName: 'สมชาย',
      phoneNumber: '0812345678',
      deliveryMethod: 'village',
      address: '',
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.address).toBeDefined()
  })
})

describe('Coupon Validation', () => {
  it('should validate correct coupon codes', () => {
    expect(validateCouponCode('SUMMER20').isValid).toBe(true)
    expect(validateCouponCode('SAVE50').isValid).toBe(true)
  })

  it('should normalize to uppercase', () => {
    expect(validateCouponCode('summer20')).toEqual({
      isValid: true,
      sanitized: 'SUMMER20',
    })
  })
})

describe('Points Validation', () => {
  it('should allow valid points usage', () => {
    expect(validatePointsUsage(100, 500, 1000).isValid).toBe(true)
  })

  it('should reject negative points', () => {
    expect(validatePointsUsage(-10, 500, 1000)).toEqual({
      isValid: false,
      error: 'จำนวนพอยต์ต้องเป็นจำนวนบวก',
    })
  })

  it('should reject exceeding available points', () => {
    expect(validatePointsUsage(600, 500, 1000)).toEqual({
      isValid: false,
      error: 'พอยต์ไม่เพียงพอ',
    })
  })

  it('should reject non-multiples of 10', () => {
    expect(validatePointsUsage(15, 500, 1000)).toEqual({
      isValid: false,
      error: 'พอยต์ต้องเป็นจำนวนเต็ม 10',
    })
  })
})

describe('Sanitization', () => {
  it('should sanitize HTML tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script')
  })

  it('should limit length', () => {
    const long = 'a'.repeat(2000)
    expect(sanitizeInput(long).length).toBeLessThanOrEqual(1000)
  })

  it('should sanitize numbers', () => {
    expect(sanitizeNumber('123', 0)).toBe(123)
    expect(sanitizeNumber('abc', 0)).toBe(0)
    expect(sanitizeNumber(null, 0)).toBe(0)
  })
})
