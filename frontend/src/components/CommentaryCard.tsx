import React from 'react';
import { motion } from 'framer-motion';
import { Mic2, UserSquare2, Zap, Languages } from 'lucide-react';
import type { AgentEvent } from '../hooks/useLiveMatch';
import { useLanguage, LANGUAGES, type LangCode } from '../context/LanguageContext';

function getCommentaryText(content: AgentEvent['content'], lang: LangCode): string {
  const langFieldMap: Record<LangCode, string | undefined> = {
    en: content.stylized_text_en,
    hi: content.stylized_text_hi,
    bho: content.stylized_text_bho,
  };
  return langFieldMap[lang] || content.stylized_text_en || content.stylized_text || '';
}

export const CommentaryCard: React.FC<{ event: AgentEvent }> = ({ event }) => {
  const { language } = useLanguage();

  const persona = event.content.persona || 'Commentator';
  const isMeme = persona.toLowerCase().includes('meme');
  const isNerd = persona.toLowerCase().includes('nerd');

  const colorScheme = isMeme
    ? { icon: 'text-pink-400', bg: 'bg-pink-500/15', border: 'border-l-pink-500', glow: 'from-pink-500/10' }
    : isNerd
    ? { icon: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-l-blue-500', glow: 'from-blue-500/10' }
    : { icon: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-l-orange-500', glow: 'from-orange-500/10' };

  const commentaryText = getCommentaryText(event.content, language);
  const langInfo = LANGUAGES.find((l) => l.code === language);
  const hasMultilingual = !!(event.content.stylized_text_en || event.content.stylized_text_hi || event.content.stylized_text_bho);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-[#0A0A0A] border border-white/10 ${colorScheme.border} border-l-[2px] rounded-2xl p-5 relative overflow-hidden card-hover`}
    >
      {/* Persona subtle glow */}
      <div className={`absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br ${colorScheme.glow} to-transparent rounded-full blur-3xl pointer-events-none opacity-30`} />

      <div className="flex items-start gap-4 relative z-10">
        <div className={`p-3 rounded-xl flex-shrink-0 ${colorScheme.bg}`}>
          {isMeme ? <Zap className={`w-5 h-5 ${colorScheme.icon}`} /> : <UserSquare2 className={`w-5 h-5 ${colorScheme.icon}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h3 className="font-bold text-slate-100 font-display text-sm truncate">{persona}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasMultilingual && langInfo && (
                <span className="text-[9px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Languages className="w-2.5 h-2.5" />
                  {langInfo.flag}
                </span>
              )}
              <span className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1">
                <Mic2 className="w-3 h-3" /> Live
              </span>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-3">{event.title}</p>

          <div className="bg-[#111111] rounded-xl p-4 border border-white/5">
            <p className="text-slate-200 text-[15px] leading-relaxed italic font-medium">
              "{commentaryText}"
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
