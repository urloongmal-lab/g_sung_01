import React from 'react';
import { StarData } from '../../types';
import { X } from './Icons';

interface MyPageProps {
  stars: StarData[];
  isOpen: boolean;
  onClose: () => void;
  onSelectStar: (star: StarData) => void;
}

export const MyPage: React.FC<MyPageProps> = ({ stars, isOpen, onClose, onSelectStar }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-[#020617]/95 backdrop-blur-2xl border-l border-white/5 z-50 transform transition-transform duration-300 flex flex-col shadow-2xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h2 className="text-lg font-semibold text-indigo-200 tracking-wide">Star Log</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {stars.length === 0 ? (
          <div className="text-white/30 text-center py-20 font-light text-sm">
            The universe is empty.<br/>Ask a question to begin.
          </div>
        ) : (
          stars.slice().reverse().map((star) => (
            <div 
              key={star.id}
              onClick={() => onSelectStar(star)}
              className="p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-indigo-900/30 hover:border-indigo-500/30 transition-all cursor-pointer group"
            >
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-2 flex justify-between">
                <span>{star.topic || 'UNKNOWN'}</span>
                <span className="opacity-50 text-white">{new Date(star.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="text-sm text-slate-300 font-medium leading-snug group-hover:text-white transition-colors">
                {star.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/5 text-[10px] text-center text-white/20 uppercase tracking-widest">
        Total Discoveries: {stars.length}
      </div>
    </div>
  );
};