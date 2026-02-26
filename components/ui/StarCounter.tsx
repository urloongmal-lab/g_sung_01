import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StarCounterProps {
  count: number;
}

const Digit: React.FC<{ value: string }> = ({ value }) => (
  <div className="relative h-6 w-3.5 overflow-hidden inline-block align-top mx-[1px]">
    <AnimatePresence mode='popLayout'>
      <motion.span
        key={value}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold text-indigo-300 drop-shadow-md"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </div>
);

export const StarCounter: React.FC<StarCounterProps> = ({ count }) => {
  const digits = count.toString().padStart(5, '0').split('');

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        {digits.map((digit, index) => (
          <Digit key={`${index}-${digit}`} value={digit} />
        ))}
      </div>
      <span className="text-[10px] text-indigo-300/60 tracking-[0.2em] uppercase mt-1">
        Curiostars shining
      </span>
    </div>
  );
};