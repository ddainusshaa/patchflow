"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Speaker, Guitar, Cable, Zap, Printer, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Settings, Save, Copy, FilePlus, LogOut } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

// --- Types ---
type CableLength = 5 | 10 | 20;
type GroupType = "Vocals" | "Drums" | "Instruments" | "Playback" | "Misc";
type StandType = "Tripod" | "Short" | "None";

interface InputChannel {
  id: string;
  ch: number;
  label: string;
  source: string;
  stand: StandType;
  phantom: boolean;
  group: GroupType;
  subSnake: string;
  lineCheck: boolean;
  cableLength: CableLength;
}

interface OutputChannel {
  id: string;
  port: number;
  destination: string;
  bus: string;
}

interface Scene {
  id: string;
  name: string;
  venue: string;
  date: string;
  inputs: InputChannel[];
  outputs: OutputChannel[];
}

// --- Initial Data ---
const defaultInputs: InputChannel[] = [
  { id: uuidv4(), ch: 1, label: "Kick In", source: "Beta 91A", stand: "None", phantom: true, group: "Drums", subSnake: "A1", lineCheck: false, cableLength: 10 },
  { id: uuidv4(), ch: 2, label: "Kick Out", source: "Beta 52A", stand: "Short", phantom: false, group: "Drums", subSnake: "A2", lineCheck: false, cableLength: 5 },
  { id: uuidv4(), ch: 3, label: "Bass", source: "Active DI", stand: "None", phantom: true, group: "Instruments", subSnake: "A3", lineCheck: false, cableLength: 5 },
  { id: uuidv4(), ch: 4, label: "Vox Lead", source: "SM58", stand: "Tripod", phantom: false, group: "Vocals", subSnake: "B1", lineCheck: false, cableLength: 20 },
];

const defaultOutputs: OutputChannel[] = [
  { id: uuidv4(), port: 1, destination: "Main L", bus: "Matrix 1" },
  { id: uuidv4(), port: 2, destination: "Main R", bus: "Matrix 2" },
  { id: uuidv4(), port: 3, destination: "Subwoofers", bus: "Matrix 3" },
  { id: uuidv4(), port: 4, destination: "Stage Mon 1", bus: "Mix 1" },
];

const createDefaultScene = (): Scene => ({
  id: uuidv4(),
  name: "New Event Patch",
  venue: "Main Stage",
  date: new Date().toISOString().split('T')[0],
  inputs: [...defaultInputs],
  outputs: [...defaultOutputs]
});

const groupColors: Record<GroupType, string> = {
  Vocals: "bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]/50",
  Drums: "bg-[#ffb000]/20 text-[#ffb000] border-[#ffb000]/50", // Electric Orange
  Instruments: "bg-[#ff6a00]/20 text-[#ff6a00] border-[#ff6a00]/50",
  Playback: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  Misc: "bg-neutral-500/20 text-neutral-400 border-neutral-500/50",
};

