import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ShoppingBag, Trophy, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { showToast } from './Toast';

interface StoreModalProps { isOpen: boolean; onClose: () => void; fanCoins: number; setFanCoins: (coins: number) => void; }

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_STYLES: Record<Rarity, { border: string; badge: string; badgeText: string; glow: string }> = {
  common: { border: 'border-white/5', badge: 'bg-white/10 text-slate-400', badgeText: 'Common', glow: '' },
  rare: { border: 'border-primary-500/30', badge: 'bg-primary-500/15 text-primary-400', badgeText: 'Rare', glow: '' },
  epic: { border: 'border-oracle-500/30', badge: 'bg-oracle-500/15 text-oracle-400', badgeText: 'Epic', glow: '' },
  legendary: { border: 'border-trivia-500/30', badge: 'bg-trivia-500/15 text-trivia-400', badgeText: 'Legendary', glow: '' },
};

const ITEMS: { id: number; name: string; cost: number; rarity: Rarity; icon: string }[] = [
  { id: 1, name: 'Unlock "Meme Lord" Persona', cost: 200, rarity: 'common', icon: '🎭' },
  { id: 2, name: 'Highlight Reel Access (24h)', cost: 500, rarity: 'rare', icon: '🎬' },
  { id: 3, name: 'Exclusive Team Badge', cost: 1000, rarity: 'epic', icon: '🏅' },
  { id: 4, name: 'Official KKR Jersey', cost: 5000, rarity: 'epic', icon: '👕' },
  { id: 5, name: 'VIP Tickets (Finals)', cost: 15000, rarity: 'legendary', icon: '🎫' },
];

export const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose, fanCoins, setFanCoins }) => {
  const handleRedeem = (item: typeof ITEMS[0]) => {
    if (fanCoins >= item.cost) {
      setFanCoins(fanCoins - item.cost);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'] });
      showToast('success', `🎉 "${item.name}" redeemed!`);
    } else { showToast('error', 'Not enough Fan Coins!'); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50" />
          <motion.div initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }} exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }} className="fixed left-1/2 top-1/2 w-[90%] max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="bg-[#111111] border-b border-white/5 p-5 flex items-center justify-between relative">
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-primary-500/15 p-2.5 rounded-xl"><ShoppingBag className="w-5 h-5 text-primary-400" /></div>
                <div>
                  <h2 className="text-xl font-bold text-white font-display">Dugout Store</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Redeem Fan Coins for rewards</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-full transition-colors relative z-10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="p-5">
              {/* Balance */}
              <div className="flex items-center justify-between mb-5 p-4 bg-black border border-white/5 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Your Balance</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="text-2xl font-black text-slate-100 font-display tabular-nums">{fanCoins}</span>
                    <span className="text-sm text-slate-500 font-medium">FC</span>
                  </div>
                </div>
                <div className="bg-yellow-500/10 p-3 rounded-xl"><Trophy className="w-6 h-6 text-yellow-500" /></div>
              </div>

              {/* Items */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {ITEMS.map((item) => {
                  const canAfford = fanCoins >= item.cost;
                  const rarity = RARITY_STYLES[item.rarity];
                  return (
                    <div key={item.id} className={`p-4 rounded-xl border bg-[#111111] flex items-center justify-between group hover:bg-[#1A1A1A] transition-all duration-300 ${rarity.border}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Sparkles className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${rarity.badge} px-1.5 py-0.5 rounded`}>{rarity.badgeText}</span>
                          </div>
                          <h4 className="font-medium text-slate-200 text-sm truncate">{item.name}</h4>
                        </div>
                      </div>
                      <button onClick={() => handleRedeem(item)} disabled={!canAfford} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex-shrink-0 ml-3 ${canAfford ? 'bg-primary-600 text-white hover:bg-primary-500 hover:scale-105 active:scale-95' : 'bg-dark-700 text-slate-500 cursor-not-allowed'}`}>
                        {item.cost} FC
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
