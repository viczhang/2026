import React, { useState } from 'react';
import FireworksDisplay from './components/FireworksDisplay';

const App: React.FC = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <FireworksDisplay audioEnabled={audioEnabled} />
      
      {/* Audio Toggle Button */}
      <button 
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="absolute top-4 right-4 z-50 p-2 text-white/50 hover:text-white transition-colors duration-300"
        aria-label={audioEnabled ? "Mute sound" : "Unmute sound"}
      >
        {audioEnabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        )}
      </button>

      {/* Optional Overlay UI for interactivity or credits if needed, currently kept minimal for aesthetic focus */}
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-50">
        <p className="text-white text-xs font-light tracking-widest uppercase">Happy New Year</p>
      </div>
    </div>
  );
};

export default App;