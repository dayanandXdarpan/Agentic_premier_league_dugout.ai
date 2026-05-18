import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, PartyPopper } from 'lucide-react';
import type { AgentEvent } from '../hooks/useLiveMatch';

export const PointsCard: React.FC<{ event: AgentEvent }> = ({ event }) => {
  const won = (event.content.coins_awarded ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`rounded-2xl p-4 border relative overflow-hidden ${
        won ? 'bg-[#0A0A0A] border-white/10 border-l-[2px] border-l-green-500' : 'bg-[#0A0A0A] border-white/10 border-l-[2px] border-l-red-500'
      }`}
    >
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20 ${
        won ? 'bg-green-500/15' : 'bg-red-500/15'
      }`} />

      <div className="flex items-center gap-3 relative z-10">
        <div className={`p-2.5 rounded-xl ${won ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
          {won ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-sm font-display ${won ? 'text-green-300' : 'text-red-300'}`}>{event.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{event.content.question}</p>
        </div>
        {won && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
            className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full"
          >
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-base font-black text-green-400 font-display">+{event.content.coins_awarded}</span>
          </motion.div>
        )}
      </div>

      {won && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-green-500/10"
        >
          <PartyPopper className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-[11px] font-medium text-green-400/70">Great prediction!</span>
        </motion.div>
      )}
    </motion.div>
  );
};
