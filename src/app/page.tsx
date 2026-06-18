"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, Users, ArrowRightLeft, ShieldCheck, Activity, X, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Member {
  name: string;
  phone: string;
  joinedAt: number;
}

interface Group {
  id: string; // Group code
  name: string;
  chairmanName: string;
  chairmanPhone: string;
  amount: number;
  cycle: string;
  minMembers: number;
  status: string;
  members: Member[];
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // App State
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupCode, setActiveGroupCode] = useState<string | null>(null);
  
  // UI State
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Create Group Form State
  const [createForm, setCreateForm] = useState({
    name: '', code: '', chairmanName: '', chairmanPhone: '', amount: '', cycle: '7', minMembers: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Join Group Form State
  const [joinStep, setJoinStep] = useState(1);
  const [joinForm, setJoinForm] = useState({ code: '', name: '', phone: '' });
  const [isJoining, setIsJoining] = useState(false);
  const [foundGroup, setFoundGroup] = useState<Group | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof (window as any).ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
      } else {
        alert("Please install an Ethereum wallet like MetaMask to connect.");
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500));
    
    const newGroup: Group = {
      ...createForm,
      amount: Number(createForm.amount),
      minMembers: Number(createForm.minMembers),
      id: createForm.code,
      status: 'PENDING',
      members: [{
        name: createForm.chairmanName,
        phone: createForm.chairmanPhone,
        joinedAt: Date.now()
      }]
    };
    
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupCode(newGroup.id);
    setIsCreating(false);
    setCreateSuccess(true);
    showToast("Group Created Successfully");
    
    setTimeout(() => {
      setCreateSuccess(false);
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', code: '', chairmanName: '', chairmanPhone: '', amount: '', cycle: 'Weekly', minMembers: '' });
    }, 1500);
  };

  const handleCodeCheck = (code: string) => {
    setJoinForm(prev => ({...prev, code}));
    const group = groups.find(g => g.id === code);
    setFoundGroup(group || null);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundGroup) return;
    setIsJoining(true);
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500));
    
    const newMember: Member = {
      name: joinForm.name,
      phone: joinForm.phone,
      joinedAt: Date.now()
    };

    setGroups(prev => prev.map(g => {
      if (g.id === foundGroup.id) {
         return { ...g, members: [...g.members, newMember] };
      }
      return g;
    }));
    setActiveGroupCode(foundGroup.id);
    
    setIsJoining(false);
    showToast("Successfully Joined Group");
    setIsJoinModalOpen(false);
    setJoinStep(1);
    setJoinForm({ code: '', name: '', phone: '' });
    setFoundGroup(null);
  };

  const activeGroup = groups.find(g => g.id === activeGroupCode);

  // Use activeGroup members for the circle, or fallback to default examples
  const displayMembers = activeGroup ? activeGroup.members.map((m, i) => ({
    name: m.name,
    status: i === 0 ? 'Next' : 'Waiting'
  })) : [
    { name: "Amani", status: "Received" },
    { name: "Baraka", status: "Next" },
    { name: "Chausiku", status: "Waiting" },
    { name: "Dunia", status: "Waiting" },
    { name: "Elidi", status: "Waiting" }
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-amber-500/30">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg font-bold text-sm ${
            toast.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <CheckCircle2 size={18} />
            {toast.message}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed w-full z-40 top-0 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-amber-600/30">
              C
            </div>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">ChainChama</span>
          </div>
          
          <button 
            onClick={connectWallet}
            disabled={isConnecting}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70"
          >
            <Wallet size={18} />
            {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : (isConnecting ? 'Connecting...' : 'Connect Wallet')}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Copy & Actions */}
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">
              <Activity size={16} />
              Avalanche Fuji Testnet Live
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-stone-900 leading-[1.1] tracking-tight">
              Community Savings,<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">
                Secured by Trust.
              </span>
            </h1>
            <p className="text-xl text-stone-600 leading-relaxed max-w-lg">
              ChainChama brings the traditional East African savings group to the blockchain. Transparent, automated, and community-driven.
            </p>

            {/* Generated Group Card */}
            {activeGroup && (
              <div className="bg-white p-6 rounded-3xl shadow-lg shadow-stone-200/50 border border-stone-200 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-black text-stone-900">{activeGroup.name}</h3>
                  <span className="px-4 py-1.5 bg-amber-100 text-amber-800 text-xs font-black rounded-full uppercase tracking-wider">
                    {activeGroup.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <span className="text-stone-500 font-mono text-sm uppercase tracking-widest font-bold">Code</span>
                  <span className="font-bold text-stone-900 font-mono text-lg">{activeGroup.id}</span>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(activeGroup.id); showToast("Code copied!"); }}
                    className="ml-auto text-stone-400 hover:text-amber-600 transition-colors p-2 hover:bg-amber-50 rounded-lg"
                    title="Copy Code"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Contribution</p>
                    <p className="font-black text-stone-900 text-lg">{activeGroup.amount} AVAX <span className="text-sm font-medium text-stone-500 block">{activeGroup.cycle} Days</span></p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Members</p>
                    <p className="font-black text-stone-900 text-lg">{activeGroup.members.length} <span className="text-sm font-medium text-stone-500">/ {activeGroup.minMembers}</span></p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => setIsJoinModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-amber-600/25 hover:shadow-xl hover:-translate-y-1"
              >
                Join a Chama
              </button>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white hover:bg-stone-100 text-stone-900 border border-stone-200 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Create Group
              </button>
            </div>
          </div>

          {/* Right: Circular Rotation UI */}
          <div className="relative h-[600px] w-full flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-100 to-orange-50 rounded-[3rem] -rotate-3 scale-95 opacity-50"></div>
            
            <div className="relative w-80 h-80 rounded-full border-[12px] border-white shadow-2xl bg-stone-50 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-1">Current Pot</p>
                <p className="text-4xl font-black text-stone-900">
                  {activeGroup ? activeGroup.amount * activeGroup.members.length : 500} <span className="text-2xl">AVAX</span>
                </p>
                <p className="text-amber-600 font-medium mt-2 flex items-center justify-center gap-1">
                  {activeGroup && activeGroup.members.length < activeGroup.minMembers 
                    ? `Waiting for ${activeGroup.minMembers - activeGroup.members.length} members` 
                    : 'Next payout in 4d'}
                </p>
              </div>

              {/* Members Orbit */}
              {displayMembers.map((member, i) => {
                const angle = (i * (360 / displayMembers.length)) - 90; // Start top
                const radius = 180;
                const x = radius * Math.cos((angle * Math.PI) / 180);
                const y = radius * Math.sin((angle * Math.PI) / 180);

                const isNext = member.status === 'Next';
                const isReceived = member.status === 'Received';

                return (
                  <div 
                    key={member.name + i}
                    className="absolute transition-all duration-700"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                  >
                    <div className={`relative group flex flex-col items-center`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl transition-transform hover:scale-110 cursor-pointer
                        ${isNext ? 'bg-amber-500 ring-4 ring-amber-500/30' : 
                          isReceived ? 'bg-stone-300' : 'bg-stone-800'}
                      `}>
                        {member.name.charAt(0)}
                      </div>
                      
                      <div className="absolute top-full mt-2 bg-white px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-stone-100">
                        <p className="font-bold text-stone-900">{member.name}</p>
                        <p className={`text-xs font-semibold ${isNext ? 'text-amber-600' : isReceived ? 'text-stone-500' : 'text-stone-700'}`}>
                          {member.status}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* CREATE GROUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {createSuccess ? (
              <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 h-96">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-stone-900 mb-2">Group Created!</h2>
                <p className="text-stone-500 text-lg">Your chama is ready to go.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-6 border-b border-stone-100">
                  <h2 className="text-2xl font-black text-stone-900">Create New Chama</h2>
                  <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-100">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="create-group-form" onSubmit={handleCreateSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-sm font-bold text-stone-700">Group Name</label>
                        <input required value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-medium" placeholder="e.g. Nairobi Savers" />
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-sm font-bold text-stone-700">Group Code <span className="text-amber-600">*</span></label>
                        <input required value={createForm.code} onChange={e => setCreateForm({...createForm, code: e.target.value.toUpperCase()})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-mono font-bold uppercase" placeholder="e.g. NAIROBI24" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-sm font-bold text-stone-700">Chairman Name</label>
                        <input required value={createForm.chairmanName} onChange={e => setCreateForm({...createForm, chairmanName: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-medium" placeholder="Your name" />
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-sm font-bold text-stone-700">Phone Number</label>
                        <input required value={createForm.chairmanPhone} onChange={e => setCreateForm({...createForm, chairmanPhone: e.target.value})} type="tel" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-medium" placeholder="+254 700 000 000" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-3 sm:col-span-1">
                        <label className="text-sm font-bold text-stone-700">Amount (AVAX)</label>
                        <input required value={createForm.amount} onChange={e => setCreateForm({...createForm, amount: e.target.value})} type="number" min="0" step="0.1" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-bold" placeholder="10.0" />
                      </div>
                      <div className="space-y-2 col-span-3 sm:col-span-1">
                        <label className="text-sm font-bold text-stone-700">Cycle</label>
                        <div className="relative flex items-center w-full bg-stone-50 border border-stone-200 rounded-xl focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:border-amber-500 transition-all overflow-hidden">
                          <input 
                            required 
                            value={createForm.cycle} 
                            onChange={e => setCreateForm({...createForm, cycle: e.target.value})} 
                            type="number" 
                            min="1" 
                            className="w-full bg-transparent px-4 py-3 focus:outline-none text-stone-900 font-bold" 
                            placeholder="7" 
                          />
                          <span className="pr-4 text-stone-500 font-medium pointer-events-none">Days</span>
                        </div>
                      </div>
                      <div className="space-y-2 col-span-3 sm:col-span-1">
                        <label className="text-sm font-bold text-stone-700">Min Members</label>
                        <input required value={createForm.minMembers} onChange={e => setCreateForm({...createForm, minMembers: e.target.value})} type="number" min="2" max="20" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-bold" placeholder="5" />
                      </div>
                    </div>
                  </form>
                </div>
                
                <div className="p-6 border-t border-stone-100 bg-stone-50">
                  <button 
                    form="create-group-form" 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-amber-600/20 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isCreating ? <><Loader2 className="animate-spin" size={20} /> Creating...</> : "Create Group"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* JOIN GROUP MODAL */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="text-2xl font-black text-stone-900">Join a Chama</h2>
              <button onClick={() => {setIsJoinModalOpen(false); setJoinStep(1); setFoundGroup(null);}} className="p-2 text-stone-400 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={joinStep === 1 ? (e) => { e.preventDefault(); if (foundGroup) setJoinStep(2); } : handleJoinSubmit} className="space-y-6">
                
                {joinStep === 1 ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">Enter Group Code</label>
                      <input 
                        required 
                        value={joinForm.code} 
                        onChange={e => handleCodeCheck(e.target.value.toUpperCase())} 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-mono font-bold uppercase text-center text-xl tracking-widest" 
                        placeholder="CODE" 
                      />
                    </div>
                    
                    {joinForm.code.length > 0 && (
                      <div className={`p-4 rounded-xl border ${foundGroup ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} transition-colors`}>
                        {foundGroup ? (
                          <div className="flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-green-600" />
                            <div>
                              <p className="font-bold">Found Group: {foundGroup.name}</p>
                              <p className="text-sm opacity-80">{foundGroup.amount} AVAX {foundGroup.cycle}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="font-medium text-center">Group not found.</p>
                        )}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={!foundGroup}
                      className="w-full bg-stone-900 hover:bg-stone-800 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-6 flex justify-between items-center">
                      <span className="font-bold text-stone-900">{foundGroup?.name}</span>
                      <button type="button" onClick={() => setJoinStep(1)} className="text-xs font-bold text-amber-600 hover:underline">Change</button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">Your Name</label>
                      <input required value={joinForm.name} onChange={e => setJoinForm({...joinForm, name: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-medium" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">Phone Number</label>
                      <input required value={joinForm.phone} onChange={e => setJoinForm({...joinForm, phone: e.target.value})} type="tel" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-medium" placeholder="+254 700 000 000" />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isJoining}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-amber-600/20 hover:shadow-xl hover:-translate-y-0.5 mt-4 flex items-center justify-center gap-2"
                    >
                      {isJoining ? <><Loader2 className="animate-spin" size={20} /> Joining...</> : "Join Group"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
