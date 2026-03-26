/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Search, MoreVertical, HelpCircle, ChevronRight, User, CheckCircle2, X, Activity, Sparkles, Image as ImageIcon, LayoutGrid, MessageSquare, Loader2, Camera, Upload, Share2, Copy, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchCoinPrices, type CoinPackage } from './services/priceService';
import GeminiAssistant from './components/GeminiAssistant';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface Transaction {
  id: string;
  coins: string;
  amount: string;
  status: 'pending' | 'successful' | 'failed';
  timestamp: number;
}

export default function App() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customQuantity, setCustomQuantity] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(300);
  const [showSupport, setShowSupport] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreConfirmation, setShowPreConfirmation] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [trends, setTrends] = useState<string>('');
  const [isTrendsLoading, setIsTrendsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recharge' | 'studio' | 'profile'>('recharge');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  
  // AI Studio State
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirmation && countdown > 0 && !showSupport) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setShowSupport(true);
    }
    return () => clearInterval(timer);
  }, [showConfirmation, countdown, showSupport]);

  useEffect(() => {
    if (showConfirmation) {
      setCountdown(300);
      setShowSupport(false);
    }
  }, [showConfirmation]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Persistence
  useEffect(() => {
    const savedId = localStorage.getItem('tiktok_id');
    if (savedId) {
      setUserId(savedId);
      setIsLoggedIn(true);
    }
    
    const savedTransactions = localStorage.getItem('tiktok_transactions');
    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions));
      } catch (e) {
        console.error('Failed to parse transactions', e);
      }
    }

    const savedAvatar = localStorage.getItem('tiktok_avatar');
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }

    const savedBalance = localStorage.getItem('tiktok_balance');
    if (savedBalance) {
      setBalance(parseInt(savedBalance));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tiktok_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('tiktok_balance', balance.toString());
  }, [balance]);

  const handleShare = () => {
    const url = 'https://ais-pre-qlhqpemjqvyu2jqy3wrvlc-337461262748.asia-southeast1.run.app';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert('Đã sao chép liên kết vào bộ nhớ tạm!');
      }).catch(err => {
        console.error('Failed to copy: ', err);
        fallbackCopyTextToClipboard(url);
      });
    } else {
      fallbackCopyTextToClipboard(url);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'Đã sao chép liên kết vào bộ nhớ tạm!' : 'Không thể sao chép liên kết.';
      alert(msg);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
  };

  const handleGoogleSearch = () => {
    const url = 'https://ais-pre-qlhqpemjqvyu2jqy3wrvlc-337461262748.asia-southeast1.run.app';
    window.open(`https://www.google.com/search?q=${encodeURIComponent(url)}`, '_blank');
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginInput.trim()) {
      const id = loginInput.trim();
      setUserId(id);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      localStorage.setItem('tiktok_id', id);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId('');
    setLoginInput('');
    setUserAvatar(null);
    localStorage.removeItem('tiktok_id');
    localStorage.removeItem('tiktok_avatar');
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: `Tạo một hình ảnh phong cách TikTok: ${prompt}. Hình ảnh phải rực rỡ, hiện đại và thu hút.` }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error('Image Generation Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updatePrices = useCallback(async () => {
    setIsUpdating(true);
    try {
      const newPrices = await fetchCoinPrices();
      setPackages(newPrices);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    updatePrices(); // Initial fetch
  }, [updatePrices]);

  const selectedPkg = packages.find(p => p.id === selectedPackage);
  
  const getRate = (coins: number): number => {
    if (coins <= 30000) return 285;
    if (coins <= 50000) return 284;
    if (coins <= 100000) return 283.5;
    if (coins <= 200000) return 283;
    if (coins <= 500000) return 282;
    return 280.5;
  };

  const calculateTotalPriceNumeric = () => {
    if (!selectedPkg) return 0;
    const qty = selectedPkg.isCustom ? Number(customQuantity) : parseInt(selectedPkg.coins.replace(/[^\d]/g, ''), 10);
    if (isNaN(qty) || qty <= 0) return 0;
    return Math.round(qty * getRate(qty));
  };

  const fetchTrends = async () => {
    setIsTrendsLoading(true);
    setShowTrends(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Hãy liệt kê 5 xu hướng TikTok (TikTok Trends) đang hot nhất tại Việt Nam hiện nay. Với mỗi xu hướng, hãy mô tả ngắn gọn và giải thích tại sao nó lại hot. Trình bày bằng Markdown.",
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      setTrends(response.text || 'Không thể tải xu hướng hiện tại.');
    } catch (error) {
      console.error('Trends Error:', error);
      setTrends('Có lỗi xảy ra khi tải xu hướng.');
    } finally {
      setIsTrendsLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedPkg) return '₫0';
    // For fixed packages, use the fluctuated price from the service for realism
    if (!selectedPkg.isCustom) return selectedPkg.price;
    
    // For custom, use the new tier logic
    const total = calculateTotalPriceNumeric();
    return `₫${total.toLocaleString('vi-VN')}`;
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] font-sans text-[#161823]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#e3e3e4] flex items-center justify-between px-4 md:px-6 z-50">
        <div className="flex items-center gap-1">
          <svg width="118" height="42" viewBox="0 0 118 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M58.5 12.5C58.5 12.5 54.5 12.5 54.5 16.5V36.5C54.5 36.5 54.5 40.5 50.5 40.5C46.5 40.5 42.5 36.5 42.5 32.5C42.5 28.5 46.5 24.5 50.5 24.5V20.5C44.5 20.5 38.5 25.5 38.5 32.5C38.5 39.5 44.5 44.5 50.5 44.5C56.5 44.5 58.5 39.5 58.5 36.5V12.5Z" fill="black"/>
            <path d="M58.5 12.5C62.5 12.5 66.5 15.5 66.5 19.5V23.5C62.5 23.5 58.5 20.5 58.5 16.5V12.5Z" fill="black"/>
            <text x="0" y="30" fontFamily="Arial" fontWeight="bold" fontSize="24" fill="black">TikTok</text>
          </svg>
        </div>

        <div className="hidden md:flex flex-1 max-w-[440px] mx-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="w-full h-11 bg-[#f1f1f2] rounded-full pl-4 pr-12 outline-none border border-transparent focus:border-[#d1d1d3]"
            />
            <div className="absolute right-0 top-0 h-full w-12 flex items-center justify-center border-l border-[#d1d1d3] hover:bg-[#e8e8e9] rounded-r-full cursor-pointer">
              <Search size={20} className="text-[#a7a7ab]" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold truncate max-w-[120px]">{userId}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#face15] rounded-full flex items-center justify-center text-[6px] font-bold text-white shadow-inner">
                    <span className="transform scale-75">d</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#fe2c55]">{balance.toLocaleString('vi-VN')}</span>
                  <span className="text-[10px] text-gray-300 mx-1">|</span>
                  <button 
                    onClick={handleLogout}
                    className="text-[10px] text-gray-400 hover:text-[#fe2c55] transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
              <div 
                onClick={() => setShowAvatarModal(true)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 border border-gray-200 cursor-pointer overflow-hidden hover:border-[#fe2c55] transition-all"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={20} />
                )}
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-all group"
            >
              <div className="w-8 h-8 bg-[#f1f1f2] rounded-full flex items-center justify-center text-gray-400 group-hover:bg-gray-200 transition-colors">
                <User size={18} />
              </div>
              <span className="font-bold text-sm text-[#161823]">Đăng nhập</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowShareModal(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#fe2c55]"
              title="Chia sẻ"
            >
              <Share2 size={24} />
            </button>
            <MoreVertical size={24} className="cursor-pointer" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 max-w-[960px] mx-auto flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm self-start mb-2">
          <button
            onClick={() => setActiveTab('recharge')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'recharge' ? 'bg-[#fe2c55] text-white shadow-md' : 'text-[#a7a7ab] hover:bg-gray-50'
            }`}
          >
            <LayoutGrid size={18} />
            Nạp xu
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'studio' ? 'bg-[#fe2c55] text-white shadow-md' : 'text-[#a7a7ab] hover:bg-gray-50'
            }`}
          >
            <Sparkles size={18} />
            TikTok AI Studio
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'profile' ? 'bg-[#fe2c55] text-white shadow-md' : 'text-[#a7a7ab] hover:bg-gray-50'
            }`}
          >
            <User size={18} />
            Hồ sơ
          </button>
        </div>

        {activeTab === 'recharge' ? (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Nhận Xu</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#a7a7ab] uppercase tracking-wider">
              <div className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-[#fe2c55] animate-pulse' : 'bg-green-500'}`} />
              <span>Giá trực tiếp</span>
              <span className="opacity-50">| Lần cuối: {lastUpdate.toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>

          {/* User Section */}
          <div className="mb-8">
            {isLoggedIn ? (
              <div className="bg-[#f8f8f8] rounded-lg p-4 flex items-center justify-between max-w-[320px] border border-transparent hover:border-gray-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#e3e3e4] rounded-full flex items-center justify-center">
                    <User size={24} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-[#161823]">{userId}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-3 h-3 bg-[#face15] rounded-full flex items-center justify-center text-[6px] font-bold text-white shadow-inner">
                        <span className="transform scale-75">d</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#fe2c55]">{balance.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-xs font-semibold text-[#fe2c55] hover:bg-[#fe2c55]/10 px-3 py-1.5 rounded-md transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="bg-[#f8f8f8] rounded-lg p-4 flex items-center gap-4 w-full max-w-[240px] hover:bg-[#f1f1f2] transition-all group"
              >
                <div className="w-10 h-10 bg-[#e3e3e4] rounded-full flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                  <User size={24} className="text-white" />
                </div>
                <span className="font-bold text-sm text-[#161823]">Đăng nhập</span>
              </button>
            )}
          </div>

          {/* Savings Info */}
          <div className="flex items-center gap-1 mb-6 text-sm">
            <span className="font-bold">Nạp:</span>
            <span className="text-[#fe2c55] font-semibold">Tiết kiệm khoảng 25% với phí dịch vụ của bên thứ ba thấp hơn.</span>
            <HelpCircle size={14} className="text-[#a7a7ab] cursor-pointer" />
          </div>

          {/* Coin Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {packages.map((pkg) => (
              <div key={pkg.id} className="relative group">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`relative cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center justify-center transition-all h-full ${
                    selectedPackage === pkg.id
                      ? 'border-[#fe2c55] bg-white'
                      : 'border-transparent bg-[#f8f8f8] hover:bg-[#f1f1f2]'
                  }`}
                >
                  {pkg.dealInfo && (
                    <div className={`absolute -top-2 -right-1 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm z-10 ${
                      pkg.dealInfo.type === 'hot' ? 'bg-[#fe2c55]' : 'bg-[#77bc1f]'
                    }`}>
                      {pkg.dealInfo.label}
                    </div>
                  )}
                  
                  {pkg.isCustom ? (
                    <div className="flex flex-col items-center w-full">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 bg-[#face15] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                          <span className="transform scale-75">d</span>
                        </div>
                        {selectedPackage === pkg.id ? (
                          <input
                            autoFocus
                            type="number"
                            value={customQuantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setCustomQuantity('');
                                return;
                              }
                              let num = parseInt(val, 10);
                              if (isNaN(num)) return;
                              if (num > 2500000) num = 2500000;
                              setCustomQuantity(num.toString());
                            }}
                            onBlur={() => {
                              if (customQuantity && Number(customQuantity) < 30) {
                                setCustomQuantity('30');
                              }
                            }}
                            placeholder="30-2,5M"
                            min="30"
                            max="2500000"
                            className="w-full bg-transparent text-lg font-bold outline-none text-center border-b-2 border-[#fe2c55]/30 focus:border-[#fe2c55] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-lg font-bold">{customQuantity || pkg.coins}</span>
                        )}
                      </div>
                      <span className="text-xs text-[#a7a7ab] text-center">{pkg.subtext}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 bg-[#face15] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                          <span className="transform scale-75">d</span>
                        </div>
                        <span className="text-lg font-bold">{pkg.coins}</span>
                      </div>
                      <span className="text-sm text-[#a7a7ab]">{pkg.price}</span>
                    </>
                  )}
                </motion.div>

                {/* Tooltip */}
                {pkg.dealInfo && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#161823] text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
                    <div className="relative">
                      {pkg.dealInfo.tooltip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#161823]" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer of Card */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">Tổng</span>
              <span className="text-xl font-bold">
                {calculateTotalPrice()}
              </span>
            </div>
            
            <button 
              onClick={() => {
                if (!isLoggedIn) {
                  setShowLoginModal(true);
                  return;
                }
                setShowPreConfirmation(true);
              }}
              disabled={!selectedPackage || (selectedPkg?.isCustom && (!customQuantity || Number(customQuantity) < 30))}
              className={`w-full md:w-[240px] py-3 rounded-sm font-bold text-white transition-all ${
                selectedPackage && (!selectedPkg?.isCustom || (customQuantity && Number(customQuantity) >= 30))
                  ? 'bg-[#fe2c55] hover:bg-[#ef2950]' 
                  : 'bg-[#fe2c55]/40 cursor-not-allowed'
              }`}
            >
              {isLoggedIn ? 'Nạp' : 'Đăng nhập để nạp'}
            </button>

            <div className="flex justify-end">
              <div className="flex items-center gap-1 border border-[#e3e3e4] rounded px-2 py-1 text-[10px] font-bold text-[#a7a7ab]">
                <div className="w-3 h-3 bg-[#77bc1f] rounded-full flex items-center justify-center text-white">
                  <span className="scale-50">✓</span>
                </div>
                SECURE Payment
              </div>
            </div>
          </div>
        </div>

        {/* Promo Section */}
        <div 
          onClick={fetchTrends}
          className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors mb-4 border border-transparent hover:border-[#fe2c55]/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-2xl bg-red-50 rounded-full">
              🔥
            </div>
            <div>
              <h3 className="font-bold text-[#161823]">Xu hướng TikTok hôm nay</h3>
              <p className="text-sm text-gray-500">Xem ngay những gì đang hot nhất trên TikTok</p>
            </div>
          </div>
          <div className="text-[#fe2c55] font-bold text-sm flex items-center gap-1">
            Xem ngay
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Trends Modal */}
        <AnimatePresence>
          {showTrends && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTrends(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fe2c55] text-white">
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} />
                    <h2 className="text-xl font-bold">Xu hướng TikTok Việt Nam</h2>
                  </div>
                  <button 
                    onClick={() => setShowTrends(false)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                  {isTrendsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 size={40} className="animate-spin text-[#fe2c55]" />
                      <p className="text-gray-500 font-medium animate-pulse">Đang cập nhật xu hướng mới nhất...</p>
                    </div>
                  ) : (
                    <div className="markdown-body prose prose-sm max-w-none">
                      <Markdown>{trends}</Markdown>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400">Dữ liệu được cập nhật thời gian thực qua Google Search Grounding</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </>
    ) : activeTab === 'studio' ? (
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#fe2c55]/10 rounded-full flex items-center justify-center text-[#fe2c55]">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">TikTok AI Studio</h2>
                <p className="text-sm text-[#a7a7ab]">Tạo hình ảnh phong cách TikTok bằng AI</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Mô tả hình ảnh</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Một avatar phong cách cyberpunk với logo TikTok rực rỡ..."
                    className="w-full h-32 p-4 bg-[#f1f1f2] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#fe2c55]/20 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3">Tỷ lệ khung hình</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                          aspectRatio === ratio
                            ? 'bg-[#fe2c55] text-white border-[#fe2c55]'
                            : 'bg-white text-[#161823] border-[#e3e3e4] hover:bg-gray-50'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={!prompt.trim() || isGenerating}
                  className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                    prompt.trim() && !isGenerating
                      ? 'bg-[#fe2c55] hover:bg-[#ef2950]'
                      : 'bg-[#fe2c55]/40 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Đang tạo ảnh...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={20} />
                      Tạo ngay
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col items-center justify-center bg-[#f8f8f8] rounded-2xl border-2 border-dashed border-[#e3e3e4] min-h-[400px] relative overflow-hidden">
                {generatedImage ? (
                  <div className="w-full h-full flex flex-col items-center p-4">
                    <img
                      src={generatedImage}
                      alt="AI Generated"
                      className="max-w-full max-h-[350px] rounded-lg shadow-xl object-contain mb-4"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedImage;
                        link.download = `tiktok-ai-${Date.now()}.png`;
                        link.click();
                      }}
                      className="px-6 py-2 bg-white border border-[#e3e3e4] rounded-full text-sm font-bold hover:bg-gray-50 transition-colors"
                    >
                      Tải về máy
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-[#a7a7ab]">
                      <ImageIcon size={32} />
                    </div>
                    <p className="text-[#a7a7ab] text-sm">Hình ảnh của bạn sẽ xuất hiện tại đây</p>
                  </div>
                )}
                
                {isGenerating && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-[#fe2c55]">Đang vẽ...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div 
                  onClick={() => setShowAvatarModal(true)}
                  className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border-2 border-[#fe2c55] overflow-hidden cursor-pointer shadow-lg hover:scale-105 transition-transform"
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={48} />
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-1">@{userId || 'Người dùng TikTok'}</h2>
                  <p className="text-sm text-[#a7a7ab] mb-4">ID: {isLoggedIn ? '123456789' : 'Chưa đăng nhập'}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                      <div className="text-xs text-[#a7a7ab] font-bold uppercase tracking-wider mb-1">Số dư</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#face15] rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                          <span>d</span>
                        </div>
                        <span className="font-bold">{balance.toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                      <div className="text-xs text-[#a7a7ab] font-bold uppercase tracking-wider mb-1">Giao dịch</div>
                      <div className="font-bold">{transactions.length} lần</div>
                    </div>
                    <button 
                      onClick={() => setShowShareModal(true)}
                      className="bg-[#fe2c55]/5 px-4 py-2 rounded-lg border border-[#fe2c55]/20 flex items-center gap-2 text-[#fe2c55] font-bold hover:bg-[#fe2c55]/10 transition-all"
                    >
                      <Share2 size={16} />
                      Chia sẻ
                    </button>
                  </div>
                </div>
                {isLoggedIn && (
                  <button 
                    onClick={handleLogout}
                    className="px-6 py-2 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>
            </div>

            {/* Transaction History Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Activity size={20} className="text-[#fe2c55]" />
                  <h3 className="font-bold text-lg">Lịch sử giao dịch</h3>
                </div>
                <p className="text-sm text-[#a7a7ab] mt-1">Xem lại các lần nạp của bạn</p>
              </div>

              <div className="bg-gray-50/50">
                {transactions.length === 0 ? (
                  <div className="p-12 text-center text-[#a7a7ab]">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity size={32} />
                    </div>
                    <p className="font-medium">Chưa có giao dịch nào được thực hiện.</p>
                    <button 
                      onClick={() => setActiveTab('recharge')}
                      className="mt-4 text-[#fe2c55] font-bold hover:underline"
                    >
                      Nạp ngay
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            tx.status === 'successful' ? 'bg-green-100 text-green-600' :
                            tx.status === 'failed' ? 'bg-red-100 text-red-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            <Activity size={20} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">Nạp {tx.coins}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                tx.status === 'successful' ? 'bg-green-100 text-green-600' :
                                tx.status === 'failed' ? 'bg-red-100 text-red-600' :
                                'bg-orange-100 text-orange-600'
                              }`}>
                                {tx.status === 'successful' ? 'Thành công' :
                                 tx.status === 'failed' ? 'Thất bại' : 'Đang xử lý'}
                              </span>
                            </div>
                            <div className="text-xs text-[#a7a7ab]">
                              Mã giao dịch: <span className="font-mono">{tx.id}</span> • {new Date(tx.timestamp).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="font-bold text-lg text-[#fe2c55]">{tx.amount}</div>
                          <div className="text-[10px] text-[#a7a7ab] font-bold uppercase tracking-tighter">Thanh toán an toàn</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Đăng nhập</h2>
                  <button 
                    onClick={() => setShowLoginModal(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                
                <p className="text-gray-500 mb-6 text-sm">Vui lòng nhập ID TikTok của bạn để tiếp tục nạp xu.</p>

                <form onSubmit={handleLogin}>
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">TikTok ID</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</div>
                      <input
                        autoFocus
                        type="text"
                        value={loginInput}
                        onChange={(e) => setLoginInput(e.target.value)}
                        placeholder="username"
                        className="w-full h-12 bg-[#f1f1f2] rounded-lg pl-8 pr-4 outline-none border-2 border-transparent focus:border-[#fe2c55] transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!loginInput.trim()}
                    className="w-full py-3 bg-[#fe2c55] hover:bg-[#ef2950] text-white font-bold rounded-lg transition-colors disabled:bg-[#e3e3e4] disabled:cursor-not-allowed"
                  >
                    Tiếp tục
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Bằng cách tiếp tục, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Quyền riêng tư của chúng tôi.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmation(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Thanh toán chuyển khoản</h2>
                  <button 
                    onClick={() => setShowConfirmation(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                <div className="flex flex-col items-center mb-6">
                  {!showSupport ? (
                    <>
                      <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-4 relative">
                        <img 
                          src={`https://img.vietqr.io/image/VCB-0411001086628-compact2.png?amount=${calculateTotalPriceNumeric()}&addInfo=NAP%20XU%20${selectedPkg?.isCustom ? customQuantity : selectedPkg?.coins}%20ID%20${userId}&accountName=NGO%20VAN%20KIEN`}
                          alt="VietQR Payment"
                          className="w-64 h-64 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 border border-white/20">
                          <div className="w-1.5 h-1.5 bg-[#fe2c55] rounded-full animate-pulse" />
                          {formatTime(countdown)}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Quét mã để thanh toán qua VietQR</p>
                        <p className="text-xs text-[#fe2c55] font-medium">Nội dung: NAP XU {selectedPkg?.isCustom ? customQuantity : selectedPkg?.coins} ID {userId}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-4 flex flex-col items-center">
                        <div className="relative group">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=https://zalo.me/0358247870"
                            alt="Zalo Contact QR"
                            className="w-64 h-64 object-contain mb-2"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100">
                              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/1200px-Icon_of_Zalo.svg.png" alt="Zalo" className="w-8 h-8 object-contain" />
                            </div>
                          </div>
                        </div>
                        <div className="text-[#0068ff] font-bold text-lg mt-2">Zalo: 0358247870</div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#fe2c55] mb-1">Xác nhận thanh toán!</p>
                        <p className="text-sm text-gray-600">Vui lòng liên hệ Zalo trên để được hỗ trợ nạp xu nhanh nhất.</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Ngân hàng:</span>
                    <span className="font-bold">Vietcombank (VCB)</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Số tài khoản:</span>
                    <span className="font-bold">0411001086628</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Chủ tài khoản:</span>
                    <span className="font-bold uppercase">Ngo Van Kiên</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">TikTok ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#fe2c55]">@{userId}</span>
                      <button 
                        onClick={() => {
                          setLoginInput(userId);
                          setShowLoginModal(true);
                        }}
                        className="text-[10px] text-blue-500 hover:underline"
                      >
                        Thay đổi
                      </button>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 my-2" />
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Số lượng xu:</span>
                    <span className="font-bold flex items-center gap-1">
                      <div className="w-4 h-4 bg-[#face15] rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-inner">
                        <span className="transform scale-75">d</span>
                      </div>
                      {selectedPkg?.isCustom ? customQuantity : selectedPkg?.coins}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tổng thanh toán:</span>
                    <span className="font-bold text-[#fe2c55] text-lg">{calculateTotalPrice()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (showSupport) {
                      window.open('https://zalo.me/0358247870', '_blank');
                    } else {
                      // Add coins to balance when clicking "I have transferred"
                      // Extract numeric value from coins string
                      const coinsStr = selectedPkg?.isCustom ? customQuantity : (selectedPkg?.coins || '0');
                      const coinsToAdd = parseInt(coinsStr.replace(/[^\d]/g, ''), 10);
                      
                      if (!isNaN(coinsToAdd) && coinsToAdd > 0) {
                        setBalance(prev => prev + coinsToAdd);
                        
                        // Update the latest transaction status to successful
                        setTransactions(prev => {
                          const newTransactions = [...prev];
                          if (newTransactions.length > 0) {
                            newTransactions[0] = { ...newTransactions[0], status: 'successful' };
                          }
                          return newTransactions;
                        });
                      }
                      setShowSupport(true);
                    }
                  }}
                  className={`w-full py-3 ${showSupport ? 'bg-[#0068ff] hover:bg-[#0056d2]' : 'bg-[#fe2c55] hover:bg-[#ef2950]'} text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2`}
                >
                  {showSupport ? (
                    <>
                      <span>Mở Zalo nhắn tin</span>
                    </>
                  ) : (
                    'Tôi đã chuyển khoản'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Help / AI Chat */}
      <div 
        onClick={() => setShowAIChat(!showAIChat)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer border transition-all z-[160] ${
          showAIChat ? 'bg-[#fe2c55] text-white border-[#fe2c55]' : 'bg-white text-[#161823] border-[#e3e3e4] hover:bg-gray-50'
        }`}
      >
        {showAIChat ? <X size={28} /> : <MessageSquare size={28} />}
        {!showAIChat && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#fe2c55] rounded-full border-2 border-white animate-pulse" />
        )}
      </div>

      <AnimatePresence>
        {showAIChat && (
          <GeminiAssistant onClose={() => setShowAIChat(false)} />
        )}
      </AnimatePresence>

      {/* Pre-Confirmation Modal */}
      <AnimatePresence>
        {showPreConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreConfirmation(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            >
              <h2 className="text-xl font-bold mb-4">Xác nhận nạp xu</h2>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn mua <span className="font-bold text-[#fe2c55]">{selectedPkg?.isCustom ? customQuantity : selectedPkg?.coins} xu</span> với giá <span className="font-bold text-[#fe2c55]">{calculateTotalPrice()}</span> không?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreConfirmation(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const coins = selectedPkg?.isCustom ? customQuantity : selectedPkg?.coins;
                    const newTransaction: Transaction = {
                      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
                      coins: coins || '0',
                      amount: calculateTotalPrice(),
                      status: 'pending',
                      timestamp: Date.now(),
                    };
                    setTransactions(prev => [newTransaction, ...prev]);
                    setShowPreConfirmation(false);
                    setShowConfirmation(true);
                  }}
                  className="flex-1 py-3 bg-[#fe2c55] hover:bg-[#ef2950] text-white font-bold rounded-lg transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Avatar Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Tùy chỉnh ảnh đại diện</h2>
                  <button 
                    onClick={() => setShowAvatarModal(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                <div className="flex flex-col items-center mb-8">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border-2 border-[#fe2c55] overflow-hidden mb-4 shadow-lg">
                    {userAvatar ? (
                      <img src={userAvatar} alt="Current Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={48} />
                    )}
                  </div>
                  <p className="text-sm font-bold text-[#161823]">@{userId}</p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chọn ảnh có sẵn</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      'Felix', 'Aneka', 'Toby', 'Luna', 'Oliver', 'Milo', 'Bella', 'Jack'
                    ].map((seed) => {
                      const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                      return (
                        <button
                          key={seed}
                          onClick={() => {
                            setUserAvatar(url);
                            localStorage.setItem('tiktok_avatar', url);
                          }}
                          className={`w-full aspect-square rounded-xl border-2 transition-all overflow-hidden ${
                            userAvatar === url ? 'border-[#fe2c55] scale-105 shadow-md' : 'border-transparent hover:border-gray-200'
                          }`}
                        >
                          <img src={url} alt={seed} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Hoặc tải lên ảnh</label>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500">Nhấn để tải ảnh lên</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result as string;
                            setUserAvatar(base64String);
                            localStorage.setItem('tiktok_avatar', base64String);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="w-full py-3 bg-[#fe2c55] hover:bg-[#ef2950] text-white font-bold rounded-lg transition-colors"
                >
                  Xong
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Chia sẻ</h2>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                
                <p className="text-gray-500 mb-6 text-sm">Gửi liên kết này cho bạn bè để họ cũng có thể nạp xu TikTok giá rẻ!</p>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleShare}
                    className="w-full py-3 bg-[#f1f1f2] hover:bg-[#e8e8e9] text-[#161823] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy size={18} />
                    Sao chép liên kết
                  </button>
                  
                  <button
                    onClick={handleGoogleSearch}
                    className="w-full py-3 bg-white border-2 border-[#4285F4] text-[#4285F4] font-bold rounded-lg transition-colors flex items-center justify-center gap-2 hover:bg-[#4285F4]/5"
                  >
                    <Globe size={18} />
                    Tìm kiếm trên Google
                  </button>

                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 text-center">Liên kết của bạn</p>
                    <p className="text-xs text-[#fe2c55] break-all text-center font-medium">https://ais-pre-qlhqpemjqvyu2jqy3wrvlc-337461262748.asia-southeast1.run.app</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
