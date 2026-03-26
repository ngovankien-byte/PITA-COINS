import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Send, X, Bot, User, Loader2, Sparkles, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
  isImage?: boolean;
  sources?: { title: string; uri: string }[];
}

interface GeminiAssistantProps {
  onClose: () => void;
}

export default function GeminiAssistant({ onClose }: GeminiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Chào bạn! Mình là trợ lý AI của TikTok Coin. Mình có thể giúp gì cho bạn hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (retryMessage?: string) => {
    const userMessage = retryMessage || input.trim();
    if (!userMessage || isLoading) return;

    if (!retryMessage) setInput('');
    setError(null);
    setLastUserMessage(userMessage);
    
    if (!retryMessage) {
      setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    }
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages.concat({ role: 'user', text: userMessage }).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: "Bạn là trợ lý AI chuyên nghiệp của nền tảng nạp xu TikTok. Nhiệm vụ của bạn là hỗ trợ người dùng về các vấn đề nạp xu, giải thích bảng giá, hướng dẫn thanh toán qua VietQR/Zalo, và trả lời các câu hỏi về lợi ích của xu TikTok (tặng quà, quảng cáo, v.v.). Hãy trả lời bằng tiếng Việt, thân thiện, ngắn gọn và chuyên nghiệp. Nếu người dùng hỏi về các xu hướng TikTok hiện tại, hãy sử dụng công cụ tìm kiếm để cung cấp thông tin mới nhất.",
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "Xin lỗi, mình gặp chút trục trặc. Bạn thử lại nhé!";
      
      // Extract grounding sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks?.map(chunk => ({
        title: chunk.web?.title || 'Nguồn tin',
        uri: chunk.web?.uri || ''
      })).filter(s => s.uri) || [];

      setMessages(prev => [...prev, { role: 'model', text, sources }]);
      setError(null);
    } catch (err) {
      console.error('Gemini Error:', err);
      setError('Không thể kết nối với AI. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 right-6 w-[360px] max-w-[calc(100vw-48px)] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[150] border border-[#e3e3e4]"
    >
      {/* Header */}
      <div className="bg-[#fe2c55] p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Trợ lý AI TikTok</h3>
            <div className="flex items-center gap-1 text-[10px] opacity-80">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Đang trực tuyến
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f8f8]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-[#fe2c55]' : 'bg-white border border-[#e3e3e4]'
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-[#fe2c55]" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#fe2c55] text-white rounded-tr-none' 
                  : 'bg-white text-[#161823] rounded-tl-none'
              }`}>
                <div className="markdown-body">
                  <Markdown>{msg.text}</Markdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                      <Search size={10} />
                      Nguồn tham khảo:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {msg.sources.map((source, idx) => (
                        <a 
                          key={idx}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] bg-gray-50 hover:bg-gray-100 text-blue-500 px-2 py-0.5 rounded border border-gray-200 transition-colors truncate max-w-[150px]"
                          title={source.title}
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-white border border-[#e3e3e4] flex items-center justify-center">
                <Bot size={16} className="text-[#fe2c55]" />
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#fe2c55]" />
                <span className="text-xs text-gray-400">Đang suy nghĩ...</span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center p-2">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col items-center gap-2 w-full max-w-[90%] shadow-sm">
              <div className="flex items-center gap-2 text-red-600 text-xs font-medium">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
              <button 
                onClick={() => handleSend(lastUserMessage || undefined)}
                className="flex items-center gap-1 px-4 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full hover:bg-red-700 transition-colors shadow-sm"
              >
                <RefreshCw size={10} />
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-[#e3e3e4]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Hỏi mình bất cứ điều gì..."
            className="w-full pl-4 pr-12 py-3 bg-[#f1f1f2] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#fe2c55]/20 transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 p-2 rounded-full transition-all ${
              input.trim() && !isLoading ? 'bg-[#fe2c55] text-white' : 'text-gray-400'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-gray-400">
          <Search size={10} />
          Sử dụng Google Search để cập nhật thông tin mới nhất
        </div>
      </div>
    </motion.div>
  );
}
