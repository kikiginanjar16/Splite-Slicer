
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SpriteRect, SlicingMode, GridSettings } from './types';
import { detectSprites, generateGridRects, sliceToBlob } from './utils/imageUtils';
import { analyzeSpriteSheet } from './services/geminiService';

const App: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rects, setRects] = useState<SpriteRect[]>([]);
  const [mode, setMode] = useState<SlicingMode>(SlicingMode.AUTO);
  const [minSize, setMinSize] = useState(4);
  const [padding, setPadding] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);

  // Grid Settings
  const [grid, setGrid] = useState<GridSettings>({
    columns: 4,
    rows: 4,
    cellWidth: 0,
    cellHeight: 0,
    padding: 0,
    margin: 0
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setRects([]);
          setAiAnalysis(null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerDetection = useCallback(() => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    // Draw the image onto the canvas first to ensure we have pixel data
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      
      if (mode === SlicingMode.AUTO) {
        const detected = detectSprites(canvas, minSize, padding);
        setRects(detected);
      } else {
        const generated = generateGridRects(image.width, image.height, grid);
        setRects(generated);
      }
    }
  }, [image, mode, minSize, padding, grid]);

  // Re-run detection when parameters change
  useEffect(() => {
    if (image) {
      triggerDetection();
    }
  }, [image, mode, minSize, padding, grid, triggerDetection]);

  const handleAiEnhance = async () => {
    if (!image || !canvasRef.current) return;
    setIsAnalyzing(true);
    
    try {
      if (process.env.API_KEY) {
        const base64 = canvasRef.current.toDataURL('image/png').split(',')[1];
        if (base64) {
          const analysis = await analyzeSpriteSheet(base64);
          setAiAnalysis(analysis);
          
          if (analysis && analysis.suggestedNames) {
            setRects(prev => prev.map((r, i) => ({
              ...r,
              name: analysis.suggestedNames[i] || r.name
            })));
          }
        }
      } else {
        alert("API Key missing. AI enhancement unavailable.");
      }
    } catch (e) {
      console.warn("AI enhancement failed:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadSingle = async (rect: SpriteRect) => {
    if (!canvasRef.current) return;
    const blob = await sliceToBlob(canvasRef.current, rect);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rect.name || 'sprite'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadAll = async () => {
    alert("Exporting all sprites... (In a full app, this would generate a ZIP file)");
    for (const rect of rects) {
      await downloadSingle(rect);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <i className="fas fa-layer-group text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">SpriteMaster <span className="text-blue-500">AI</span></h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Pixel-Perfect Slicing</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-lg transition-all border border-slate-700"
          >
            <i className="fas fa-upload"></i>
            Upload Sprite Sheet
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
            accept="image/*" 
          />
          
          <button 
            onClick={downloadAll}
            disabled={rects.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold rounded-lg transition-all shadow-lg shadow-blue-600/30"
          >
            <i className="fas fa-download"></i>
            Export All ({rects.length})
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-6 overflow-y-auto custom-scrollbar">
          <section className="mb-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
              <i className="fas fa-cog"></i> Slicing Parameters
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Detection Mode</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button 
                    onClick={() => setMode(SlicingMode.AUTO)}
                    className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${mode === SlicingMode.AUTO ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Auto Detect
                  </button>
                  <button 
                    onClick={() => setMode(SlicingMode.GRID)}
                    className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${mode === SlicingMode.GRID ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Grid Layout
                  </button>
                </div>
              </div>

              {mode === SlicingMode.AUTO ? (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-300">Min. Size (px)</label>
                      <span className="text-xs font-mono text-blue-400">{minSize}px</span>
                    </div>
                    <input 
                      type="range" min="1" max="64" value={minSize} 
                      onChange={(e) => setMinSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-300">Padding</label>
                      <span className="text-xs font-mono text-blue-400">{padding}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="20" value={padding} 
                      onChange={(e) => setPadding(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Columns</label>
                      <input 
                        type="number" min="1" value={grid.columns}
                        onChange={(e) => setGrid({...grid, columns: parseInt(e.target.value) || 1, cellWidth: 0})}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Rows</label>
                      <input 
                        type="number" min="1" value={grid.rows}
                        onChange={(e) => setGrid({...grid, rows: parseInt(e.target.value) || 1, cellHeight: 0})}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Cell Width (px)</label>
                      <input 
                        type="number" min="0" value={grid.cellWidth}
                        placeholder="Auto"
                        onChange={(e) => setGrid({...grid, cellWidth: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Cell Height (px)</label>
                      <input 
                        type="number" min="0" value={grid.cellHeight}
                        placeholder="Auto"
                        onChange={(e) => setGrid({...grid, cellHeight: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleAiEnhance}
                disabled={!image || isAnalyzing}
                className="w-full py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> Processing...</>
                ) : (
                  <><i className="fas fa-robot"></i> Smart AI Naming</>
                )}
              </button>
            </div>
          </section>

          {aiAnalysis && (
            <section className="mb-8 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
              <h2 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                <i className="fas fa-sparkles"></i> AI Insights
              </h2>
              <div className="text-sm">
                <p className="font-bold text-slate-200 mb-1">{aiAnalysis.title}</p>
                <p className="text-slate-400 text-xs mb-3">Category: {aiAnalysis.category}</p>
                <p className="text-slate-300 text-xs leading-relaxed">{aiAnalysis.description}</p>
              </div>
            </section>
          )}

          <section className="flex-1 min-h-0 flex flex-col">
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
              <i className="fas fa-list"></i> Sprite List ({rects.length})
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {rects.map((rect, idx) => (
                <div 
                  key={rect.id}
                  onClick={() => setSelectedSpriteId(rect.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${selectedSpriteId === rect.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center shrink-0 border border-slate-700">
                        <span className="text-[10px] text-slate-500">{idx+1}</span>
                    </div>
                    <span className="text-xs font-medium truncate text-slate-200">{rect.name}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadSingle(rect); }}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              ))}
              {rects.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <i className="fas fa-images text-slate-700 text-3xl mb-3"></i>
                  <p className="text-xs text-slate-500">No sprites yet.</p>
                </div>
              )}
            </div>
          </section>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-12 flex items-center justify-center custom-scrollbar">
            {!image ? (
              <div 
                className="w-full max-w-2xl aspect-video border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-6 group hover:border-blue-500/50 transition-all bg-slate-900/20"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleImageUpload({ target: { files: [file] } } as any);
                }}
              >
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-blue-600/10 transition-all">
                  <i className="fas fa-cloud-upload-alt text-3xl text-slate-600 group-hover:text-blue-500"></i>
                </div>
                <div className="text-center px-6">
                  <h3 className="text-xl font-bold text-slate-200 mb-2">Drop your sprite sheet here</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Upload a PNG/JPEG. Our algorithm will detect isolated sprites with transparent backgrounds automatically.</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="relative inline-block shadow-2xl rounded shadow-black/80 ring-8 ring-slate-900/30">
                <div className="canvas-bg absolute inset-0"></div>
                <canvas 
                  ref={canvasRef} 
                  className="relative block max-w-full h-auto"
                />
                {/* Visual overlays for detected rects */}
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${image.width} ${image.height}`}
                >
                  {rects.map((rect) => (
                    <g key={rect.id}>
                      <rect
                        x={rect.x}
                        y={rect.y}
                        width={rect.width}
                        height={rect.height}
                        fill={selectedSpriteId === rect.id ? "rgba(59, 130, 246, 0.4)" : "transparent"}
                        stroke={selectedSpriteId === rect.id ? "#60a5fa" : "rgba(59, 130, 246, 0.5)"}
                        strokeWidth={Math.max(1, image.width / 800)}
                        className="transition-all duration-200"
                      />
                      {selectedSpriteId === rect.id && (
                        <rect 
                          x={rect.x} y={rect.y - (image.height * 0.05)} 
                          width={rect.width} height={image.height * 0.04} 
                          fill="#3b82f6" opacity="0.8" 
                        />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* Bottom Info Bar */}
          <footer className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-6 py-3 flex items-center justify-between text-xs font-medium text-slate-400">
            <div className="flex gap-6">
              <span className="flex items-center gap-2">
                <i className="fas fa-image text-slate-600"></i>
                {image ? `${image.width} x ${image.height} px` : 'No file'}
              </span>
              <span className="flex items-center gap-2">
                <i className="fas fa-vector-square text-slate-600"></i>
                {rects.length} slices identified
              </span>
            </div>
            <div className="flex gap-4">
              <span className="text-blue-500/80 italic">
                {mode === SlicingMode.AUTO ? "Mode: Pixel-based Detection" : "Mode: Fixed Grid Layout"}
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
