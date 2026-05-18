import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Coins, ArrowRight, Zap } from 'lucide-react';
import type { AgentEvent } from '../hooks/useLiveMatch';
import { cn } from './PollCard';

// SVG Radial Confidence Gauge
const ConfidenceGauge: React.FC<{ percentage: number }> = ({ percentage }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="confidence-ring w-20 h-20" viewBox="0 0 80 80">
        {/* Background track */}
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(168, 85, 247, 0.1)" strokeWidth="5" />
        {/* Progress arc */}
        <motion.circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="url(#oracleGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
        <defs>
          <linearGradient id="oracleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
          className="text-xl font-black text-oracle-400 font-display"
        >
          {percentage}%
        </motion.span>
      </div>
    </div>
  );
};

export const OracleCard: React.FC<{ event: AgentEvent }> = ({ event }) => {
  const [betPlaced, setBetPlaced] = useState(false);

  const handleBet = async (option: string) => {
    setBetPlaced(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${baseUrl}/api/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'hackathon_demo_user', bet: option })
      });
    } catch (e) {
      console.error("Failed to place bet", e);
    }
  };

  const options = event.content.options ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-[#0A0A0A] border border-white/10 border-l-[2px] border-l-oracle-500 rounded-2xl p-5 relative overflow-hidden card-hover"
    >
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-oracle-500/10 rounded-full blur-3xl pointer-events-none opacity-30" />
      <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-oracle-600/5 rounded-full blur-2xl pointer-events-none opacity-20" />

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="bg-oracle-500/15 p-2.5 rounded-xl">
          <Sparkles className="text-oracle-400 w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-100 font-display">{event.title}</h3>
          <p className="text-[10px] text-oracle-400 font-bold tracking-wider uppercase mt-0.5">Next Ball Oracle</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-oracle-400 bg-oracle-500/10 px-2 py-1 rounded-full">
          <Zap className="w-3 h-3" />
          <span>AI</span>
        </div>
      </div>

      {/* Prediction + Confidence Gauge */}
      <div className="bg-[#111111] rounded-xl p-4 border border-white/5 mb-4 flex items-center justify-between relative z-10">
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">AI Prediction</p>
          <p className="text-base font-bold text-slate-100 font-display">{event.content.prediction || "Analyzing..."}</p>
        </div>
        <ConfidenceGauge percentage={event.content.probability || 0} />
      </div>

      <p className="text-slate-300 font-medium mb-3 relative z-10 text-sm">{event.content.question || "Place your bet!"}</p>

      {options.length > 0 && (
        <div className="grid grid-cols-2 gap-2 relative z-10">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleBet(option)}
              disabled={betPlaced}
              className={cn(
                "group p-3 rounded-xl border flex items-center justify-between transition-all duration-300",
                betPlaced
                  ? "border-dark-700/50 bg-[#1A1A1A] opacity-40 cursor-not-allowed"
                  : "border-white/10 bg-[#111111] hover:border-oracle-500/50 hover:bg-oracle-500/5 cursor-pointer"
              )}
            >
              <span className="font-medium text-slate-200 text-sm">{option}</span>
              {!betPlaced && <ArrowRight className="w-4 h-4 text-oracle-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          ))}
        </div>
      )}

      {betPlaced && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
          className="flex items-center justify-center gap-2 text-green-400 bg-green-500/8 border border-green-500/20 py-2.5 rounded-xl relative z-10"
        >
          <Coins className="w-4 h-4" />
          <span className="text-sm font-bold">100 Fan Coins wagered!</span>
        </motion.div>
      )}
    </motion.div>
  );
};
