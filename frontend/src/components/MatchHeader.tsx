import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Radio, ChevronDown, ChevronUp, Target, Zap, Shield } from 'lucide-react';
import type { MatchState } from '../hooks/useLiveMatch';

interface MatchHeaderProps {
  matchState: MatchState;
}

const ballColor = (b: string) => {
  if (b === 'W') return 'bg-red-500 text-white';
  if (b === '6') return 'bg-trivia-500 text-black';
  if (b === '4') return 'bg-primary-500 text-white';
  if (b === '0') return 'bg-dark-700 text-slate-500';
  return 'bg-dark-600 text-slate-300';
};

export const MatchHeader: React.FC<MatchHeaderProps> = ({ matchState }) => {
  const [expanded, setExpanded] = useState(false);

  // Use real live data from SSE, fall back to placeholder
  const batters = matchState.batters && matchState.batters.length > 0 ? matchState.batters : null;
  const bowler = matchState.bowler?.name ? matchState.bowler : null;
  const lastOver = matchState.last_over && matchState.last_over.length > 0 ? matchState.last_over : null;
  const hasLivePlayerData = !!(batters || bowler || lastOver);

  const score1Num = parseInt(matchState.score1) || 0;
  const oversNum = parseFloat(matchState.overs) || 0;
  const runRate = oversNum > 0 ? (score1Num / oversNum).toFixed(2) : '0.00';
  const progress = Math.min((oversNum / 20) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-4 mt-3 rounded-2xl overflow-hidden bg-black border border-white/8"
    >
      {/* ── Compact Row ── */}
      <div className="relative p-4 pb-3">
        <div className="flex items-center justify-between">
          {/* Team 1 */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <span className="text-sm font-black text-purple-200 font-display">{matchState.team1?.slice(0, 2)}</span>
                </div>
                {matchState.batting === matchState.team1 && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-black pulse-dot" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-display">{matchState.team1}</p>
                <motion.p
                  key={matchState.score1}
                  initial={{ scale: 1.15, color: '#60A5FA' }}
                  animate={{ scale: 1, color: matchState.batting === matchState.team1 ? '#f1f5f9' : '#64748b' }}
                  className="text-2xl font-black font-display leading-none"
                >
                  {matchState.score1}
                </motion.p>
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center px-4 gap-1">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">vs</span>
            <span className="text-base font-black text-white font-display">{matchState.overs}</span>
            <span className="text-[9px] text-slate-500">ov</span>
          </div>

          {/* Team 2 */}
          <div className="flex-1">
            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 font-display">{matchState.team2}</p>
                <motion.p
                  key={matchState.score2}
                  initial={{ scale: 1.15, color: '#60A5FA' }}
                  animate={{ scale: 1, color: matchState.batting === matchState.team2 ? '#f1f5f9' : '#64748b' }}
                  className="text-2xl font-black font-display leading-none"
                >
                  {matchState.score2}
                </motion.p>
              </div>
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <span className="text-sm font-black text-orange-200 font-display">{matchState.team2?.slice(0, 2)}</span>
                </div>
                {matchState.batting === matchState.team2 && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-black pulse-dot" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar + meta row */}
        <div className="mt-3">
          <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{matchState.venue}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500">CRR <span className="text-slate-300 font-bold">{runRate}</span></span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-green-400">
                <Radio className="w-3 h-3" />
                <span>{matchState.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Hide details</> : <><ChevronDown className="w-3 h-3" />Match details</>}
        </button>
      </div>

      {/* ── Expanded Panel ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-4 space-y-4">

              {/* No live data notice */}
              {!hasLivePlayerData && (
                <div className="text-center py-2">
                  <p className="text-[11px] text-slate-600">Player details will appear once the AI feed starts processing deliveries.</p>
                </div>
              )}

              {/* Last over balls */}
              {lastOver && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5 text-trivia-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Over</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {lastOver.map((b, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black ${ballColor(b)}`}>
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batting */}
              {batters && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Batting</span>
                  </div>
                  <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
                    <div className="grid grid-cols-5 px-3 py-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider border-b border-white/5">
                      <span className="col-span-2">Batter</span>
                      <span className="text-center">R</span>
                      <span className="text-center">B</span>
                      <span className="text-center">SR</span>
                    </div>
                    {batters.map((b, i) => (
                      <div key={i} className="grid grid-cols-5 px-3 py-2 text-xs border-b border-white/5 last:border-0">
                        <span className="col-span-2 font-semibold text-slate-200 flex items-center gap-1.5">
                          {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                          {b.name}
                        </span>
                        <span className="text-center font-black text-white">{b.runs}</span>
                        <span className="text-center text-slate-400">{b.balls}</span>
                        <span className="text-center text-slate-400">{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '0'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bowling */}
              {bowler && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-3.5 h-3.5 text-oracle-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bowling</span>
                  </div>
                  <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
                    <div className="grid grid-cols-5 px-3 py-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider border-b border-white/5">
                      <span className="col-span-2">Bowler</span>
                      <span className="text-center">O</span>
                      <span className="text-center">R</span>
                      <span className="text-center">W</span>
                    </div>
                    <div className="grid grid-cols-5 px-3 py-2 text-xs">
                      <span className="col-span-2 font-semibold text-slate-200 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-oracle-400" />
                        {bowler.name}
                      </span>
                      <span className="text-center text-slate-400">{bowler.overs}</span>
                      <span className="text-center text-slate-400">{bowler.runs}</span>
                      <span className="text-center font-black text-oracle-400">{bowler.wickets}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
