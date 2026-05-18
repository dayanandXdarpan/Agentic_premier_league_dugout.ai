import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionState } from '../hooks/useLiveMatch';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state }) => {
  if (state === 'connected') return null; // Don't show when healthy

  const config = {
    connecting: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      text: 'Connecting to live feed...',
      classes: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    error: {
      icon: <WifiOff className="w-3 h-3" />,
      text: 'Connection lost — reconnecting...',
      classes: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
    closed: {
      icon: <Wifi className="w-3 h-3" />,
      text: 'Disconnected',
      classes: 'text-slate-400 bg-dark-800 border-dark-700',
    },
  }[state];

  return (
    <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border text-xs font-medium mx-4 mt-2 ${config.classes}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};
