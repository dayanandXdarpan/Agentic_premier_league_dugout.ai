import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, CheckCircle2, Clock, Users } from 'lucide-react';
import type { AgentEvent } from '../hooks/useLiveMatch';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PollCardProps {
  event: AgentEvent;
}

export const PollCard: React.FC<PollCardProps> = ({ event }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const percentages = useMemo(() => {
    const options = event.content.options ?? [];
    const raw = options.map(() => Math.floor(Math.random() * 40) + 10);
    const total = raw.reduce((a, b) => a + b, 0);
    return raw.map(v => Math.round((v / total) * 100));
  }, [event.id, event.content.options?.length]);

  const totalVotes = useMemo(() => Math.floor(Math.random() * 800) + 200, [event.id]);

  const handleVote = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
  };

  const options = event.content.options ?? [];
  if (options.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-[#0A0A0A] border border-white/10 border-l-[2px] border-l-primary-500 rounded-2xl p-5 relative overflow-hidden card-hover"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/8 rounded-full blur-3xl pointer-events-none opacity-20" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-500/15 p-2.5 rounded-xl">
            <BarChart2 className="text-primary-400 w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 font-display">{event.title}</h3>
            <p className="text-[10px] text-primary-400 font-bold tracking-wider uppercase mt-0.5">Live Poll</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock className="w-3 h-3" />
            <span>Active</span>
          </div>
        </div>
      </div>

      <p className="text-slate-200 text-lg mb-5 font-semibold font-display">
        {event.content.question}
      </p>

      <div className="space-y-2.5">
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          const showResults = selectedOption !== null;
          const percentage = showResults
            ? (isSelected ? Math.min(percentages[index] + 25, 95) : percentages[index])
            : 0;

          return (
            <button
              key={index}
              onClick={() => handleVote(option)}
              disabled={showResults}
              className={cn(
                "relative w-full text-left overflow-hidden transition-all duration-300 rounded-xl border p-3.5 group",
                showResults
                  ? isSelected
                    ? "border-primary-500/40 bg-primary-500/8"
                    : "border-dark-700/50 bg-[#1A1A1A] opacity-60"
                  : "border-white/10 bg-[#111111] hover:border-primary-500/40 hover:bg-primary-500/5 cursor-pointer"
              )}
            >
              {/* Result Fill Bar with shimmer */}
              {showResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "absolute left-0 top-0 bottom-0 pointer-events-none",
                    isSelected ? "bg-primary-500/15" : "bg-slate-500/8"
                  )}
                >
                  <div className="absolute inset-0 shimmer-bg" />
                </motion.div>
              )}

              <div className="relative z-10 flex justify-between items-center">
                <span className={cn("font-medium text-sm", isSelected ? "text-primary-400" : "text-slate-200")}>
                  {option}
                </span>

                {showResults ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400 tabular-nums">
                      {percentage}%
                    </span>
                    {isSelected && <CheckCircle2 className="w-4.5 h-4.5 text-primary-500" />}
                  </div>
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full border-2 border-dark-600 group-hover:border-primary-500/50 transition-colors" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote count footer */}
      {selectedOption && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-dark-700/50"
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-500">{totalVotes.toLocaleString()} fans voted</span>
        </motion.div>
      )}
    </motion.div>
  );
};
