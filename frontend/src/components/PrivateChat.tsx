import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, Copy, Check, ArrowLeft, Users, Zap, Hash, Plus, LogIn, ShieldCheck } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { supabase, isSupabaseConfigured, generateRoomCode, getDemoUser, type ChatMessage } from '../lib/supabase';
import { showToast } from './Toast';

type PrivateState = 'lobby' | 'room';

export const PrivateChat: React.FC = () => {
  const [state, setState] = useState<PrivateState>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const user = getDemoUser();

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (state !== 'room' || !roomCode) return;
    
    if (isSupabaseConfigured() && supabase) {
      const channel = supabase.channel(`private-${roomCode}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room=eq.${roomCode}` }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as ChatMessage];
        });
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      const bc = new BroadcastChannel(`dugout_room_${roomCode}`);
      bc.onmessage = (event) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      };
      bcRef.current = bc;
      return () => {
        bc.close();
        bcRef.current = null;
      };
    }
  }, [state, roomCode]);

  const createRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setState('room');
    setMessages([{ id: 'system-create', user: 'System', text: `🔒 Private room created! Share code "${code}" with your friends.`, timestamp: new Date().toISOString(), isAI: true, avatar: '🔒' }]);
    showToast('success', `Room ${code} created!`);
  };

  const joinRoom = () => {
    const code = joinCode.trim();
    if (code.length !== 4 || !/^\d{4}$/.test(code)) { showToast('error', 'Enter a valid 4-digit code'); return; }
    setRoomCode(code); setState('room');
    setMessages([{ id: 'system-join', user: 'System', text: `You joined room "${code}". Say hi! 👋`, timestamp: new Date().toISOString(), isAI: true, avatar: '🔒' }]);
    showToast('success', `Joined room ${code}!`);
  };

  const leaveRoom = () => { setState('lobby'); setRoomCode(''); setMessages([]); setJoinCode(''); };

  const copyCode = () => { navigator.clipboard.writeText(roomCode); setCopied(true); showToast('info', `Code "${roomCode}" copied!`); setTimeout(() => setCopied(false), 2000); };

  const sendMessage = useCallback(async () => {
    const text = inputText.trim(); if (!text) return;
    const msg: ChatMessage = { id: `priv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, user: user.name, text, timestamp: new Date().toISOString(), room: roomCode, avatar: user.avatar };
    
    setMessages((prev) => [...prev, msg]); 
    setInputText(''); 
    inputRef.current?.focus();
    
    if (isSupabaseConfigured() && supabase) { 
      await supabase.from('messages').insert({ user: msg.user, text: msg.text, room: roomCode, avatar: msg.avatar }); 
    } else {
      bcRef.current?.postMessage(msg);
    }
  }, [inputText, user, roomCode]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // --- LOBBY VIEW ---
  if (state === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] max-w-2xl mx-auto px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-oracle-500 blur-[50px] opacity-15 rounded-full scale-150" />
              <div className="relative bg-gradient-to-br from-oracle-600/15 to-primary-600/15 border border-oracle-500/25 rounded-2xl p-6">
                <Lock className="w-10 h-10 text-oracle-400 mx-auto animate-float" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1.5 font-display">The VIP Box</h2>
            <p className="text-sm text-slate-400">Private rooms for you and your crew</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-600">
              <ShieldCheck className="w-3 h-3 text-oracle-400" /><span>End-to-end encrypted</span>
            </div>
          </div>

          <button onClick={createRoom} className="w-full group flex items-center gap-4 p-4 bg-dark-800 border border-dark-700 rounded-2xl hover:border-oracle-500/40 hover:bg-oracle-500/5 transition-all duration-300 mb-4 glow-oracle">
            <div className="bg-oracle-500/15 p-3 rounded-xl group-hover:bg-oracle-500/20 transition-colors"><Plus className="w-5 h-5 text-oracle-400" /></div>
            <div className="text-left"><h3 className="font-bold text-slate-100 font-display">Create Room</h3><p className="text-xs text-slate-500">Get a 4-digit code to share</p></div>
          </button>

          <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-dark-700" /><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">or</span><div className="flex-1 h-px bg-dark-700" /></div>

          <div className="p-4 bg-dark-800 border border-dark-700 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-primary-500/15 p-2.5 rounded-xl"><LogIn className="w-5 h-5 text-primary-400" /></div>
              <div><h3 className="font-bold text-slate-100 font-display">Join Room</h3><p className="text-xs text-slate-500">Enter your friend's code</p></div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-dark-900 border border-dark-700 rounded-xl px-3 focus-within:border-primary-500/40 transition-colors">
                <Hash className="w-4 h-4 text-slate-600" />
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(e) => e.key === 'Enter' && joinRoom()} placeholder="4-digit code" maxLength={4} className="flex-1 bg-transparent text-lg font-bold text-slate-200 placeholder:text-slate-600 outline-none py-3 tracking-[0.3em] text-center font-display" />
              </div>
              <button onClick={joinRoom} disabled={joinCode.length !== 4} className="px-5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95">Join</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ROOM VIEW ---
  return (
    <div className="flex flex-col h-[calc(100vh-220px)] max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <button onClick={leaveRoom} className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-oracle-400" /><h3 className="text-sm font-bold text-slate-200 font-display">VIP Room</h3></div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5 text-oracle-400" />Encrypted</p>
          </div>
        </div>
        <button onClick={copyCode} className="flex items-center gap-2 bg-oracle-500/10 border border-oracle-500/20 px-3 py-1.5 rounded-full hover:bg-oracle-500/20 transition-colors">
          <span className="text-sm font-bold text-oracle-400 tracking-wider font-display">{roomCode}</span>
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-oracle-400" />}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.user === user.name && !msg.isAI;
            if (msg.isAI) {
              return (<motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-2"><span className="text-xs text-slate-500 bg-dark-800 px-4 py-1.5 rounded-full border border-dark-700/50">{msg.text}</span></motion.div>);
            }
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isMe ? 'bg-oracle-500/15 border border-oracle-500/25' : 'bg-dark-750 border border-dark-600'}`}>{msg.avatar || '🏏'}</div>
                <div>
                  <div className={`flex items-baseline gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-bold text-slate-400">{msg.user}</span>
                    <span className="text-[9px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed max-w-[75%] ${isMe ? 'bg-oracle-600 text-white rounded-br-md' : 'bg-dark-750 text-slate-300 rounded-bl-md'}`}>{msg.text}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {messages.length <= 1 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500"><Users className="w-8 h-8 mb-3 opacity-30" /><p className="text-sm font-medium font-display">Waiting for your friends...</p><p className="text-xs mt-1 opacity-60">Share the room code to start chatting</p></div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-dark-700/50 glass-light">
        <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-2xl px-2 py-1 focus-within:border-oracle-500/40 transition-colors">
          <EmojiPicker onSelect={(emoji) => setInputText((prev) => prev + emoji)} />
          <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none py-2" />
          <button onClick={sendMessage} disabled={!inputText.trim()} className="p-2 rounded-xl bg-oracle-600 text-white hover:bg-oracle-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"><Send className="w-4 h-4" /></button>
        </div>
        {!isSupabaseConfigured() && (<div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-600"><Zap className="w-3 h-3" /><span>Demo mode — add Supabase for real-time sync</span></div>)}
      </div>
    </div>
  );
};
