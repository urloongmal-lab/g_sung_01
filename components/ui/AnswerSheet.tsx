import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarData } from '../../types';
import { X, Search } from './Icons';
import * as THREE from 'three';

interface AnswerSheetProps {
  star: StarData | null; // The viewing star (content)
  anchorStar: StarData | null; // The session root (context)
  allStars: StarData[]; 
  isOpen: boolean;
  onClose: () => void;
  onSelectNeighbor: (star: StarData) => void; 
  isStreaming: boolean;
}

export const AnswerSheet: React.FC<AnswerSheetProps> = ({ star, anchorStar, allStars, isOpen, onClose, onSelectNeighbor, isStreaming }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [star?.answer, isStreaming]);

  // STRICT NEIGHBOR LOGIC - BASED ON ANCHOR STAR to keep context stable
  const neighbors = useMemo(() => {
    // If no anchor, fallback to current star
    const root = anchorStar || star;
    if (!root) return [];
    
    // 1. Filter stars that are NOT the root
    const others = allStars.filter(s => s.id !== root.id);

    // 2. Prioritize EXACT topic match
    const sameTopic = others.filter(s => s.topic && root.topic && s.topic === root.topic);
    
    // If we have same-topic stars, sort them by distance to ROOT and take top 3
    if (sameTopic.length > 0) {
      return sameTopic.sort((a, b) => {
        const distA = new THREE.Vector3(a.position.x, a.position.y, a.position.z).distanceTo(new THREE.Vector3(root.position.x, root.position.y, root.position.z));
        const distB = new THREE.Vector3(b.position.x, b.position.y, b.position.z).distanceTo(new THREE.Vector3(root.position.x, root.position.y, root.position.z));
        return distA - distB;
      }).slice(0, 3);
    }

    // Fallback: If no topic match, just take closest distance to ROOT
    return others.map(s => ({
        star: s,
        dist: new THREE.Vector3(s.position.x, s.position.y, s.position.z)
          .distanceTo(new THREE.Vector3(root.position.x, root.position.y, root.position.z))
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(item => item.star);

  }, [anchorStar, star, allStars]);

  const handlePerplexitySearch = () => {
    if (!star) return;
    const query = encodeURIComponent(star.content);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  // Helper to parse bold markdown **text** to <b>text</b>
  const formatText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => 
      index % 2 === 1 ? <b key={index} className="text-indigo-200 font-bold">{part}</b> : part
    );
  };

  // Is the user viewing a neighbor and not the original anchor?
  const isDrifted = anchorStar && star && anchorStar.id !== star.id;

  return (
    <AnimatePresence>
      {isOpen && star && (
        <div className="absolute inset-0 z-[60] pointer-events-none flex flex-col justify-start">
          
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/20 pointer-events-auto backdrop-blur-[2px]" 
            onClick={onClose}
          />
          
          {/* Sheet / Card */}
          <motion.div 
            initial={{ y: "-100%", opacity: 0.8 }} 
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }} 
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 300, 
              mass: 1.2 
            }}
            className="relative z-50 bg-[#020617]/90 border-b border-indigo-500/20 backdrop-blur-xl w-full max-h-[75vh] flex flex-col pointer-events-auto rounded-b-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Header (Fixed) */}
            <div className="flex-none flex items-start justify-between p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-indigo-900/10 to-transparent">
              <div className="flex-1 pr-6">
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase tracking-widest bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/20">
                    {star.topic || 'Analysing...'}
                   </span>
                   {isDrifted && (
                       <button 
                         onClick={() => onSelectNeighbor(anchorStar!)}
                         className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
                       >
                         <span className="w-1 h-1 rounded-full bg-emerald-400" />
                         Back to Center
                       </button>
                   )}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white leading-tight drop-shadow-sm">
                  {star.content}
                </h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 -mt-2 bg-transparent rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Answer Area */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto p-6 pt-4 font-sans text-slate-300 leading-relaxed text-base scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent"
            >
               <div className="whitespace-pre-wrap max-w-prose">
                 {formatText(star.answer)}
                 {isStreaming && (
                   <motion.span 
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="inline-block w-2 h-4 ml-1 bg-indigo-400 align-middle" 
                   />
                 )}
               </div>

               {/* MOVED EXPLORE BUTTON TO RIGHT */}
               {!isStreaming && (
                 <div className="mt-6 flex justify-end">
                    <button 
                      onClick={handlePerplexitySearch}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/10 hover:bg-indigo-600/20 text-[10px] font-bold text-indigo-300 transition-colors border border-indigo-500/20 hover:border-indigo-500/40 uppercase tracking-wider"
                    >
                      <Search className="w-3 h-3" /> 
                      Explore More
                    </button>
                 </div>
               )}
            </div>

            {/* Footer Actions (Neighbors) */}
            {!isStreaming && neighbors.length > 0 && (
               <div className="flex-none p-6 pt-4 bg-[#020617]/80 backdrop-blur-xl border-t border-indigo-500/10 z-10">
                 <div className="flex flex-col gap-3">
                   
                   {/* Connected Stars Section */}
                   <div className="mb-0">
                       <h4 className="text-[10px] font-mono text-indigo-300/60 uppercase tracking-widest mb-3 flex items-center gap-2 whitespace-nowrap overflow-hidden">
                         <span className="w-8 h-[1px] bg-indigo-500/30 shrink-0"></span>
                         Curiostar Link
                         <span className="w-full h-[1px] bg-indigo-500/30 shrink"></span>
                       </h4>
                       <div className="grid grid-cols-1 gap-2">
                         {neighbors.map(neighbor => {
                           // Highlight if this neighbor is the one currently being viewed
                           const isActive = neighbor.id === star.id;
                           
                           return (
                             <button
                               key={neighbor.id}
                               onClick={() => onSelectNeighbor(neighbor)}
                               className={`text-left px-3 py-2.5 rounded-lg border transition-all group flex items-center gap-3 w-full ${
                                 isActive 
                                   ? 'bg-indigo-600/20 border-indigo-500/50' 
                                   : 'bg-white/5 border-transparent hover:bg-indigo-600/10 hover:border-indigo-500/30'
                               }`}
                             >
                               <div className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                                   isActive ? 'bg-indigo-300 shadow-[0_0_8px_rgba(99,102,241,1)]' : 'bg-indigo-500 group-hover:bg-indigo-400'
                               }`} />
                               <span className={`text-xs truncate flex-1 ${isActive ? 'text-white font-semibold' : 'text-slate-300 group-hover:text-white'}`}>
                                 {neighbor.content}
                               </span>
                             </button>
                           );
                         })}
                       </div>
                     </div>
                 </div>
               </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};