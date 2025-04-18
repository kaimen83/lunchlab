"use client"

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FeedbackModal from './FeedbackModal'

export default function FloatingFeedbackButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-12 w-12 p-0 shadow-lg"
        size="icon"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </Button>
      
      <FeedbackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  )
} 