import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveMatch } from '../hooks/useLiveMatch';
import { PollCard } from './PollCard';
import { InsightCard } from './InsightCard';
import { OracleCard } from './OracleCard';
import { CommentaryCard } from './CommentaryCard';
import { TriviaCard } from './TriviaCard';
import { PointsCard } from './PointsCard';
import { MatchHeader } from './MatchHeader';
import { ConnectionStatus } from './ConnectionStatus';
import { StoreModal } from './StoreModal';
import { ErrorBoundary } from './ErrorBoundary';
import { TabBar, type TabId } from './TabBar';
import { PublicChat } from './PublicChat';
import { PrivateChat } from './PrivateChat';
import { Activity, Coins, Store, Sparkles } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';

export const Dashboard: React.FC = () => {
  const { events, fanCoins, setFanCoins, connectionState, matchState } = useLiveMatch();
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('commentary');

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col relative">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-xl border-b border-dark-700/50">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary-600/10 border border-primary-500/20 p-2 rounded-xl">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight font-display">
                Dugout<span className="text-gradient-primary">.ai</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">AI Cricket Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Fan Coins */}
            <motion.div
              key={fanCoins}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 bg-black border border-dark-700 px-3 py-1.5 rounded-full shadow-sm"
            >
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold tabular-nums">{fanCoins}</span>
            </motion.div>
            {/* Language Selector */}
            <LanguageSelector />
            {/* Store Button */}
            <button
              onClick={() => setIsStoreOpen(true)}
              className="flex items-center gap-1.5 bg-black border border-dark-700 px-3 py-1.5 rounded-full hover:border-primary-500/40 transition-all group shadow-sm"
            >
              <Store className="w-4 h-4 text-slate-400 group-hover:text-primary-400 transition-colors" />
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors hidden sm:inline">Store</span>
            </button>
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-black text-red-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
        </div>
      </header>

      <MatchHeader matchState={matchState} />
      <ConnectionStatus state={connectionState} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'commentary' && (
          <motion.main
            key="commentary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 p-4 flex flex-col gap-4 pb-32"
          >
            {events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 mt-20">
                {/* Animated waveform */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary-500 blur-[60px] opacity-10 rounded-full scale-150" />
                  <div className="relative z-10 bg-dark-800 border border-dark-700/50 rounded-2xl p-8">
                    <div className="flex items-end justify-center gap-1 h-10 mb-2">
                      {[16, 28, 20, 36, 24].map((h, i) => (
                        <div
                          key={i}
                          className="waveform-bar bg-gradient-to-t from-primary-600 to-primary-400"
                          style={{ height: `${h}px`, animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-200 font-display">Listening to the match...</p>
                <p className="text-sm mt-2 opacity-60 text-center max-w-xs">
                  AI-powered polls, insights, predictions, and trivia will appear here in real-time.
                </p>
                <div className="flex items-center gap-1.5 mt-5 text-[10px] text-slate-600 bg-dark-800/50 px-3 py-1.5 rounded-full border border-dark-700/30">
                  <Sparkles className="w-3 h-3 text-primary-500" />
                  <span>Powered by Gemini 2.0 Flash</span>
                </div>
              </div>
            ) : (
              <ErrorBoundary fallbackMessage="An AI event failed to render. The feed will continue below.">
                <AnimatePresence initial={false}>
                  {[...events].reverse().map((event, i) => (
                    <motion.div
                      key={event.id || `${event.timestamp}-${i}`}
                      initial={{ opacity: 0, y: -30, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25, delay: i < 3 ? i * 0.05 : 0 }}
                      layout
                    >
                      {event.type === 'poll' && <PollCard event={event} />}
                      {event.type === 'insight' && <InsightCard event={event} />}
                      {event.type === 'oracle' && <OracleCard event={event} />}
                      {event.type === 'commentary' && <CommentaryCard event={event} />}
                      {event.type === 'trivia' && <TriviaCard event={event} />}
                      {event.type === 'points_update' && <PointsCard event={event} />}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ErrorBoundary>
            )}
          </motion.main>
        )}

        {activeTab === 'public' && (
          <motion.div key="public" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
            <PublicChat />
          </motion.div>
        )}

        {activeTab === 'private' && (
          <motion.div key="private" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
            <PrivateChat />
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'commentary' && (
        <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent pointer-events-none z-40" />
      )}

      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} fanCoins={fanCoins} setFanCoins={setFanCoins} />
    </div>
  );
};
