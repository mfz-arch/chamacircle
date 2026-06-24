"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, Users, ArrowRightLeft, ShieldCheck, Activity, X, Copy, CheckCircle2, Loader2, Bell, Check, XCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI } from '@/lib/contract';
import { createGroupDb, getUserGroupsDb, requestToJoinDb, getGroupDb, updateGroupDb, Group, Member, JoinRequest } from '@/lib/db';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Interfaces moved to db.ts

type Role = 'chairman' | 'member' | null;
type ViewState = 'home' | 'dashboard' | 'pending' | 'member_dashboard';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // App & Global State
  const [groups, setGroups] = useState<Group[]>([]);

  // Fetch groups from Firestore on wallet connect
  useEffect(() => {
    if (walletAddress) {
      getUserGroupsDb(walletAddress).then(setGroups).catch(console.error);
    } else {
      setGroups([]);
    }
  }, [walletAddress]);
  const [recentPayouts, setRecentPayouts] = useState<any[]>([]);
  const [activeGroupCode, setActiveGroupCode] = useState<string | null>(null);
  const [myGroups, setMyGroups] = useState<{id: string, name: string}[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const activeGroup = groups.find(g => g.id === activeGroupCode);
  
  // Navigation & Roles
  const [currentUserRole, setCurrentUserRole] = useState<Role>(null);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  
  // UI State
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Create Group Form
  const [createForm, setCreateForm] = useState({
    name: '', code: '', chairmanName: '', chairmanPhone: '', amount: '', cycle: '7', minMembers: '', maxMembers: '5'
  });
  const [isCreating, setIsCreating] = useState(false);

  // Join Group Form
  const [joinStep, setJoinStep] = useState(1);
  const [joinForm, setJoinForm] = useState({ code: '', name: '', phone: '' });
  const [isJoining, setIsJoining] = useState(false);
  const [foundGroup, setFoundGroup] = useState<Group | null>(null);

  const disconnectWallet = () => {
    setWalletAddress(null);
    setCurrentView('home');
    setCurrentUserRole(null);
    setActiveGroupCode(null);
    setMyGroups([]);
    showToast("Wallet disconnected");
  };

  // Handle wallet account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setCurrentView('home'); // Send them back to home page on account switch
          setCurrentUserRole(null);
          setActiveGroupCode(null);
          showToast(`Wallet switched to ${accounts[0].substring(0,6)}...`, "success");
        } else {
          disconnectWallet();
        }
      };
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        if ((window as any).ethereum.removeListener) {
          (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      }
    }
  }, []);

  useEffect(() => {
    const fetchMyGroups = async () => {
      if (walletAddress && typeof window !== 'undefined' && !CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS")) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, provider);
          
          const groupCodes = await contract.getUserGroups(walletAddress);
          const groupsData = [];
          
          for (let code of groupCodes) {
            const g = await contract.groups(code);
            groupsData.push({ id: code, name: g.name });
          }
          
          setMyGroups(groupsData);
        } catch (error) {
          console.error("Error fetching user groups:", error);
        }
      } else {
        setMyGroups([]);
      }
    };
    
    fetchMyGroups();
  }, [walletAddress]);

  // Global Countdown Logic
  useEffect(() => {
    if (!activeGroup || !activeGroup.lastCycleStartTime) return;
    
    // Initial calculate
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const target = activeGroup.lastCycleStartTime! + (Number(activeGroup.cycle) * 60);
      return Math.max(0, target - now);
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeGroup?.lastCycleStartTime, activeGroup?.cycle]);

  // Blockchain Polling for Automated Bot Payouts
  useEffect(() => {
    if (!activeGroup || activeGroup.status !== 'ACTIVE' || !CHAMACIRCLE_ADDRESS || CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS") || typeof window === 'undefined') return;
    
    const pollBlockchain = async () => {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, provider);
        const g = await contract.groups(activeGroup.id);
        
        const chainStartTime = Number(g.lastCycleStartTime);
        const chainPayoutIndex = Number(g.payoutIndex);
        
        // If blockchain timestamp is strictly greater, it means a new cycle started (payout occurred)
        if (chainStartTime > (activeGroup.lastCycleStartTime || 0) && chainStartTime > 0) {
          const currentIndex = activeGroup.payoutIndex || 0;
          const recipient = activeGroup.members[currentIndex % activeGroup.members.length];
          
          setRecentPayouts(prev => [{
            time: new Date().toLocaleTimeString(),
            amount: activeGroup.amount * activeGroup.members.length,
            type: `Cycle Payout to ${recipient?.name || "Member"}`,
            receiverName: recipient?.name || "Member",
            receiverWallet: recipient?.walletAddress || "0x...",
            txHash: "0xAutomatedPayout..."
          }, ...prev]);
          
          setGroups(prev => prev.map(grp => {
            if (grp.id === activeGroup.id) {
              return {
                ...grp,
                lastCycleStartTime: chainStartTime,
                payoutIndex: chainPayoutIndex,
                totalFunds: 0,
                members: grp.members.map(m => ({ ...m, hasContributed: false }))
              };
            }
            return grp;
          }));
          
          showToast(`New Cycle Started! Payout sent to ${recipient?.name || "Member"}`, "success");
        }
      } catch(e) { }
    };

    const pollInterval = setInterval(pollBlockchain, 5000);
    return () => clearInterval(pollInterval);
  }, [activeGroup]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
    if (!walletAddress) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    
    setIsCreating(true);
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      if (CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS")) {
        console.warn("Contract address not set! Bypassing blockchain transaction.");
        await new Promise(r => setTimeout(r, 1500)); // Simulate delay
      } else {
        const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, signer);
        const amountWei = ethers.parseEther(createForm.amount);
        const tx = await contract.createGroup(
          createForm.code, 
          createForm.name, 
          createForm.chairmanName,
          createForm.chairmanPhone,
          Number(createForm.minMembers), 
          20, // default maxMembers to 20
          amountWei,
          Number(createForm.cycle)
        );
        await tx.wait(); 
      }
      
      const newGroup: Group = {
        ...createForm,
        amount: Number(createForm.amount),
        minMembers: Number(createForm.minMembers),
        maxMembers: Number(createForm.maxMembers),
        id: createForm.code,
        chairmanWallet: walletAddress,
        status: 'PENDING',
        lastCycleStartTime: 0,
        members: [{
          name: createForm.chairmanName,
          phone: createForm.chairmanPhone,
          walletAddress: walletAddress,
          joinedAt: Date.now()
        }],
        memberWallets: [walletAddress.toLowerCase()],
        requests: []
      };
      
      await createGroupDb(newGroup);
      setGroups(prev => [...prev, newGroup]);
      setActiveGroupCode(newGroup.id);
      
      // Assign Role & Navigation
      setCurrentUserRole('chairman');
      setCurrentView('dashboard');
      
      showToast("Group Created Successfully!");
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', code: '', chairmanName: '', chairmanPhone: '', amount: '', cycle: '7', minMembers: '', maxMembers: '5' });
    } catch (error: any) {
      console.error("Error creating group:", error);
      showToast(error?.message || "Failed to create group", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnterGroup = async (code: string) => {
    const trimmedCode = code.trim();
    setActiveGroupCode(trimmedCode);
    
    let group = groups.find(g => g.id === trimmedCode);
    
    if (!group && !CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS") && typeof window !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, provider);
        const g = await contract.groups(trimmedCode);
        
        if (g.admin !== ethers.ZeroAddress) {
          group = {
            id: trimmedCode,
            name: g.name,
            chairmanName: "Chairman", 
            chairmanPhone: "",
            chairmanWallet: g.admin,
            amount: Number(ethers.formatEther(g.contributionAmount)),
            cycle: g.cycle.toString(),
            minMembers: Number(g.minMembers),
            maxMembers: Number(g.maxMembers),
            status: g.isActive ? 'ACTIVE' : 'PENDING',
            totalFunds: Number(ethers.formatEther(g.totalFunds)),
            payoutIndex: Number(g.payoutIndex),
            lastCycleStartTime: Number(g.lastCycleStartTime),
            members: [], 
            requests: [],
            memberWallets: [g.admin.toLowerCase()]
          };
          setGroups(prev => [...prev, group as Group]);
        }
      } catch (e) {
        console.error("Failed to fetch group on enter:", e);
      }
    }
    
    if (group) {
      if (group.chairmanWallet.toLowerCase() === walletAddress?.toLowerCase() || (group as any).admin?.toLowerCase() === walletAddress?.toLowerCase()) {
        setCurrentUserRole('chairman');
        setCurrentView('dashboard');
      } else {
        setCurrentUserRole('member');
        setCurrentView('member_dashboard');
      }
    }
  };

  const handleCodeCheck = async (code: string) => {
    const trimmedCode = code.trim();
    setJoinForm(prev => ({...prev, code: trimmedCode}));
    
    // First check local state
    let group = groups.find(g => g.id === trimmedCode);
    
    // If not found locally, fetch from Avalanche Blockchain!
    if (!group && !CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS") && typeof window !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, provider);
        const g = await contract.groups(trimmedCode);
        
        // If the admin address is not the zero address, the group exists on-chain!
        if (g.admin !== ethers.ZeroAddress) {
          group = {
            id: trimmedCode,
            name: g.name,
            chairmanName: "Chairman", // Placeholder
            chairmanPhone: "",
            chairmanWallet: g.admin, // Mapped from g.admin
            amount: Number(ethers.formatEther(g.contributionAmount)),
            cycle: g.cycle.toString(), // Convert BigInt/Number to string as required by interface
            minMembers: Number(g.minMembers),
            maxMembers: Number(g.maxMembers),
            status: g.isActive ? 'ACTIVE' : 'PENDING', // Map bool to literal type
            totalFunds: Number(ethers.formatEther(g.totalFunds)),
            payoutIndex: Number(g.payoutIndex),
            lastCycleStartTime: Number(g.lastCycleStartTime),
            members: [],
            requests: [],
            memberWallets: [g.admin.toLowerCase()]
          };
          
          // Add it to local state so the UI can use it
          setGroups(prev => [...prev, group as Group]);
        }
      } catch (e) {
        console.error("Failed to fetch group from blockchain:", e);
      }
    }
    
    setFoundGroup(group || null);
  };

  const handleJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundGroup) return;
    if (!walletAddress) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    
    setIsJoining(true);
    
    try {
      if (!CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS")) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, signer);
        const tx = await contract.requestJoin(foundGroup.id, joinForm.name, joinForm.phone);
        await tx.wait();
      }

      const newRequest: JoinRequest = {
        id: Math.random().toString(36).substr(2, 9),
        groupCode: foundGroup.id,
        userWallet: walletAddress,
        name: joinForm.name,
        phone: joinForm.phone,
        status: 'PENDING',
        requestedAt: Date.now()
      };

      await requestToJoinDb(foundGroup.id, newRequest);

      setGroups(prev => prev.map(g => {
        if (g.id === foundGroup.id) {
           return { ...g, requests: [...g.requests, newRequest] };
        }
        return g;
      }));
      
      setActiveGroupCode(foundGroup.id);
      setCurrentUserRole('member');
      setCurrentView('pending');
      
      showToast("Join Request Sent!");
      setIsJoinModalOpen(false);
      setJoinStep(1);
      setJoinForm({ code: '', name: '', phone: '' });
      setFoundGroup(null);
    } catch (error: any) {
      console.error("Error sending join request:", error);
      showToast("Failed to send request", "error");
    } finally {
      setIsJoining(false);
    }
  };

  const handleApproveRequest = async (reqId: string, isApproved: boolean) => {
    if (!activeGroup) return;

    if (isApproved) {
      const req = activeGroup.requests.find(r => r.id === reqId);
      if (!req) return;

      try {
        if (!CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS")) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, signer);
          const tx = await contract.approveMember(activeGroup.id, req.userWallet);
          await tx.wait();
        }
      } catch (error: any) {
        console.error("Blockchain approval failed:", error);
        showToast("Blockchain approval failed", "error");
        return;
      }

      const newMember: Member = {
        name: req.name,
        phone: req.phone,
        walletAddress: req.userWallet,
        joinedAt: Date.now()
      };

      const updatedMembers = [...activeGroup.members, newMember];
      const updatedWallets = [...(activeGroup.memberWallets || []), req.userWallet.toLowerCase()];
      const newStatus = updatedMembers.length >= activeGroup.minMembers ? 'ACTIVE' : activeGroup.status;
      let newStartTime = activeGroup.lastCycleStartTime;
      if (newStatus === 'ACTIVE' && (!activeGroup.lastCycleStartTime || activeGroup.lastCycleStartTime === 0)) {
        newStartTime = Math.floor(Date.now() / 1000);
      }
      
      const updatedRequests = activeGroup.requests.filter(r => r.id !== reqId);

      await updateGroupDb(activeGroup.id, {
        members: updatedMembers,
        memberWallets: updatedWallets,
        status: newStatus,
        lastCycleStartTime: newStartTime,
        requests: updatedRequests
      });

      setGroups(prev => prev.map(g => {
        if (g.id === activeGroup.id) {
          return { 
            ...g, 
            members: updatedMembers, 
            memberWallets: updatedWallets,
            requests: updatedRequests,
            status: newStatus,
            lastCycleStartTime: newStartTime
          };
        }
        return g;
      }));
      showToast("Member Approved!");
    } else {
      setGroups(prev => prev.map(g => {
        if (g.id === activeGroup.id) {
          return { ...g, requests: g.requests.filter(r => r.id !== reqId) };
        }
        return g;
      }));
      showToast("Request Rejected");
    }
  };

  const handleStartCycle = async () => {
    if (!activeGroup || !walletAddress) return;
    try {
      if (!CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS")) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, signer);
        
        const tx = await contract.startCycle(activeGroup.id);
        await tx.wait();
        
        const currentPayoutIndex = activeGroup.payoutIndex || 0;
        const nextMemberName = activeGroup.members.length > currentPayoutIndex ? activeGroup.members[currentPayoutIndex].name : "the next member";
        showToast(`Contribution successfully sent to ${nextMemberName}`, "success");
        
        // Log the recent transaction
        setRecentPayouts(prev => [{
          time: new Date().toLocaleTimeString(),
          amount: activeGroup.totalFunds || 0,
          type: `Cycle Payout to ${nextMemberName}`,
          receiverName: nextMemberName,
          receiverWallet: activeGroup.members.length > currentPayoutIndex ? activeGroup.members[currentPayoutIndex].walletAddress : null,
          txHash: tx.hash
        }, ...prev]);

        // Optimistically update local UI state to show empty funds, reset member payments, and rotate the payout index
        setGroups(prev => prev.map(g => {
          if (g.id === activeGroup.id) {
            const resetMembers = g.members.map(m => ({ ...m, hasContributed: false }));
            return { ...g, totalFunds: 0, members: resetMembers, payoutIndex: (currentPayoutIndex + 1) % g.members.length };
          }
          return g;
        }));
      } else {
        showToast("Cycle Started Successfully!");
      }
    } catch (e: any) {
      console.error("Payout failed:", e);
      showToast(e?.message || "Payout failed. Make sure group has funds.", "error");
    }
  };

  const handleContribute = async () => {
    if (!activeGroup || !walletAddress) return;
    try {
      if (!CHAMACIRCLE_ADDRESS.includes("YOUR_CONTRACT_ADDRESS")) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CHAMACIRCLE_ADDRESS, CHAMACIRCLE_ABI, signer);
        const tx = await contract.contribute(activeGroup.id, {
          value: ethers.parseEther(activeGroup.amount.toString())
        });
        await tx.wait();
        showToast("Contribution successful on-chain!");
        
        // Optimistically update local UI to show this member paid
        setGroups(prev => prev.map(g => {
          if (g.id === activeGroup.id) {
            const updatedMembers = g.members.map(m => 
              m.walletAddress.toLowerCase() === walletAddress.toLowerCase() 
                ? { ...m, hasContributed: true } 
                : m
            );
            // Also increment the visual totalFunds pot for the demo
            return { ...g, members: updatedMembers, totalFunds: (g.totalFunds || 0) + g.amount };
          }
          return g;
        }));
      } else {
        await new Promise(r => setTimeout(r, 1500));
        showToast("Mock contribution successful!");
      }
    } catch (e: any) {
      console.error("Contribution failed:", e);
      showToast(e?.message || "Contribution failed", "error");
    }
  };

  const displayMembers = activeGroup ? activeGroup.members.map((m, i) => ({
    name: m.name,
    walletAddress: m.walletAddress,
    status: i === (activeGroup.payoutIndex || 0) ? 'Next' : 'Waiting'
  })) : [
    { name: "Amani", walletAddress: "0x0000000000000000000000000000000000000000", status: "Received" },
    { name: "Baraka", walletAddress: "0x0000000000000000000000000000000000000000", status: "Next" },
    { name: "Chausiku", walletAddress: "0x0000000000000000000000000000000000000000", status: "Waiting" },
    { name: "Dunia", walletAddress: "0x0000000000000000000000000000000000000000", status: "Waiting" },
    { name: "Elidi", walletAddress: "0x0000000000000000000000000000000000000000", status: "Waiting" }
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-amber-600/30">
                C
              </div>
              <span className="text-2xl font-extrabold text-stone-900 tracking-tight">ChamaCircle</span>
            </div>
            
            {/* Global Nav Links */}
            <div className="hidden md:flex items-center gap-6 font-bold text-sm border-l border-stone-200 pl-6">
              <button onClick={() => setCurrentView('home')} className={`${currentView === 'home' ? 'text-amber-600' : 'text-stone-400 hover:text-stone-900'} transition-colors`}>Home</button>
              
              {/* Auto-detect Chairman login */}
              {walletAddress && groups.some(g => g.chairmanWallet.toLowerCase() === (walletAddress || '').toLowerCase()) && (
                <button 
                  onClick={() => {
                    const g = groups.find(g => g.chairmanWallet.toLowerCase() === (walletAddress || '').toLowerCase());
                    if (g) {
                      setActiveGroupCode(g.id);
                      setCurrentUserRole('chairman');
                      setCurrentView('dashboard');
                    }
                  }} 
                  className={`${currentView === 'dashboard' ? 'text-amber-600' : 'text-stone-400 hover:text-stone-900'} transition-colors`}
                >
                  My Dashboard
                </button>
              )}

              {/* Auto-detect Member login */}
              {walletAddress && groups.some(g => g.chairmanWallet.toLowerCase() !== (walletAddress || '').toLowerCase() && (g.members.some(m => m.walletAddress.toLowerCase() === (walletAddress || '').toLowerCase()) || g.requests.some(r => r.userWallet.toLowerCase() === (walletAddress || '').toLowerCase()))) && (
                <button 
                  onClick={() => {
                    const g = groups.find(g => g.chairmanWallet.toLowerCase() !== (walletAddress || '').toLowerCase() && (g.members.some(m => m.walletAddress.toLowerCase() === (walletAddress || '').toLowerCase()) || g.requests.some(r => r.userWallet.toLowerCase() === (walletAddress || '').toLowerCase())));
                    if (g) {
                      setActiveGroupCode(g.id);
                      setCurrentUserRole('member');
                      const isApproved = g.members.some(m => m.walletAddress.toLowerCase() === (walletAddress || '').toLowerCase());
                      setCurrentView(isApproved ? 'member_dashboard' : 'pending');
                    }
                  }} 
                  className={`${(currentView === 'pending' || currentView === 'member_dashboard') ? 'text-amber-600' : 'text-stone-400 hover:text-stone-900'} transition-colors`}
                >
                  My Status
                </button>
              )}
            </div>
          </div>
          
          {walletAddress ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 bg-stone-100 text-stone-800 px-5 py-2.5 rounded-full font-medium text-sm">
                <Wallet size={16} />
                <span className="hidden sm:inline">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</span>
              </span>
              <button 
                onClick={disconnectWallet}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-full font-bold text-sm transition-colors shadow-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70"
            >
              <Wallet size={18} />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </nav>

      {/* Main View Logic */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        
        {/* VIEW: HOME */}
        {currentView === 'home' && (
          <div className="grid lg:grid-cols-2 gap-16 items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                ChamaCircle brings the traditional East African savings group to the blockchain. Transparent, automated, and community-driven.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                {currentUserRole === 'member' && activeGroup?.members.some(m => m.walletAddress === walletAddress) ? (
                  <button 
                    onClick={handleContribute}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-green-600/25 hover:shadow-xl hover:-translate-y-1"
                  >
                    Pay Contribution ({activeGroup.amount} AVAX)
                  </button>
                ) : currentUserRole !== 'chairman' && (
                  <button 
                    onClick={() => setIsJoinModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-amber-600/25 hover:shadow-xl hover:-translate-y-1"
                  >
                    Request to Join
                  </button>
                )}
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-white hover:bg-stone-100 text-stone-900 border border-stone-200 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Create Group
                </button>
              </div>

              {/* MY GROUPS SECTION */}
              {walletAddress && myGroups.length > 0 && (
                <div className="pt-8 border-t border-stone-200 mt-8">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">My Groups</h3>
                  <div className="flex flex-col gap-3">
                    {myGroups.map(mg => (
                      <button
                        key={mg.id}
                        onClick={() => handleEnterGroup(mg.id)}
                        className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all text-left group"
                      >
                        <div>
                          <p className="font-bold text-stone-900 group-hover:text-amber-600 transition-colors">{mg.name}</p>
                          <p className="text-xs text-stone-500 font-mono">Code: {mg.id}</p>
                        </div>
                        <ArrowRightLeft className="text-stone-300 group-hover:text-amber-500 transition-colors" size={18} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Circular Rotation UI */}
            <div className="relative h-[600px] w-full flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-100 to-orange-50 rounded-[3rem] -rotate-3 scale-95 opacity-50"></div>
              
              <div className="relative w-80 h-80 rounded-full border-[12px] border-white shadow-2xl bg-stone-50 flex items-center justify-center z-10">
                <div className="text-center">
                  <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-1">Current Pot</p>
                  <p className="text-4xl font-black text-stone-900">
                    {activeGroup ? Number(activeGroup.amount * activeGroup.members.length).toFixed(2).replace(/\.00$/, '') : 500} <span className="text-2xl">AVAX</span>
                  </p>
                </div>

                {/* Members Orbit */}
                {displayMembers.map((member, i) => {
                  const angle = (i * (360 / displayMembers.length)) - 90;
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
                      <div className="relative group flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl transition-all hover:scale-110 cursor-pointer relative z-10
                          ${isNext ? 'bg-amber-500 ring-4 ring-amber-500/50' : 
                            isReceived ? 'bg-stone-300' : 'bg-stone-800'}
                        `}>
                          {isNext && (
                            <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-75"></span>
                          )}
                          <span className="relative z-10">{member.name.charAt(0).toUpperCase()}</span>
                        </div>
                        {/* Interactive Tooltip */}
                        <div className="absolute top-20 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-white text-sm py-2 px-4 rounded-xl whitespace-nowrap z-50 pointer-events-none shadow-xl transform group-hover:-translate-y-1 duration-200 text-center border border-stone-800">
                          <p className="font-bold text-base">{member.name}</p>
                          <p className="text-stone-400 text-xs font-mono my-1 bg-stone-800 py-1 px-2 rounded-md">{member.walletAddress.substring(0, 6)}...{member.walletAddress.substring(member.walletAddress.length - 4)}</p>
                          <p className={`text-xs mt-1 font-bold uppercase tracking-widest ${isNext ? 'text-amber-400' : isReceived ? 'text-stone-300' : 'text-stone-500'}`}>
                            {isNext ? '★ Next Payout' : isReceived ? '✓ Paid' : 'Member'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: CHAIRMAN DASHBOARD */}
        {currentView === 'dashboard' && activeGroup && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-black text-stone-900">Chairman Dashboard</h1>
              <div className="flex gap-4">
                <button 
                  onClick={() => { navigator.clipboard.writeText(activeGroup.id); showToast("Code copied!"); }}
                  className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-50 transition-colors shadow-sm"
                >
                  <Copy size={16} /> Code: {activeGroup.id}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Stats Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 col-span-3 md:col-span-1 h-fit">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-stone-900">{activeGroup.name}</h3>
                    <p className="text-stone-500 font-medium">Status: <span className={`font-bold ${activeGroup.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600'}`}>{activeGroup.status}</span></p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {activeGroup.status === 'ACTIVE' && (
                    <div className="bg-stone-900 text-white p-4 rounded-xl border border-stone-800 shadow-inner flex flex-col items-center justify-center">
                      <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Time Left</p>
                      <p className="font-black text-amber-500 text-4xl tabular-nums tracking-tight">
                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:
                        {(timeLeft % 60).toString().padStart(2, '0')}
                      </p>
                      <p className="text-stone-500 text-xs mt-1">Cycle Duration: {activeGroup.cycle} min</p>
                    </div>
                  )}

                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Members</p>
                    <p className="font-black text-stone-900 text-2xl">{activeGroup.members.length} <span className="text-base font-medium text-stone-500">/ {activeGroup.minMembers} (Min)</span></p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Contribution</p>
                    <p className="font-black text-stone-900 text-2xl">{activeGroup.amount} AVAX <span className="text-base font-medium text-stone-500 block">Every {activeGroup.cycle} Minutes</span></p>
                  </div>
                </div>

                <button 
                  onClick={handleContribute}
                  disabled={activeGroup.status !== 'ACTIVE'}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-green-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pay Contribution ({activeGroup.amount} AVAX)
                </button>

                {activeGroup.status !== 'ACTIVE' && (
                  <>
                    <button 
                      onClick={handleStartCycle}
                      disabled={activeGroup.members.length < activeGroup.minMembers}
                      className="w-full mt-4 bg-stone-900 hover:bg-stone-800 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Cycle
                    </button>
                    <p className="text-center text-stone-500 text-sm mt-2 font-medium">Need {Math.max(0, activeGroup.minMembers - activeGroup.members.length)} more members to start.</p>
                  </>
                )}
              </div>

              {/* Requests & Members Area */}
              <div className="col-span-3 md:col-span-2 space-y-6">
                
                {/* Pending Requests */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
                  <div className="flex items-center gap-2 mb-6">
                    <Bell className="text-amber-600" size={24} />
                    <h3 className="text-xl font-black text-stone-900">Join Requests</h3>
                    {activeGroup.requests.length > 0 && (
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-black">{activeGroup.requests.length}</span>
                    )}
                  </div>
                  
                  {activeGroup.requests.length === 0 ? (
                    <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                      <p className="text-stone-500 font-medium">No pending requests right now.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeGroup.requests.map(req => (
                        <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-xl gap-4">
                          <div>
                            <p className="font-bold text-stone-900 text-lg">{req.name}</p>
                            <p className="text-stone-500 text-sm font-mono">{req.userWallet.substring(0, 6)}...{req.userWallet.substring(req.userWallet.length - 4)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleApproveRequest(req.id, true)} className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg transition-colors font-bold flex items-center gap-1 px-4">
                              <Check size={18} /> Accept
                            </button>
                            <button onClick={() => handleApproveRequest(req.id, false)} className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-colors font-bold flex items-center gap-1 px-4">
                              <XCircle size={18} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manage Members */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="text-amber-600" size={24} />
                    <h3 className="text-xl font-black text-stone-900">Active Members</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeGroup.members.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-100 rounded-xl justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${m.hasContributed ? 'bg-green-500' : 'bg-stone-800'}`}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{m.name} {idx === 0 && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1">Admin</span>}</p>
                            <p className="text-stone-500 text-xs font-mono">{m.walletAddress.substring(0, 6)}...{m.walletAddress.substring(m.walletAddress.length - 4)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {m.hasContributed ? (
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">Paid</span>
                          ) : (
                            <span className="text-xs font-bold bg-stone-200 text-stone-500 px-2 py-1 rounded-lg">Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity & Payouts */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <h3 className="text-xl font-black text-stone-900">Recent Activity</h3>
                    </div>
                    <a 
                      href={`https://testnet.snowtrace.io/address/${CHAMACIRCLE_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-600 py-1.5 px-3 rounded-full transition-colors flex items-center gap-1"
                    >
                      Verify on Snowtrace <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  </div>
                  
                  {recentPayouts.length === 0 ? (
                    <div className="text-center py-6 bg-stone-50 rounded-xl border border-stone-100 border-dashed">
                      <p className="text-stone-500 font-medium text-sm">No recent payouts yet.</p>
                      <p className="text-stone-400 text-xs mt-1">Start a cycle to see blockchain activity here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentPayouts.map((payout, idx) => {
                        const isYou = payout.receiverWallet && walletAddress && payout.receiverWallet.toLowerCase() === walletAddress.toLowerCase();
                        return (
                        <div key={idx} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </div>
                            <div>
                              <p className="font-bold text-stone-900">{isYou ? 'Cycle Payout to YOU' : payout.type}</p>
                              <p className="text-stone-500 text-xs">{payout.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-green-600">+{payout.amount} AVAX</p>
                            <a 
                              href={`https://testnet.snowtrace.io/tx/${payout.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-400 hover:text-amber-600 text-xs font-medium underline transition-colors"
                            >
                              View tx
                            </a>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VIEW: MEMBER DASHBOARD */}
        {currentView === 'member_dashboard' && activeGroup && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-black text-stone-900">Member Dashboard</h1>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Stats Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 col-span-3 md:col-span-1 h-fit">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-stone-900">{activeGroup.name}</h3>
                    <p className="text-stone-500 font-medium">Status: <span className={`font-bold ${activeGroup.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600'}`}>{activeGroup.status}</span></p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-stone-900 text-white p-4 rounded-xl border border-stone-800 shadow-inner flex flex-col items-center justify-center">
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Time Left</p>
                    <p className={`font-black text-4xl font-mono ${timeLeft === 0 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                      {formatTime(timeLeft)}
                    </p>
                    <p className="text-stone-500 text-xs mt-1">Cycle Duration: {activeGroup.cycle} min</p>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Members</p>
                    <p className="font-black text-stone-900 text-2xl">{activeGroup.members.length} <span className="text-base font-medium text-stone-500">/ {activeGroup.minMembers} (Min)</span></p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Contribution</p>
                    <p className="font-black text-stone-900 text-2xl">{activeGroup.amount} AVAX <span className="text-base font-medium text-stone-500 block">Every {activeGroup.cycle} Minutes</span></p>
                  </div>
                </div>

                <button 
                  disabled={activeGroup.status !== 'ACTIVE'}
                  className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => showToast("This will open MetaMask to pay the contribution!", "success")}
                >
                  Pay Contribution
                </button>
                {activeGroup.status !== 'ACTIVE' && (
                  <p className="text-center text-stone-500 text-sm mt-2 font-medium">Group is pending. Waiting for members.</p>
                )}
              </div>

              {/* Members Area */}
              <div className="col-span-3 md:col-span-2 space-y-6">
                
                {/* Active Members */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="text-amber-600" size={24} />
                    <h3 className="text-xl font-black text-stone-900">Active Members</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeGroup.members.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-100 rounded-xl justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${m.hasContributed ? 'bg-green-500' : 'bg-stone-800'}`}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">
                              {m.name} 
                              {m.walletAddress.toLowerCase() === activeGroup.chairmanWallet.toLowerCase() && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1">Admin</span>}
                              {m.walletAddress.toLowerCase() === walletAddress?.toLowerCase() && <span className="text-xs bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full ml-1">You</span>}
                            </p>
                            <p className="text-stone-500 text-xs font-mono">{m.walletAddress.substring(0, 6)}...{m.walletAddress.substring(m.walletAddress.length - 4)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {m.hasContributed ? (
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">Paid</span>
                          ) : (
                            <span className="text-xs font-bold bg-stone-200 text-stone-500 px-2 py-1 rounded-lg">Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity & Payouts */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <h3 className="text-xl font-black text-stone-900">Recent Activity</h3>
                    </div>
                    <a 
                      href={`https://testnet.snowtrace.io/address/${CHAMACIRCLE_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-600 py-1.5 px-3 rounded-full transition-colors flex items-center gap-1"
                    >
                      Verify on Snowtrace <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  </div>
                  
                  {recentPayouts.length === 0 ? (
                    <div className="text-center py-6 bg-stone-50 rounded-xl border border-stone-100 border-dashed">
                      <p className="text-stone-500 font-medium text-sm">No recent payouts yet.</p>
                      <p className="text-stone-400 text-xs mt-1">Start a cycle to see blockchain activity here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentPayouts.map((payout, idx) => {
                        const isYou = payout.receiverWallet && walletAddress && payout.receiverWallet.toLowerCase() === walletAddress.toLowerCase();
                        return (
                        <div key={idx} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </div>
                            <div>
                              <p className="font-bold text-stone-900">{isYou ? 'Cycle Payout to YOU' : payout.type}</p>
                              <p className="text-stone-500 text-xs">{payout.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-green-600">+{payout.amount} AVAX</p>
                            <a 
                              href={`https://testnet.snowtrace.io/tx/${payout.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-400 hover:text-amber-600 text-xs font-medium underline transition-colors"
                            >
                              View tx
                            </a>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VIEW: MEMBER PENDING REQUEST */}
        {currentView === 'pending' && activeGroup && (
          <div className="flex flex-col items-center justify-center pt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-12 rounded-3xl shadow-xl border border-stone-200 max-w-lg w-full text-center">
              <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 size={48} className="animate-spin" />
              </div>
              <h2 className="text-3xl font-black text-stone-900 mb-4">Request Pending</h2>
              <p className="text-stone-600 text-lg leading-relaxed mb-8">
                Your request to join <span className="font-bold text-stone-900">{activeGroup.name}</span> has been sent to the Chairman. Please wait for approval.
              </p>
              
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-left space-y-2">
                <p className="text-stone-500 text-sm font-bold uppercase tracking-widest">Group Info</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-stone-900">Required Contribution:</span>
                  <span className="font-mono text-stone-700">{activeGroup.amount} AVAX</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-stone-900">Status:</span>
                  <span className="font-mono text-amber-600 font-bold">Awaiting Approval</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODALS */}
      
      {/* CREATE GROUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
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
                    <label className="text-sm font-bold text-stone-700">Group Code *</label>
                    <input required value={createForm.code} onChange={e => setCreateForm({...createForm, code: e.target.value.toUpperCase().trim()})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-mono font-bold uppercase" placeholder="e.g. NAIROBI24" />
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
                      <span className="pr-4 text-stone-500 font-medium pointer-events-none">Minutes</span>
                    </div>
                  </div>
                  <div className="space-y-2 col-span-3 sm:col-span-1">
                    <label className="text-sm font-bold text-stone-700">Min Members</label>
                    <input required value={createForm.minMembers} onChange={e => setCreateForm({...createForm, minMembers: e.target.value})} type="number" min="2" max="20" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 font-bold" placeholder="3" />
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
          </div>
        </div>
      )}

      {/* JOIN REQUEST MODAL */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="text-2xl font-black text-stone-900">Request to Join</h2>
              <button onClick={() => {setIsJoinModalOpen(false); setJoinStep(1); setFoundGroup(null);}} className="p-2 text-stone-400 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={joinStep === 1 ? (e) => { e.preventDefault(); if (foundGroup) setJoinStep(2); } : handleJoinRequest} className="space-y-6">
                
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
                      {isJoining ? <><Loader2 className="animate-spin" size={20} /> Sending Request...</> : "Send Request"}
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
