import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, X, MicOff, ChefHat, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store'
import { useMenuItems } from '@/features/menu/hooks/useMenu'
import type { MenuItem } from '@/types'
import { cn } from '@/utils/cn'
import { getValidImageUrl } from '@/utils/getImageUrl'
interface VoiceOrderProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: MenuItem, options: { egg?: string; spicy?: string }) => void
}

export function VoiceOrder({ isOpen, onClose, onSelect }: VoiceOrderProps) {
  const { addToast } = useUIStore()
  const { data: menuItems } = useMenuItems()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [detectedItems, setDetectedItems] = useState<MenuItem[]>([])
  const [parsedOptions, setParsedOptions] = useState<{ egg?: string; spicy?: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [waveform, setWaveform] = useState<number[]>(Array(8).fill(0))
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Real Speech Recognition instance ref
  const recognitionRef = useRef<any>(null)

  // Initialize SpeechRecognition on load
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang = 'th-TH'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onstart = () => {
        setIsListening(true)
        setTranscript('')
        setDetectedItems([])
        setParsedOptions({})
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onerror = () => {
        setIsListening(false)
        addToast({
          type: 'error',
          title: 'ไม่สามารถฟังได้',
          message: 'ลองพูดใหม่อีกครั้ง หรือเช็คไมโครโฟน',
        })
      }

      recognitionRef.current = recognition
    }
  }, [addToast])

  const processVoiceCommand = useCallback((command: string) => {
    if (!menuItems || menuItems.length === 0) return
    setIsProcessing(true)

    setTimeout(() => {
      const lowerCommand = command.toLowerCase()
      const matches = menuItems.filter(item => {
        const itemName = item.name.toLowerCase()
        const searchTerms = [
          itemName,
          itemName.replace('กะเพรา', '').trim(),
          itemName.replace('ข้าวผัด', '').trim(),
        ]
        return searchTerms.some(term => lowerCommand.includes(term))
      })

      const uniqueMatches = Array.from(new Map(matches.map(m => [m.id, m])).values())
      setDetectedItems(uniqueMatches.slice(0, 3))
      setIsProcessing(false)

      if (uniqueMatches.length === 0) {
        addToast({ type: 'info', title: 'ไม่พบเมนู', message: 'ลองพูดชื่อเมนูใหม่อีกครั้ง' })
      }
    }, 1000)
  }, [menuItems, addToast])

  // Process transcript once listening ends
  useEffect(() => {
    if (!isListening && transcript) {
      processVoiceCommand(transcript)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript])

  // Animate waveform
  useEffect(() => {
    if (isListening) {
      intervalRef.current = setInterval(() => {
        setWaveform(Array(8).fill(0).map(() => Math.random() * 100))
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setWaveform(Array(8).fill(0))
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isListening])

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        setIsListening(true)
        addToast({ type: 'error', title: 'เสียงถูกปฏิเสธ', message: 'กรุณาอนุญาตให้ใช้ไมโครโฟน' })
      }
    } else {
      // Fallback
      setIsListening(true)
      setTranscript('')
      setDetectedItems([])
      setTimeout(() => {
        setIsListening(false)
        const mockCommand = 'ขอกะเพราหมูสับไข่ดาว ไม่เผ็ด'
        setTranscript(mockCommand)
        processVoiceCommand(mockCommand)
      }, 3000)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    } else {
      setIsListening(false)
    }
  }

  const handleSelectItem = (item: MenuItem) => {
    const fallbackOptions: { egg?: string; spicy?: string } = { ...parsedOptions }
    const lowerTranscript = transcript.toLowerCase()

    if (!fallbackOptions.egg) {
      if (lowerTranscript.includes('ไข่ดาว')) fallbackOptions.egg = 'ไข่ดาว'
      else if (lowerTranscript.includes('ไข่เจียว')) fallbackOptions.egg = 'ไข่เจียว'
    }

    if (!fallbackOptions.spicy) {
      if (lowerTranscript.includes('เผ็ดมาก')) fallbackOptions.spicy = 'เผ็ดมาก'
      else if (lowerTranscript.includes('ไม่เผ็ด')) fallbackOptions.spicy = 'ไม่เผ็ด'
      else if (lowerTranscript.includes('พิเศษ')) fallbackOptions.spicy = 'พิเศษ'
    }

    onSelect(item, fallbackOptions)
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      setIsListening(false)
      setTranscript('')
      setDetectedItems([])
      setIsProcessing(false)
      setParsedOptions({})
    } else {
      stopListening()
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
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center z-10 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center mb-6">
            <div className={cn(
              'inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 transition-colors',
              isListening ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            )}>
              <Mic className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-800">สั่งด้วยเสียง</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isListening ? 'กำลังฟัง...' : 'พูดสิ่งที่อยากกินอย่างเป็นธรรมชาติ'}
            </p>
          </div>

          <div className="mb-6">
            <div className="h-24 bg-gray-100 rounded-2xl flex items-center justify-center gap-1 px-4">
              {isListening ? (
                waveform.map((height, i) => (
                  <motion.div
                    key={i}
                    className="w-2 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full"
                    animate={{ height: `${Math.max(10, height)}%` }}
                    transition={{ duration: 0.1 }}
                  />
                ))
              ) : isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-gray-500">กำลังประมวลผล...</span>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    {transcript || 'เช่น "ข้าวกะเพราหมูสับพิเศษ ไม่เผ็ด เพิ่มไข่ดาว"'}
                  </p>
                </div>
              )}
            </div>

            {transcript && !isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-blue-50 rounded-xl"
              >
                <p className="text-sm text-blue-800">
                  <span className="font-bold">ได้ยินว่า:</span> {transcript}
                </p>
              </motion.div>
            )}
          </div>

          {detectedItems.length > 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                เมนูที่พบ
              </p>
              <div className="space-y-2">
                {detectedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors text-left border-2 border-transparent hover:border-blue-200"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={getValidImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍱</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate text-sm">{item.name}</p>

                      {/* Badge display */}
                      <div className="flex gap-1 mt-1">
                        {parsedOptions.egg && (
                          <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium">🔥 {parsedOptions.egg}</span>
                        )}
                        {parsedOptions.spicy && (
                          <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium">🌶️ {parsedOptions.spicy}</span>
                        )}
                      </div>

                      <p className="text-[12px] font-bold text-brand-600 mt-1">{item.price} บาท</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <ChefHat className="w-4 h-4 text-blue-600" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            size="lg"
            fullWidth
            className={cn(
              'transition-all',
              isListening
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
            )}
          >
            {isListening ? (
              <><MicOff className="w-5 h-5 mr-2" />หยุดฟัง</>
            ) : (
              <><Mic className="w-5 h-5 mr-2" />{transcript ? 'สั่งใหม่อีกครั้ง' : 'แตะเพื่อพูด'}</>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default VoiceOrder
