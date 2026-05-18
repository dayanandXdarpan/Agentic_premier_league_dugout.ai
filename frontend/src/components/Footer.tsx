import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Cpu, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="w-full border-t border-white/5 bg-black px-4 py-4 mt-2"
    >
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
        {/* Brand row */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
            <Cpu className="w-3 h-3 text-primary-400" />
          </div>
          <span className="text-xs font-black text-white tracking-wide font-display">DUGOUT<span className="text-primary-400">.AI</span></span>
        </div>

        {/* Copyright */}
        <p className="text-[10px] text-slate-600 flex items-center gap-1 flex-wrap justify-center text-center">
          <span>© {year} Crafted with</span>
          <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500 flex-shrink-0" />
          <span>by</span>
          <a
            href="https://www.dayananddarpan.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-slate-400 hover:text-primary-400 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-primary-400/50 flex items-center gap-0.5"
          >
            dayananddarpan.in
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <span>· Powered by Gemini 1.5 Flash &amp; Google Cloud</span>
        </p>

        {/* Tagline */}
        <p className="text-[9px] text-slate-700 tracking-widest uppercase">
          Built for Google Cloud Hackathon 2026
        </p>
      </div>
    </motion.footer>
  );
};
