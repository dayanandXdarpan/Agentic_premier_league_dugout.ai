import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = [
  { name: 'Cricket', emojis: ['🏏', '🏆', '🎯', '🔥', '💥', '⚡', '🙌', '🎉', '💪', '🏟️', '🎊', '🥇'] },
  { name: 'Reactions', emojis: ['😂', '🤣', '😍', '🤩', '😱', '🥳', '😤', '🫡', '💀', '👀', '😭', '🤯'] },
  { name: 'Gestures', emojis: ['👏', '🤝', '✌️', '🤞', '👊', '🫶', '💅', '🙏', '🤙', '👆', '🖐️', '👋'] },
  { name: 'Fun', emojis: ['🐐', '🦁', '🐯', '🦅', '👑', '🌟', '💎', '🎭', '🃏', '🎪', '🧿', '🪄'] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl hover:bg-dark-700 transition-colors text-slate-400 hover:text-yellow-400"
        type="button"
      >
        <Smile className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-72 bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Category Tabs */}
            <div className="flex border-b border-dark-700">
              {EMOJI_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(i)}
                  className={`flex-1 py-2 text-xs font-bold transition-colors ${
                    activeCategory === i
                      ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  type="button"
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    setIsOpen(false);
                  }}
                  className="text-xl p-1.5 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer text-center"
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