export function PatchFlowDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  
  const dashboardRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // --- Local Storage Initialization ---
  useEffect(() => {
    setIsClient(true);
    const savedScenes = localStorage.getItem("patchflow_scenes");
    const savedActiveId = localStorage.getItem("patchflow_active_scene");
    
    if (savedScenes && JSON.parse(savedScenes).length > 0) {
      setScenes(JSON.parse(savedScenes));
      setActiveSceneId(savedActiveId || JSON.parse(savedScenes)[0].id);
    } else {
      const initialScene = createDefaultScene();
      setScenes([initialScene]);
      setActiveSceneId(initialScene.id);
    }
  }, []);

  // --- Auto-Save to Local Storage ---
  useEffect(() => {
    if (isClient && scenes.length > 0) {
      localStorage.setItem("patchflow_scenes", JSON.stringify(scenes));
      if (activeSceneId) {
        localStorage.setItem("patchflow_active_scene", activeSceneId);
      }
    }
  }, [scenes, activeSceneId, isClient]);

  // Handle SSR mismatch
  if (!isClient) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#00f2ff]">Loading PatchFlow Core...</div>;

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

  const updateActiveScene = (updates: Partial<Scene>) => {
    setScenes(scenes.map(s => s.id === activeSceneId ? { ...s, ...updates } : s));
  };

  // --- Scene Management Handlers ---
  const handleCreateScene = () => {
    const newScene = createDefaultScene();
    setScenes([...scenes, newScene]);
    setActiveSceneId(newScene.id);
  };

  const handleDuplicateScene = () => {
    const duplicatedScene = {
      ...activeScene,
      id: uuidv4(),
      name: `${activeScene.name} (Copy)`
    };
    setScenes([...scenes, duplicatedScene]);
    setActiveSceneId(duplicatedScene.id);
  };

  const handleDeleteScene = (id: string) => {
    if (scenes.length === 1) return; // Prevent deleting last scene
    const newScenes = scenes.filter(s => s.id !== id);
    setScenes(newScenes);
    if (activeSceneId === id) setActiveSceneId(newScenes[0].id);
  };

  // --- Input Handlers ---
  const updateInput = (id: string, updates: Partial<InputChannel>) => {
    const newInputs = activeScene.inputs.map((i) => (i.id === id ? { ...i, ...updates } : i));
    updateActiveScene({ inputs: newInputs });
  };

  const addInputRow = () => {
    const newCh = activeScene.inputs.length + 1;
    updateActiveScene({
      inputs: [
        ...activeScene.inputs,
        {
          id: uuidv4(),
          ch: newCh,
          label: "New Channel",
          source: "Unknown",
          stand: "None",
          phantom: false,
          group: "Misc",
          subSnake: "-",
          lineCheck: false,
          cableLength: 10,
        },
      ]
    });
  };

  const deleteRow = (id: string) => {
    const newInputs = activeScene.inputs.filter((i) => i.id !== id).map((item, index) => ({ ...item, ch: index + 1 }));
    updateActiveScene({ inputs: newInputs });
  };

  // Drag & drop sorting
  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newInputs = [...activeScene.inputs];
      const draggedItemContent = newInputs.splice(dragItem.current, 1)[0];
      newInputs.splice(dragOverItem.current, 0, draggedItemContent);
      
      const resortedInputs = newInputs.map((item, index) => ({ ...item, ch: index + 1 }));
      updateActiveScene({ inputs: resortedInputs });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- Logic & Summaries ---
  const activePhantomCount = activeScene.inputs.filter((i) => i.phantom).length;
  const cableInventory = activeScene.inputs.reduce(
    (acc, curr) => {
      acc[curr.cableLength] = (acc[curr.cableLength] || 0) + 1;
      return acc;
    },
    { 5: 0, 10: 0, 20: 0 } as Record<CableLength, number>
  );

  // --- PDF Export ---
  const exportPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Centered Header Area
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PatchFlow", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150);
      doc.text("TECHNICAL RIDER", pageWidth / 2, 26, { align: "center" });
      doc.setTextColor(0); // Reset to black
      
      // Event Info Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Event: ${activeScene.name}`, 14, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`Venue: ${activeScene.venue}`, 14, 46);
      doc.text(`Date: ${activeScene.date}`, 14, 52);

      // Summaries
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Cable Inventory: 5m (${cableInventory[5]}x)  |  10m (${cableInventory[10]}x)  |  20m (${cableInventory[20]}x)`, 14, 62);
      doc.text(`Total 48V Active: ${activePhantomCount} Channels`, 14, 68);
      doc.setTextColor(0); // Reset to black

      // Input List Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Input Patch List", 14, 80);

      const tableColumn = ["CH", "Label", "Source", "Stand", "Group", "Sub-Snake", "48V"];
      const tableRows = activeScene.inputs.map(input => [
        String(input.ch).padStart(2, '0'),
        input.label,
        input.source,
        input.stand,
        input.group,
        input.subSnake,
        input.phantom ? "ON" : ""
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 85,
        theme: 'grid',
        headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center' },
          6: { halign: 'center', textColor: [255, 0, 0] } // Make 48V red if ON
        }
      });

      // Output Patch Table
      const finalY = (doc as any).lastAutoTable.finalY || 75;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Output Omni Map", 14, finalY + 15);

      const outColumn = ["Omni Port", "Destination", "Internal Bus"];
      const outRows = activeScene.outputs.map(out => [
        `OUT ${String(out.port).padStart(2, '0')}`,
        out.destination,
        out.bus
      ]);

      autoTable(doc, {
        head: [outColumn],
        body: outRows,
        startY: finalY + 20,
        theme: 'grid',
        headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { fontStyle: 'bold' }
        }
      });

      // Add Footer to all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Generated by PatchFlow", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      }

      doc.save(`TechnicalRider_${activeScene.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export fail:", err);
      alert("PDF generation failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-[#00f2ff]/30 pb-20">
      
      {/* Top Navbar / Header area (Yamaha DM3 Console style header) */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-neutral-800 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#00f2ff] drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
              <h1 className="text-2xl font-black tracking-tight text-white m-0">
                Patch<span className="text-[#00f2ff]">Flow</span>
              </h1>
            </div>
            <div className="h-6 w-px bg-neutral-800 hidden md:block"></div>
            
            {/* Scene Manager Trigger */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-[#111] border-neutral-800 hover:bg-[#222] hover:text-[#00f2ff] text-neutral-300">
                  <Settings className="w-4 h-4 mr-2" />
                  {activeScene.name}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a0a0a] border-neutral-800 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-[#00f2ff]">Scene Manager</DialogTitle>
                  <DialogDescription className="text-neutral-400">Handle local mixing board projects.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Current Scene Info</label>
                    <Input 
                      value={activeScene.name} 
                      onChange={(e) => updateActiveScene({ name: e.target.value })}
                      className="bg-[#111] border-neutral-700 text-white focus-visible:ring-[#00f2ff]" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Venue</label>
                      <Input value={activeScene.venue} onChange={(e) => updateActiveScene({ venue: e.target.value })} className="bg-[#111] border-neutral-700 text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Date</label>
                      <Input type="date" value={activeScene.date} onChange={(e) => updateActiveScene({ date: e.target.value })} className="bg-[#111] border-neutral-700 text-white" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-neutral-800">
                     <label className="text-xs text-neutral-500 uppercase tracking-widest font-bold mb-2 block">Switch Scene</label>
                     <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {scenes.map(s => (
                          <div key={s.id} className={`flex items-center justify-between p-2 rounded-md ${s.id === activeSceneId ? 'bg-[#00f2ff]/10 border border-[#00f2ff]/30' : 'bg-[#111] border border-transparent'}`}>
                             <span className="text-sm cursor-pointer hover:text-[#00f2ff]" onClick={() => setActiveSceneId(s.id)}>{s.name}</span>
                             {scenes.length > 1 && s.id !== activeSceneId && (
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-neutral-800" onClick={() => handleDeleteScene(s.id)}>
                                  <Trash2 className="w-3 h-3" />
                               </Button>
                             )}
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between w-full border-t border-neutral-800 pt-4">
                   <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={handleCreateScene} className="bg-transparent border-neutral-700 text-neutral-300">
                        <FilePlus className="w-4 h-4 mr-2" /> New
                     </Button>
                     <Button variant="outline" size="sm" onClick={handleDuplicateScene} className="bg-transparent border-neutral-700 text-neutral-300">
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                     </Button>
                   </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={exportPDF}
              className="w-full md:w-auto bg-[#00f2ff]/10 text-[#00f2ff] hover:bg-[#00f2ff] hover:text-black border border-[#00f2ff]/50 font-medium transition-all"
            >
              <Printer className="w-4 h-4 mr-2" />
              Generate Rider
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto p-4 space-y-6 mt-6" ref={dashboardRef}>
        
        {/* Event Header Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
          <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#111] to-[#0a0a0a] border-neutral-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-neutral-500 uppercase tracking-widest text-xs font-bold">Event Details</CardDescription>
              <CardTitle className="text-2xl text-white font-bold">{activeScene.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-neutral-400 font-mono">
                <p>📍 {activeScene.venue}</p>
                <p>📅 {activeScene.date}</p>
              </div>
            </CardContent>
          </Card>

          {/* Smart Summaries */}
          <Card className="bg-[#111] border-neutral-800 shadow-inner">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-2">
                <Cable className="w-4 h-4 text-neutral-400" /> XLR Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-center"><div className="text-2xl font-black text-white">{cableInventory[5]}</div><div className="text-[10px] text-neutral-500">5m</div></div>
                <div className="text-center"><div className="text-2xl font-black text-[#00f2ff] drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]">{cableInventory[10]}</div><div className="text-[10px] text-neutral-500">10m</div></div>
                <div className="text-center"><div className="text-2xl font-black text-white">{cableInventory[20]}</div><div className="text-[10px] text-neutral-500">20m</div></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-neutral-800 relative overflow-hidden">
            <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[50px] rounded-full transition-opacity duration-1000 ${activePhantomCount > 0 ? 'bg-red-600/30' : 'bg-transparent'}`} />
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-2 z-10 relative">
                <Zap className={`w-4 h-4 ${activePhantomCount > 0 ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'text-neutral-600'}`} />
                48V Load
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-baseline gap-2">
                 <span className={`text-4xl font-black ${activePhantomCount > 0 ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-neutral-700'}`}>{activePhantomCount}</span>
                 <span className="text-sm text-neutral-500 font-mono">CH Active</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Input List Area */}
        <Card className="bg-[#0f0f0f] border-neutral-800 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <CardHeader className="flex flex-row items-center justify-between bg-[#151515] border-b border-neutral-800 py-3">
            <CardTitle className="text-lg text-white font-medium flex items-center gap-2">
              <span className="bg-[#00f2ff]/20 text-[#00f2ff] px-2 py-0.5 rounded text-xs">IN</span>
              Patch List
            </CardTitle>
            <Button size="sm" onClick={addInputRow} className="bg-neutral-800 hover:bg-neutral-700 text-white h-8 text-xs font-bold uppercase tracking-wider">
              <Plus className="w-3 h-3 mr-1" /> Add Channel
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            
            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-[#0a0a0a]">
                  <TableRow className="border-neutral-800 hover:bg-transparent text-[10px] uppercase font-black text-neutral-500 tracking-wider">
                    <TableHead className="w-[40px] text-center">Drag</TableHead>
                    <TableHead className="w-[60px]">CH</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stand</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Sub-Snake</TableHead>
                    <TableHead className="text-center">48V</TableHead>
                    <TableHead className="text-center">Check</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeScene.inputs.map((input, index) => (
                    <TableRow 
                      key={input.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={`
                        border-neutral-800/50 transition-all cursor-move
                        ${input.lineCheck ? 'bg-green-900/10 opacity-75 border-l-2 border-l-green-500 hover:bg-green-900/20' : 'hover:bg-[#1a1a1a]'}
                      `}
                    >
                      <TableCell className="text-neutral-600"><GripVertical className="w-4 h-4 cursor-grab" /></TableCell>
                      <TableCell className="font-mono text-[#00f2ff] font-bold text-lg">{String(input.ch).padStart(2, '0')}</TableCell>
                      <TableCell>
                        <Input 
                          value={input.label} 
                          onChange={(e) => updateInput(input.id, { label: e.target.value })} 
                          className="h-8 bg-transparent border-transparent hover:border-neutral-700 focus-visible:ring-[#00f2ff]/50 font-bold text-white px-1" 
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={input.source} 
                          onChange={(e) => updateInput(input.id, { source: e.target.value })} 
                          className="h-8 bg-transparent border-transparent hover:border-neutral-700 focus-visible:ring-[#00f2ff]/50 text-neutral-300 w-full min-w-[120px] px-1" 
                        />
                      </TableCell>
                      <TableCell className="text-neutral-400">
                        <select 
                          className="bg-transparent text-sm w-full outline-none focus:text-white"
                          value={input.stand}
                          onChange={(e) => updateInput(input.id, { stand: e.target.value as StandType })}
                        >
                          <option value="Tripod" className="bg-[#111]">Tripod</option>
                          <option value="Short" className="bg-[#111]">Short</option>
                          <option value="None" className="bg-[#111]">-</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          className={`text-xs font-semibold px-2 py-1 rounded-full outline-none appearance-none ${groupColors[input.group]} hover:brightness-110`}
                          value={input.group}
                          onChange={(e) => updateInput(input.id, { group: e.target.value as GroupType })}
                        >
                          {Object.keys(groupColors).map(g => <option key={g} value={g} className="bg-[#111] text-white">{g}</option>)}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={input.subSnake} 
                          onChange={(e) => updateInput(input.id, { subSnake: e.target.value })} 
                          className="h-8 w-16 bg-[#111] border-neutral-800 text-center font-mono text-xs focus-visible:ring-[#00f2ff]/50" 
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={input.phantom}
                          onCheckedChange={(val) => updateInput(input.id, { phantom: val })}
                          className={`
                            ${input.phantom 
                              ? "bg-red-500 data-[state=checked]:bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" 
                              : "bg-neutral-800 border border-neutral-700"
                            }
                          `}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <button 
                          onClick={() => updateInput(input.id, { lineCheck: !input.lineCheck })}
                          className={`
                            w-6 h-6 rounded flex items-center justify-center border transition-all mx-auto
                            ${input.lineCheck ? 'bg-green-500 text-white border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neutral-900 border-neutral-700'}
                          `}
                        >
                          {input.lineCheck && "✓"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteRow(input.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="md:hidden flex flex-col p-2 space-y-2">
              {activeScene.inputs.map((input, index) => (
                 <div key={input.id} className={`flex flex-col p-3 rounded-lg border transition-colors ${input.lineCheck ? 'bg-green-900/10 border-green-500/50' : 'bg-[#151515] border-neutral-800'}`}>
                    <div className="flex justify-between items-center mb-3">
                       <div className="flex items-center gap-3">
                          <span className="font-mono text-[#00f2ff] font-black text-2xl leading-none">{String(input.ch).padStart(2, '0')}</span>
                          <Input 
                            value={input.label} 
                            onChange={(e) => updateInput(input.id, { label: e.target.value })} 
                            className="h-8 bg-transparent border-b border-transparent focus:border-[#00f2ff] rounded-none px-0 text-white font-bold text-lg" 
                          />
                       </div>
                       <button onClick={() => updateInput(input.id, { lineCheck: !input.lineCheck })} className={`w-8 h-8 rounded shrink-0 border ${input.lineCheck ? 'bg-green-500 border-green-400 text-white' : 'bg-[#222] border-neutral-700'}`}>
                          {input.lineCheck && "✓"}
                       </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                       <div className="flex flex-col bg-[#111] p-2 rounded">
                          <span className="text-[10px] uppercase font-bold text-neutral-500">Source</span>
                          <input 
                            value={input.source} 
                            onChange={(e)=>updateInput(input.id, {source: e.target.value})} 
                            className="bg-transparent text-white outline-none w-full"
                          />
                       </div>
                       <div className="flex flex-col bg-[#111] p-2 rounded relative">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 flex justify-between">
                            48V Power 
                            <Zap className={`w-3 h-3 ${input.phantom ? 'text-red-500' : 'text-neutral-700'}`} />
                          </span>
                          <div className="mt-1">
                             <Switch 
                                checked={input.phantom}
                                onCheckedChange={(val) => updateInput(input.id, { phantom: val })}
                                className={`${input.phantom ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-neutral-800'}`}
                              />
                          </div>
                       </div>
                       <div className="flex flex-col bg-[#111] p-2 rounded">
                          <span className="text-[10px] uppercase font-bold text-neutral-500">Snake</span>
                          <input 
                             value={input.subSnake}
                             onChange={(e)=>updateInput(input.id, {subSnake: e.target.value})}
                             className="bg-transparent text-white font-mono outline-none w-full"
                          />
                       </div>
                       <div className="flex flex-col bg-[#111] p-2 rounded">
                          <span className="text-[10px] uppercase font-bold text-neutral-500">Group</span>
                          <select
                            className={`text-xs mt-1 font-semibold px-1 py-0.5 rounded outline-none w-max ${groupColors[input.group]}`}
                            value={input.group}
                            onChange={(e) => updateInput(input.id, { group: e.target.value as GroupType })}
                          >
                            {Object.keys(groupColors).map(g => <option key={g} value={g} className="bg-[#111] text-white">{g}</option>)}
                          </select>
                       </div>
                    </div>
                    
                    <div className="flex justify-end">
                       <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-red-400 h-8 text-xs" onClick={() => deleteRow(input.id)}>
                         <Trash2 className="w-3 h-3 mr-1" /> Delete
                       </Button>
                    </div>
                 </div>
              ))}
            </div>

          </CardContent>
        </Card>

        {/* Output Patch (Omni Map) */}
        <Card className="bg-[#0f0f0f] border-neutral-800">
          <CardHeader className="bg-[#151515] border-b border-neutral-800 py-3">
            <CardTitle className="text-lg text-white font-medium flex items-center gap-2">
              <span className="bg-[#ff6a00]/20 text-[#ff6a00] px-2 py-0.5 rounded text-xs">OUT</span>
              Omni Map
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#0a0a0a]">
                  <TableRow className="border-neutral-800 hover:bg-transparent text-[10px] uppercase font-black text-neutral-500 tracking-wider">
                    <TableHead className="w-[100px]">Omni Port</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Internal Bus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeScene.outputs.map((out) => (
                    <TableRow key={out.id} className="border-neutral-800/50 hover:bg-[#1a1a1a]">
                      <TableCell className="font-mono text-[#ff6a00] font-bold">OUT {String(out.port).padStart(2, '0')}</TableCell>
                      <TableCell>
                         <Input 
                            value={out.destination}
                            onChange={(e) => {
                               const newOuts = activeScene.outputs.map(o => o.id === out.id ? {...o, destination: e.target.value} : o);
                               updateActiveScene({ outputs: newOuts });
                            }}
                            className="h-8 bg-transparent border-transparent hover:border-neutral-700 focus-visible:ring-[#ff6a00]/50 text-white font-medium"
                         />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-[#222] text-neutral-300 hover:bg-neutral-700 border border-neutral-700 px-3 py-1">
                          {out.bus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}