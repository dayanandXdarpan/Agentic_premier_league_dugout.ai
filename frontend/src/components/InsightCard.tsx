import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp } from 'lucide-react';
import type { AgentEvent } from '../hooks/useLiveMatch';

interface InsightCardProps {
  event: AgentEvent;
}

export const InsightCard: React.FC<InsightCardProps> = ({ event }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-[#0A0A0A] border border-white/10 border-l-[2px] border-l-accent-500 rounded-2xl p-5 relative overflow-hidden card-hover"
    >
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-accent-500/8 rounded-full blur-3xl pointer-events-none opacity-20" />

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="bg-accent-500/15 p-2.5 rounded-xl">
          <Lightbulb className="text-accent-400 w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-100 font-display">{event.title}</h3>
          <p className="text-[10px] text-accent-500 font-bold tracking-wider uppercase mt-0.5">Tactical Insight</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-accent-400 bg-accent-500/10 px-2 py-1 rounded-full">
          <TrendingUp className="w-3 h-3" />
          <span>Stat</span>
        </div>
      </div>

      <div className="bg-[#111111] rounded-xl p-4 border border-white/5 relative z-10">
        <p className="text-slate-200 leading-relaxed font-medium text-[15px]">
          {event.content.question}
        </p>
      </div>

      {event.content.options && event.content.options.length > 0 && (
        <div className="mt-4 space-y-2 relative z-10">
          {event.content.options.map((point, idx) => (
            <div key={idx} className="flex items-start gap-3 text-slate-400 text-sm">
              <span className="w-5 h-5 rounded-lg bg-accent-500/15 text-accent-400 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
