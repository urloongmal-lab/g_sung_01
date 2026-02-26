import React, { useState, useEffect, useCallback } from 'react';
import { Universe } from './components/canvas/Universe';
import { ChatInput as InputComponent } from './components/ui/ChatInput';
import { AnswerSheet } from './components/ui/AnswerSheet';
import { MyPage } from './components/ui/MyPage';
import { StarCounter } from './components/ui/StarCounter';
import { MenuFab } from './components/ui/MenuFab';
import { StarData, AppState } from './types';
import { generateMockStars } from './services/mockData';
import { streamStarResponse, calculateStarPosition } from './services/geminiService';
import { LogoEclipse1, LogoEclipse2, LogoEclipse3, LogoEclipse4, X, Eye, EyeOff } from './components/ui/Icons';
import { AnimatePresence, motion } from 'framer-motion';

const App: React.FC = () => {
  const [stars, setStars] = useState<StarData[]>(() => generateMockStars(60));
  const [totalCount, setTotalCount] = useState(1284);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // AnchorStar: The star originally clicked in 3D space (determines connection lines & neighbor list)
  const [anchorStar, setAnchorStar] = useState<StarData | null>(null);
  // ViewingStar: The star currently displayed in the sheet & focused by camera
  const [viewingStar, setViewingStar] = useState<StarData | null>(null);

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isMyPageOpen, setMyPageOpen] = useState(false);
  const [showUI, setShowUI] = useState(true); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);

  // New State: Toggle HUD in Voyage Mode
  const [showVoyageHud, setShowVoyageHud] = useState(true);



  useEffect(() => {
    const interval = setInterval(() => {
      setTotalCount(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Called when clicking a star in the 3D Universe
  const handleStarSelect = useCallback((star: StarData) => {
    setAnchorStar(star); // Set the context root
    setViewingStar(star); // Set the initial view
    setSheetOpen(true);
    setAppState(AppState.VIEWING);
    setIsMenuOpen(false);
  }, []);

  // Called when clicking a link in the AnswerSheet
  const handleNeighborSelect = useCallback((star: StarData) => {
    setViewingStar(star); // Only update the view, keep the anchor (lines)
    // We do NOT update anchorStar here, preserving the context
  }, []);

  const handleSendQuestion = async (question: string) => {
    setAppState(AppState.STREAMING);
    setSheetOpen(true);
    setMyPageOpen(false);
    setIsMenuOpen(false);

    // Pass existing stars for spacing check
    const tempPos = await calculateStarPosition(question, true, stars);
    
    const newStar: StarData = {
      id: `new-${Date.now()}`,
      content: question,
      answer: '', 
      position: tempPos,
      createdAt: new Date().toISOString(),
      topic: 'Processing...',
    };

    setStars(prev => [...prev, newStar]);
    setTotalCount(prev => prev + 1); 
    
    setAnchorStar(newStar);
    setViewingStar(newStar);

    try {
      await streamStarResponse(question, (chunk) => {
        setStars(prev => prev.map(s => 
          s.id === newStar.id 
            ? { ...s, answer: chunk } 
            : s
        ));
        // Update viewingStar answer in real-time
        setViewingStar(prev => prev?.id === newStar.id ? { ...prev, answer: chunk } : prev);
        // Also update anchor if it's the same
        setAnchorStar(prev => prev?.id === newStar.id ? { ...prev, answer: chunk } : prev);
      });
      setAppState(AppState.VIEWING);
    } catch (e) {
      console.error(e);
      setAppState(AppState.IDLE);
    }
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setAnchorStar(null);
    setViewingStar(null);
    setAppState(AppState.IDLE);
  };

  const toggleUI = () => {
    setShowUI(!showUI);
    if (showUI) { 
      setSheetOpen(false);
      setMyPageOpen(false);
      setAnchorStar(null);
      setViewingStar(null);
      setIsMenuOpen(false);
    }
  };

  const renderLogo = () => {
    const props = { 
        className: "w-8 h-8 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer hover:text-white transition-colors duration-300",
        onClick: () => setLogoIndex((prev) => (prev + 1) % 4)
    };
    switch(logoIndex) {
        case 0: return <LogoEclipse1 {...props} />;
        case 1: return <LogoEclipse2 {...props} />;
        case 2: return <LogoEclipse3 {...props} />;
        case 3: return <LogoEclipse4 {...props} />;
        default: return <LogoEclipse1 {...props} />;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050510] text-white select-none">
      {/* 3D Universe Layer */}
      <Universe 
        stars={stars} 
        anchorStar={anchorStar}
        viewingStar={viewingStar}
        onStarSelect={handleStarSelect}
        isVoyageMode={!showUI}
        showVoyageHud={showVoyageHud}
      />

      {/* UI Overlay Layer */}
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: showUI ? 1 : 0 }}
         transition={{ duration: 0.8 }}
         className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between"
      >
        
        {/* Top Header */}
        <div className="w-full pt-safe-top pt-8 flex flex-col items-center justify-center pointer-events-auto pb-6 space-y-3">
            <motion.div 
               whileHover={{ scale: 1.05 }}
               className="flex items-center gap-2 p-2 rounded-full bg-black/10 backdrop-blur-sm border border-white/5"
            >
                {renderLogo()}
                <h1 className="text-lg font-bold tracking-tight text-white/90 cursor-default font-mono">
                Curiostar
                </h1>
            </motion.div>
            <StarCounter count={totalCount} />
        </div>

        {/* Bottom Area */}
        <div 
          className="w-full px-6 flex items-end justify-between gap-4"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          
          {/* Input Area */}
          <div className={`flex-1 max-w-sm transition-all duration-500 transform origin-left ${isMenuOpen ? 'opacity-0 scale-90 translate-y-4 pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}>
            {/* Hide input if sheet is open to prevent visual clutter, but keep layout stable */}
            <div className={`${isSheetOpen || isMyPageOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'} transition-opacity duration-300`}>
                <InputComponent onSend={handleSendQuestion} appState={appState} />
            </div>
          </div>
          
          {/* Menu FAB */}
          <div className="pointer-events-auto ml-auto shrink-0 z-50">
             <MenuFab 
                isOpen={isMenuOpen}
                onToggle={() => setIsMenuOpen(!isMenuOpen)}
                showUI={showUI} 
                onToggleUI={toggleUI} 
                onOpenMyPage={() => { setMyPageOpen(true); setSheetOpen(false); }}
                onOpenSettings={() => alert("Settings System: Online")} 
             />
          </div>
        </div>
      </motion.div>

      {/* Voyage Mode Controls (Bottom Center) */}
      <AnimatePresence>
        {!showUI && (
           <motion.div 
              initial={{ y: 100, opacity: 0, x: "-50%" }}
              animate={{ y: 0, opacity: 1, x: "-50%" }}
              exit={{ y: 100, opacity: 0, x: "-50%" }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute bottom-10 left-1/2 z-50 pointer-events-auto flex items-center gap-4"
           >
             {/* HUD Toggle Button - Blue Theme, 50% Opacity */}
             <button
                onClick={() => setShowVoyageHud(!showVoyageHud)}
                className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-[#0f172a] bg-opacity-50 backdrop-blur-md border border-indigo-500/20 text-indigo-300 hover:bg-opacity-80 hover:border-indigo-500/50 hover:text-white transition-all shadow-lg opacity-50 hover:opacity-100"
                title={showVoyageHud ? "Hide HUD" : "Show HUD"}
             >
                {showVoyageHud ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
             </button>

             {/* Abort Button - UPDATED: Blue Theme (same as HUD), 50% Opacity */}
             <button 
                onClick={() => setShowUI(true)}
                className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-[#0f172a] bg-opacity-50 backdrop-blur-md border border-indigo-500/20 text-indigo-300 hover:bg-opacity-80 hover:border-indigo-500/50 hover:text-white transition-all shadow-lg opacity-50 hover:opacity-100"
                title="Stop Voyage"
              >
                <X className="w-5 h-5" />
                <span className="absolute -top-8 text-[9px] font-mono text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                  STOP VOYAGE
                </span>
              </button>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Answer Sheet */}
      <AnswerSheet 
        star={viewingStar}    // The content we are looking at
        anchorStar={anchorStar} // The context root (for maintaining connections)
        allStars={stars}
        isOpen={isSheetOpen} 
        onClose={handleSheetClose}
        onSelectNeighbor={handleNeighborSelect} // Uses special handler
        isStreaming={appState === AppState.STREAMING}
      />

      <MyPage 
        stars={stars}
        isOpen={isMyPageOpen && showUI}
        onClose={() => setMyPageOpen(false)}
        onSelectStar={handleStarSelect}
      />
    </div>
  );
};

export default App;