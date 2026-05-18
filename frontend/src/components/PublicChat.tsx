import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Users, Zap, ArrowDown, MessageSquare } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import {
  supabase, isSupabaseConfigured, getDemoUser, getRandomFanName, getRandomAvatar, type ChatMessage,
} from '../lib/supabase';

const QUICK_REACTIONS = [
  { label: '6️⃣', emoji: '💥 SIX!', color: 'text-yellow-400' },
  { label: '4️⃣', emoji: '🔥 FOUR!', color: 'text-blue-400' },
  { label: '🎳', emoji: '🎉 OUT!', color: 'text-red-400' },
  { label: '1️⃣', emoji: '1️⃣', color: 'text-slate-300' },
  { label: '2️⃣', emoji: '2️⃣', color: 'text-slate-300' },
  { label: '3️⃣', emoji: '3️⃣', color: 'text-slate-300' },
  { label: '•', emoji: '😤 Dot', color: 'text-slate-500' },
];

const BANTER_MESSAGES = [
  "That six went further than my Wi-Fi signal! 📡💀",
  "Even I didn't see THAT coming! 🧠🔥",
  "Wicket alert! Time to change your fantasy captain? 😏",
  "The bowling team's group chat is TOXIC right now 💀💀",
  "That catch was so good, I'm literally clapping at my screen 👏",
  "If that shot was a stock, I'd invest everything 📈🚀",
  "MEME DROP: This innings deserves its own Netflix documentary 🎬",
];

const generateMockChat = (): ChatMessage[] => {
  const messages: ChatMessage[] = [];
  const baseTime = Date.now() - 120000;
  const chatTexts = [
    "LET'S GOOO! 🔥🔥🔥", "What a shot! Clean hitting", "This bowler is on fire today",
    "Anyone else nervous? 😅", "SIXXXXX! 💥💥💥", "Need a wicket here badly",
    "IPL at its best! 🏏", "That was plumb LBW come on!", "DRS time? 👀", "This partnership is building nicely",
  ];
  for (let i = 0; i < chatTexts.length; i++) {
    messages.push({ id: `mock-${i}`, user: getRandomFanName(), text: chatTexts[i], timestamp: new Date(baseTime + i * 8000).toISOString(), avatar: getRandomAvatar() });
  }
  messages.push({ id: 'banter-initial', user: 'SuperFan_Max', text: BANTER_MESSAGES[0], timestamp: new Date(baseTime + chatTexts.length * 8000).toISOString(), isAI: true, avatar: '😎' });
  return messages;
};

