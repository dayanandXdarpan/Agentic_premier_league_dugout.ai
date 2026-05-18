import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, ChevronDown } from 'lucide-react';
import type { AgentEvent } from '../hooks/useLiveMatch';

export const TriviaCard: React.FC<{ event: AgentEvent }> = ({ event }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-[#0A0A0A] border border-white/10 border-l-[2px] border-l-trivia-500 rounded-2xl p-5 relative overflow-hidden card-hover"
    >
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-trivia-500/8 rounded-full blur-3xl pointer-events-none opacity-20" />

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="bg-trivia-500/15 p-2.5 rounded-xl">
          <Brain className="text-trivia-400 w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-100 font-display">{event.title}</h3>
          <p className="text-[10px] text-trivia-400 font-bold tracking-wider uppercase mt-0.5">Cricket Trivia</p>
        </div>
      </div>

      {event.content.question && (
        <p className="text-slate-200 text-base mb-4 font-semibold relative z-10 font-display">{event.content.question}</p>
      )}

      {event.content.fun_fact && (
        <div className="relative z-10">
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-trivia-500/25 bg-trivia-500/5 text-trivia-400 font-bold text-sm hover:bg-trivia-500/10 transition-all group">
              <Sparkles className="w-4 h-4" /><span>Reveal Answer</span><ChevronDown className="w-4 h-4" />
            </button>
          ) : (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-trivia-500/5 border border-trivia-500/20 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-trivia-400 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-200 leading-relaxed text-sm font-medium">{event.content.fun_fact}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      <AnimatePresence>
        {revealed && event.content.explanation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-[#111111] rounded-xl p-3 border border-white/5 relative z-10 mt-3">
            <p className="text-slate-400 text-sm leading-relaxed italic">{event.content.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
