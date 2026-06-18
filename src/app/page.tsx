"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, Users, ArrowRightLeft, ShieldCheck, History, Activity } from 'lucide-react';
import { ethers } from 'ethers';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);

  // Example members for the circular rotation UI
  const members = [
    { name: "Amani", status: "Received" },
    { name: "Baraka", status: "Next" },
    { name: "Chausiku", status: "Waiting" },
    { name: "Dunia", status: "Waiting" },
    { name: "Elidi", status: "Waiting" }
  ];

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum as any);
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

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-amber-500/30">
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-stone-200 bg-white/80 backdrop-blur-md">
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
            
            <div className="flex flex-wrap gap-4 pt-4">
              <button className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-amber-600/25 hover:shadow-xl hover:-translate-y-1">
                Join a Chama
              </button>
              <button className="bg-white hover:bg-stone-100 text-stone-900 border border-stone-200 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-sm hover:shadow-md">
                Create Group
              </button>
            </div>

            <div className="flex gap-8 pt-8 border-t border-stone-200 mt-8">
              <div>
                <p className="text-3xl font-black text-stone-900">12k+</p>
                <p className="text-stone-500 font-medium">Active Members</p>
              </div>
              <div>
                <p className="text-3xl font-black text-stone-900">$2.4M</p>
                <p className="text-stone-500 font-medium">Total Volume</p>
              </div>
            </div>
          </div>

          {/* Right: Circular Rotation UI */}
          <div className="relative h-[600px] w-full flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-100 to-orange-50 rounded-[3rem] -rotate-3 scale-95 opacity-50"></div>
            
            <div className="relative w-80 h-80 rounded-full border-[12px] border-white shadow-2xl bg-stone-50 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-1">Current Pot</p>
                <p className="text-4xl font-black text-stone-900">500 AVAX</p>
                <p className="text-amber-600 font-medium mt-2 flex items-center justify-center gap-1">
                  Next payout in 4d
                </p>
              </div>

              {/* Members Orbit */}
              {members.map((member, i) => {
                const angle = (i * (360 / members.length)) - 90; // Start top
                const radius = 180;
                const x = radius * Math.cos((angle * Math.PI) / 180);
                const y = radius * Math.sin((angle * Math.PI) / 180);

                const isNext = member.status === 'Next';
                const isReceived = member.status === 'Received';

                return (
                  <div 
                    key={member.name}
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
                      
                      {/* Tooltip equivalent */}
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

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-3">Trustless Security</h3>
            <p className="text-stone-600 leading-relaxed">Funds are locked in audited smart contracts. No central authority can access your savings or delay payouts.</p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 bg-orange-100 text-orange-700 rounded-2xl flex items-center justify-center mb-6">
              <ArrowRightLeft size={28} />
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-3">Automated Rotations</h3>
            <p className="text-stone-600 leading-relaxed">Smart contracts handle the complex math and timing. Payouts are distributed automatically to the right member.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center mb-6">
              <Users size={28} />
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-3">Community First</h3>
            <p className="text-stone-600 leading-relaxed">Built for communities. Define your own rules, contribution amounts, and rotation schedules together.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
