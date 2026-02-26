import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, EyeOff, Layers, Settings } from './Icons';

interface MenuFabProps {
  isOpen: boolean;
  onToggle: () => void;
  showUI: boolean;
  onToggleUI: () => void;
  onOpenMyPage: () => void;
  onOpenSettings: () => void;
}

export const MenuFab: React.FC<MenuFabProps> = ({ 
  isOpen,
  onToggle,
  showUI, 
  onToggleUI, 
  onOpenMyPage, 
  onOpenSettings 
}) => {
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.0
      }
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.9 }
  };

  return (
    // Explicitly set h-14 w-14 to match the ChatInput height.
    <div className="relative z-50 h-14 w-14 flex items-center justify-center">
      
      {/* Floating Menu Items - Perfectly Centered Axis */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute bottom-full mb-4 flex flex-col items-center gap-3 w-14" 
          >
             {/* Settings */}
             <motion.div variants={itemVariants} className="relative flex items-center justify-center w-full">
               {/* Label: Absolute position to the left */}
               <span className="absolute right-full mr-4 whitespace-nowrap text-xs font-mono text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  Settings
               </span>
              <button
                onClick={() => { onOpenSettings(); onToggle(); }}
                className="w-12 h-12 flex items-center justify-center bg-[#0f172a]/90 border border-indigo-500/20 rounded-full hover:bg-white/10 text-white/80 transition-all shadow-lg backdrop-blur-xl shrink-0"
              >
                <Settings className="w-5 h-5" />
              </button>
            </motion.div>

            {/* My Stars */}
            <motion.div variants={itemVariants} className="relative flex items-center justify-center w-full">
              <span className="absolute right-full mr-4 whitespace-nowrap text-xs font-mono text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  My Stars
               </span>
              <button
                onClick={() => { onOpenMyPage(); onToggle(); }}
                className="w-12 h-12 flex items-center justify-center bg-[#0f172a]/90 border border-indigo-500/20 rounded-full hover:bg-white/10 text-white/80 transition-all shadow-lg backdrop-blur-xl shrink-0"
              >
                <Layers className="w-5 h-5" />
              </button>
            </motion.div>

            {/* Navigation Mode (Voyage) */}
            <motion.div variants={itemVariants} className="relative flex items-center justify-center w-full">
               <span className="absolute right-full mr-4 whitespace-nowrap text-xs font-mono text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {showUI ? 'Voyage' : 'Exit Voyage'}
               </span>
              <button
                onClick={() => { onToggleUI(); onToggle(); }}
                className={`w-12 h-12 flex items-center justify-center rounded-full border border-indigo-500/20 shadow-lg backdrop-blur-xl transition-all shrink-0 ${
                    !showUI ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#0f172a]/90 text-white/80 hover:bg-white/10'
                }`}
              >
                {showUI ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Button */}
      <button
        onClick={onToggle}
        className={`relative h-14 w-14 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 bg-[#0f172a]/90 backdrop-blur-xl border border-indigo-500/20 hover:border-indigo-500/40 group`}
      >
        <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-45 text-white' : 'rotate-0 text-indigo-400'}`}>
          <Plus className="w-6 h-6" />
        </div>
      </button>
    </div>
  );
};