export const PublicChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => generateMockChat());
  const [inputText, setInputText] = useState('');
  const [onlineCount] = useState(Math.floor(Math.random() * 300) + 150);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [typingVisible, setTypingVisible] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInput, setAIInput] = useState('');
  const [aiMessages, setAIMessages] = useState<{role:'user'|'ai'; text:string}[]>([
    { role: 'ai', text: "Hey! I'm your match AI. Ask me anything — best bowler to target, fantasy tips, or who'll win! 🏏" }
  ]);
  const [aiLoading, setAILoading] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{id: string; emoji: string; x: number; color: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const user = getDemoUser();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Scroll detection for FAB
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200); };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Typing indicator cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingVisible(true);
      setTimeout(() => setTypingVisible(false), 3000);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      const channel = supabase.channel('public-chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room=eq.public' }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev.slice(-80), payload.new as ChatMessage];
        });
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      const bc = new BroadcastChannel('dugout_public_chat');
      bc.onmessage = (event) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [...prev.slice(-80), event.data];
        });
      };
      bcRef.current = bc;
      return () => {
        bc.close();
        bcRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    const mockMessages = ["Incredible over! 🏏", "Need boundaries NOW", "Timeout = strategy 🧠", "This umpire is blind 🙈", "Fielding has been sharp!", "Death overs time ⏰", "Who's your player of the match?", "That slower ball was FILTHY 💀", "Come on boys! 💪", "That edge was so thick lol"];
    const interval = setInterval(() => {
      const mockMsg: ChatMessage = { id: `live-${Date.now()}`, user: getRandomFanName(), text: mockMessages[Math.floor(Math.random() * mockMessages.length)], timestamp: new Date().toISOString(), avatar: getRandomAvatar() };
      setMessages((prev) => [...prev.slice(-80), mockMsg]);
    }, 6000 + Math.random() * 4000);
    const banterInterval = setInterval(() => {
      const banterMsg: ChatMessage = { id: `banter-${Date.now()}`, user: 'SuperFan_Max', text: BANTER_MESSAGES[Math.floor(Math.random() * BANTER_MESSAGES.length)], timestamp: new Date().toISOString(), isAI: true, avatar: '😎' };
      setMessages((prev) => [...prev.slice(-80), banterMsg]);
    }, 25000 + Math.random() * 10000);
    return () => { clearInterval(interval); clearInterval(banterInterval); };
  }, []);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    const msg: ChatMessage = { id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, user: user.name, text, timestamp: new Date().toISOString(), avatar: user.avatar };
    setMessages((prev) => [...prev.slice(-80), msg]);
    setInputText('');
    inputRef.current?.focus();
    if (isSupabaseConfigured() && supabase) { 
      await supabase.from('messages').insert({ user: msg.user, text: msg.text, room: 'public', avatar: msg.avatar }); 
    } else {
      bcRef.current?.postMessage(msg);
    }
  }, [inputText, user]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const sendQuickReaction = useCallback((emoji: string, color: string) => {
    const id = `r-${Date.now()}-${Math.random()}`;
    const x = 15 + Math.random() * 70; // random x position as %
    setFloatingReactions(prev => [...prev, { id, emoji, x, color }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2200);
  }, []);

  const sendAIMessage = useCallback(async () => {
    if (!aiInput.trim()) return;
    const question = aiInput.trim();
    setAIMessages(prev => [...prev, { role: 'user', text: question }]);
    setAIInput('');
    setAILoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question }) });
      if (res.ok) {
        const data = await res.json();
        setAIMessages(prev => [...prev, { role: 'ai', text: data.reply || "Let me think about that one! 🤔" }]);
      } else {
        setAIMessages(prev => [...prev, { role: 'ai', text: "Hmm, couldn't fetch that. The match is too intense! 🏏 Try asking again." }]);
      }
    } catch {
      setAIMessages(prev => [...prev, { role: 'ai', text: "Network hiccup! But here's my gut feel: back the in-form batter every time. 🔥" }]);
    } finally {
      setAILoading(false);
    }
  }, [aiInput]);

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] max-w-2xl mx-auto relative overflow-hidden">
      {/* Floating emoji reactions overlay */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -160, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.0, ease: 'easeOut' }}
              className={`absolute bottom-24 font-black text-2xl ${r.color}`}
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50">
        <div className="flex items-center gap-2.5">
          <div className="bg-green-500/15 p-2 rounded-xl"><Users className="w-4 h-4 text-green-400" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 font-display">The Mega Stand</h3>
            <p className="text-[10px] text-slate-500">Global match chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowAIChat(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
              showAIChat
                ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                : 'bg-black border-white/10 text-slate-400 hover:border-primary-500/30'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat AI
          </motion.button>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-400">{onlineCount} online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.user === user.name && !msg.isAI;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  msg.isAI ? 'bg-gradient-to-br from-primary-600 to-oracle-600 shadow-lg shadow-primary-500/20'
                    : isMe ? 'bg-primary-500/15 border border-primary-500/25' : 'bg-dark-750 border border-dark-600'
                }`}>{msg.avatar || '🏏'}</div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-[11px] font-bold ${msg.isAI ? 'text-primary-400' : isMe ? 'text-primary-400' : 'text-slate-400'}`}>
                      {msg.isAI && <Zap className="w-3 h-3 inline mr-1 text-primary-400" />}{msg.user}
                    </span>
                    <span className="text-[9px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.isAI ? 'bg-gradient-to-r from-primary-600/10 to-oracle-600/10 border border-primary-500/15 text-slate-200'
                      : isMe ? 'bg-primary-600 text-white rounded-br-md' : 'bg-dark-750 text-slate-300 rounded-bl-md'
                  }`}>{msg.text}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {typingVisible && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 py-1">
              <div className="bg-dark-750 rounded-2xl px-4 py-2.5 flex items-center gap-1.5">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
              <span className="text-[10px] text-slate-600 italic">someone is typing...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
            className="absolute bottom-20 right-6 w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 hover:bg-primary-500 transition-colors z-30"
          >
            <ArrowDown className="w-4 h-4 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 240, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-white/5 bg-[#0A0A0A]"
          >
            <div className="p-3 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary-500/15 p-1.5 rounded-lg"><Bot className="w-3.5 h-3.5 text-primary-400" /></div>
                <span className="text-xs font-bold text-primary-400">AI Match Expert</span>
                <span className="text-[10px] text-slate-600 ml-auto">Ask anything about this match</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                {aiMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-[#1A1A1A] border border-white/5 text-slate-200'
                    }`}>{m.text}</div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#1A1A1A] border border-white/5 px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 bg-[#111] border border-white/5 rounded-xl px-3 py-1.5">
                <input
                  value={aiInput}
                  onChange={e => setAIInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendAIMessage(); }}
                  placeholder="Who should I target in fantasy? 🏏"
                  className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none py-1"
                />
                <button onClick={sendAIMessage} disabled={!aiInput.trim() || aiLoading} className="text-primary-400 disabled:opacity-30 hover:text-primary-300 transition-colors">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.user === user.name && !msg.isAI;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  msg.isAI ? 'bg-gradient-to-br from-primary-600 to-oracle-600 shadow-lg shadow-primary-500/20'
                    : isMe ? 'bg-primary-500/15 border border-primary-500/25' : 'bg-dark-750 border border-dark-600'
                }`}>{msg.avatar || '🏏'}</div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-[11px] font-bold ${msg.isAI ? 'text-primary-400' : isMe ? 'text-primary-400' : 'text-slate-400'}`}>
                      {msg.isAI && <Zap className="w-3 h-3 inline mr-1 text-primary-400" />}{msg.user}
                    </span>
                    <span className="text-[9px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.isAI ? 'bg-gradient-to-r from-primary-600/10 to-oracle-600/10 border border-primary-500/15 text-slate-200'
                      : isMe ? 'bg-primary-600 text-white rounded-br-md' : 'bg-dark-750 text-slate-300 rounded-bl-md'
                  }`}>{msg.text}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {typingVisible && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 py-1">
              <div className="bg-dark-750 rounded-2xl px-4 py-2.5 flex items-center gap-1.5">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
              <span className="text-[10px] text-slate-600 italic">someone is typing...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
            className="absolute bottom-20 right-6 w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 hover:bg-primary-500 transition-colors z-30"
          >
            <ArrowDown className="w-4 h-4 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="px-4 pt-2 pb-3 border-t border-white/5 bg-[#0A0A0A]">
        {/* Quick Reactions */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-hide">
          {QUICK_REACTIONS.map((r) => (
            <motion.button
              key={r.label}
              whileTap={{ scale: 0.82 }}
              onClick={() => sendQuickReaction(r.emoji, r.color)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#111] border border-white/8 text-sm font-bold text-slate-300 hover:bg-[#1A1A1A] hover:border-white/15 transition-all select-none"
            >
              {r.label}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-[#111] border border-white/8 rounded-2xl px-2 py-1 focus-within:border-primary-500/30 transition-colors">
          <EmojiPicker onSelect={(emoji) => setInputText((prev) => prev + emoji)} />
          <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none py-2" />
          <button onClick={sendMessage} disabled={!inputText.trim()} className="p-2 rounded-xl bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95">
            <Send className="w-4 h-4" />
          </button>
        </div>
        {!isSupabaseConfigured() && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-600"><Zap className="w-3 h-3" /><span>Demo mode — add Supabase for multiplayer</span></div>
        )}
      </div>
    </div>
  );
};
