import React, { useState, useRef, useEffect } from 'react';
import { DesignCategory, DesignAdvice, LoadingState } from './types';
import { cleanRoomImage, analyzeRoomDesign, generateDesignVisualizations } from './services/geminiService';
import { UploadIcon, SparklesIcon, CheckIcon, ArrowRightIcon, CameraIcon } from './components/Icons';

function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [cleanImage, setCleanImage] = useState<string | null>(null);
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [selectedCategory, setSelectedCategory] = useState<DesignCategory>(DesignCategory.LIGHTING);
  const [advice, setAdvice] = useState<DesignAdvice[]>([]);
  const [visualizations, setVisualizations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to process file
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setOriginalImage(event.target?.result as string);
      setCleanImage(null);
      setIsCleanMode(false);
      setAdvice([]);
      setVisualizations([]);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set to false if we are actually leaving the drop zone container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processFile(file);
      }
    }
  };

  const handleCleanCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    
    if (!originalImage) return;

    if (!checked) {
      setIsCleanMode(false);
      return;
    }

    // User checked the box
    if (cleanImage) {
      setIsCleanMode(true);
    } else {
      setLoadingState('cleaning');
      setError(null);
      try {
        const cleaned = await cleanRoomImage(originalImage);
        setCleanImage(cleaned);
        setIsCleanMode(true);
      } catch (err) {
        setError("Could not clean the room. Please try again.");
        // Revert checkbox if failed
        setIsCleanMode(false);
      } finally {
        setLoadingState('idle');
      }
    }
  };

  const handleAnalysis = async () => {
    if (!originalImage) return;
    
    const imageToAnalyze = isCleanMode && cleanImage ? cleanImage : originalImage;

    setLoadingState('analyzing');
    setAdvice([]);
    setVisualizations([]);
    setError(null);

    try {
      // Step 1: Get Text Advice
      const adviceResult = await analyzeRoomDesign(imageToAnalyze, selectedCategory);
      setAdvice(adviceResult);

      // Step 2: Generate Visualizations
      setLoadingState('visualizing');
      const visualResult = await generateDesignVisualizations(imageToAnalyze, selectedCategory, 4);
      setVisualizations(visualResult);
      
    } catch (err) {
      setError("Analysis failed. The AI might be busy, please try again.");
    } finally {
      setLoadingState('idle');
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const activeImage = isCleanMode && cleanImage ? cleanImage : originalImage;

  return (
    <div className="min-h-screen font-sans text-stone-900 bg-stone-50 selection:bg-stone-200">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-stone-50/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-stone-900 text-stone-50 flex items-center justify-center rounded-sm font-serif font-bold text-xl">L</div>
             <span className="font-serif text-2xl tracking-tight font-semibold">Lumina</span>
          </div>
          <div className="text-xs font-medium text-stone-500 uppercase tracking-widest hidden sm:block">AI Interior Architect</div>
        </div>
      </header>

      <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {!originalImage ? (
          /* Empty State / Landing */
          <div 
            className={`relative flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in-up rounded-3xl p-8 transition-all duration-300 border-2 border-dashed ${isDragging ? 'border-stone-800 bg-stone-200/50 scale-[1.02]' : 'border-transparent hover:border-stone-200'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-900/5 backdrop-blur-sm rounded-3xl pointer-events-none">
                    <p className="text-3xl font-serif font-bold text-stone-900 bg-white/80 px-8 py-4 rounded-full shadow-2xl">Drop image here</p>
                </div>
            )}

            <h1 className="font-serif text-5xl md:text-7xl text-stone-900 leading-[1.1]">
              Redesign your space<br />with literary wisdom.
            </h1>
            <p className="max-w-2xl text-lg text-stone-600 font-light">
              Upload a wide-angle photo of your room. Lumina analyzes it against the top 10 interior design books to provide bespoke lighting, layout, and decor advice.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center relative z-10">
               {/* Option 1: Upload from Gallery/File */}
               <button 
                onClick={triggerUpload}
                className="group relative px-8 py-4 bg-stone-900 text-white font-medium text-lg rounded-full overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 min-w-[200px]"
               >
                 <span className="relative z-10 flex items-center justify-center gap-3">
                   <UploadIcon />
                   Upload Image
                 </span>
                 <div className="absolute inset-0 bg-stone-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
               </button>

               {/* Option 2: Direct Camera Access */}
               <div className="relative group min-w-[200px]">
                 <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    id="cameraInput"
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="cameraInput" className="cursor-pointer flex items-center justify-center gap-3 px-8 py-4 bg-white border border-stone-200 text-stone-900 font-medium text-lg rounded-full shadow-lg hover:shadow-xl hover:bg-stone-50 transition-all duration-300 transform hover:-translate-y-1">
                     <CameraIcon />
                     Open Camera
                  </label>
                  <div className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-stone-400 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    Use 0.5x Wide Lens for best results
                  </div>
               </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            <p className="text-sm text-stone-400 mt-4">Drag & Drop supported • JPG, PNG • Best with Wide Angle</p>
          </div>
        ) : (
          /* Dashboard */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Left Column: Image Viewer */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="relative group rounded-2xl overflow-hidden shadow-2xl bg-stone-200 aspect-[4/3]">
                {activeImage && (
                  <img 
                    src={activeImage} 
                    alt="Room analysis" 
                    className={`w-full h-full object-cover transition-all duration-700 ${loadingState === 'cleaning' ? 'blur-sm scale-105' : 'scale-100'}`} 
                  />
                )}
                
                {/* Image Controls Overlay */}
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md px-5 py-3 rounded-full shadow-lg border border-white/20">
                         {/* Clean Room Checkbox */}
                         <div className="flex items-center gap-3">
                            <div className="relative flex items-center">
                              <input 
                                type="checkbox"
                                id="cleanMode"
                                checked={isCleanMode}
                                onChange={handleCleanCheck}
                                disabled={loadingState === 'cleaning'}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-stone-400 transition-all checked:border-emerald-500 checked:bg-emerald-500 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            <label htmlFor="cleanMode" className={`text-sm font-medium cursor-pointer select-none ${loadingState === 'cleaning' ? 'text-stone-400 animate-pulse' : 'text-stone-800'}`}>
                                {loadingState === 'cleaning' ? "Tidying up..." : "Clean my room"}
                            </label>
                         </div>
                    </div>

                    <div>
                         <button onClick={triggerUpload} className="bg-stone-900/80 hover:bg-stone-900 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md transition-colors shadow-lg">
                            New Image
                         </button>
                    </div>
                </div>
              </div>

              {/* Visualizations Gallery */}
              {visualizations.length > 0 && (
                 <div className="space-y-4 animate-fade-in">
                    <h3 className="font-serif text-2xl text-stone-900">Visualizations: {selectedCategory} Principles</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {visualizations.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-stone-200 group shadow-md hover:shadow-xl transition-all duration-300">
                                <img src={img} alt={`Variant ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <span className="text-white text-xs font-medium tracking-wide">Option {idx + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
              )}
               {loadingState === 'visualizing' && (
                  <div className="grid grid-cols-2 gap-4 animate-pulse">
                      {[1,2,3,4].map(i => (
                          <div key={i} className="aspect-square bg-stone-200 rounded-xl flex items-center justify-center">
                              <SparklesIcon />
                          </div>
                      ))}
                  </div>
               )}
            </div>

            {/* Right Column: Controls & Advice */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              
              {/* Category Selector */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                <label className="block text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Select Design Focus</label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(DesignCategory).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 border ${
                        selectedCategory === cat 
                        ? 'bg-stone-900 text-white border-stone-900 shadow-md' 
                        : 'bg-transparent text-stone-600 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                    <button
                        onClick={handleAnalysis}
                        disabled={loadingState !== 'idle'}
                        className="w-full py-4 bg-stone-900 text-white rounded-xl font-medium text-lg shadow-lg hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
                    >
                        {loadingState === 'analyzing' || loadingState === 'visualizing' ? (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></span>
                                Consulting Top 10 Books...
                            </span>
                        ) : (
                            <>
                                <span>Generate Ideas</span>
                                <ArrowRightIcon />
                            </>
                        )}
                    </button>
                </div>
                {error && <p className="mt-4 text-red-500 text-sm text-center">{error}</p>}
              </div>

              {/* Recommendations List */}
              {advice.length > 0 ? (
                <div className="space-y-6">
                  {advice.map((item, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-serif italic font-bold">
                            {index + 1}
                        </span>
                        <div>
                            <h4 className="font-serif text-xl font-semibold text-stone-900 mb-2">{item.title}</h4>
                            <p className="text-stone-600 leading-relaxed mb-4 text-sm">{item.description}</p>
                            <div className="inline-block px-3 py-1 bg-stone-50 border border-stone-200 rounded-full text-xs text-stone-500 font-medium tracking-wide">
                                📖 {item.principleSource}
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                  !loadingState && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400">
                        <SparklesIcon />
                        <p className="mt-2 text-sm font-medium">Select a category and click "Generate Ideas" to receive professional design consultation.</p>
                    </div>
                  )
              )}

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;