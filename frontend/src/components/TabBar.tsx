import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Globe, Lock } from 'lucide-react';

export type TabId = 'commentary' | 'public' | 'private';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  publicUnread?: number;
  privateUnread?: number;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode; subtitle: string }[] = [
  {
    id: 'commentary',
    label: 'AI Dugout',
    icon: <MessageCircle className="w-4 h-4" />,
    subtitle: 'Commentary',
  },
  {
    id: 'public',
    label: 'Mega Stand',
    icon: <Globe className="w-4 h-4" />,
    subtitle: 'Public Chat',
  },
  {
    id: 'private',
    label: 'VIP Box',
    icon: <Lock className="w-4 h-4" />,
    subtitle: 'Private Chat',
  },
];

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  publicUnread = 0,
  privateUnread = 0,
}) => {
  const getUnread = (id: TabId) => {
    if (id === 'public') return publicUnread;
    if (id === 'private') return privateUnread;
    return 0;
  };

  return (
    <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-xl border-b border-dark-700/50 px-3">
      <div className="flex max-w-2xl mx-auto gap-1 py-1.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const unread = getUnread(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 relative py-2.5 px-2 flex flex-col items-center gap-0.5 transition-all duration-200 rounded-xl ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-dark-800/50'
              }`}
            >
              {/* Active pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-primary-500/10 border border-primary-500/20 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <div className="flex items-center gap-1.5 relative z-10">
                <span className={isActive ? 'text-primary-400' : ''}>{tab.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {tab.label}
                </span>
                {unread > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30"
                  >
                    {unread > 9 ? '9+' : unread}
                  </motion.span>
                )}
              </div>
              <span className={`text-[10px] font-medium relative z-10 hidden sm:block ${isActive ? 'text-primary-400/60' : 'opacity-50'}`}>
                {tab.subtitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
