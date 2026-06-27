"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    maxSteps: 5
  });
  const [localInput, setLocalInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isLoading = status === 'submitted' || status === 'streaming';

  const lastLeadDataRef = useRef<string>("");

  const getMessageText = (msg: any) => {
    let text = msg.content || "";
    if (!text && msg.parts) {
      text = msg.parts
        .filter((part: any) => part.type === "text" || part.type === "text-delta")
        .map((part: any) => part.text || part.delta || "")
        .join("");
    }
    
    // Скрываем блок LEAD_DATA из UI (даже в процессе стриминга)
    if (text.includes("[LEAD_DATA_START]")) {
      const startIdx = text.indexOf("[LEAD_DATA_START]");
      const endIdx = text.indexOf("[LEAD_DATA_END]");
      
      if (endIdx !== -1) {
        text = text.substring(0, startIdx) + text.substring(endIdx + 15);
      } else {
        // Если тег еще не закрыт (в процессе стриминга), скрываем все после открывающего тега
        text = text.substring(0, startIdx);
      }
    }
    return text.trim();
  };

  const getHasToolInvocation = (msg: any) => {
    if (!msg.parts) return false;
    return msg.parts.some(
      (part: any) => part.type.startsWith("tool-") || part.type === "dynamic-tool"
    );
  };

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim() || isLoading) return;
    sendMessage({ text: localInput });
    setLocalInput("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Перехват LEAD_DATA и фоновая отправка
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      const match = lastMsg.content.match(/\[LEAD_DATA_START\]\s*([\s\S]*?)\s*\[LEAD_DATA_END\]/);
      if (match && match[1]) {
        const jsonStr = match[1];
        if (jsonStr !== lastLeadDataRef.current) {
          lastLeadDataRef.current = jsonStr;
          try {
            const parsed = JSON.parse(jsonStr);
            fetch('/api/save-lead', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsed)
            }).catch(e => console.error("Error saving lead:", e));
          } catch(e) {
            console.error("Failed to parse LEAD_DATA", e);
          }
        }
      }
    }
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-600">
            <div className="w-20 h-20 bg-white/60 shadow-sm border border-white/50 rounded-full flex items-center justify-center mb-2">
              <img src="https://ozarks-cleaning.com/img/icons/header-logo.svg" alt="Crystal" className="h-6" />
            </div>
            <p className="max-w-md text-slate-700 font-medium px-4">
              Hi, I'm Julie, your cleaning expert at Crystal LLC. 
              How can I help you today?
            </p>
          </div>
        )}
        
        {messages.filter(m => getMessageText(m).trim().length > 0).map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex w-full",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "flex gap-3 max-w-[85%] md:max-w-[75%]",
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50 overflow-hidden",
                  m.role === "user"
                    ? "bg-slate-800 text-white"
                    : "bg-white/80 p-1.5"
                )}
              >
                {m.role === "user" ? (
                  <User size={16} />
                ) : (
                  <img 
                    src="https://ozarks-cleaning.com/img/icons/header-logo.svg" 
                    alt="Crystal" 
                    className="h-full w-full object-contain" 
                  />
                )}
              </div>
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-sm",
                  m.role === "user"
                    ? "bg-slate-800 text-white rounded-tr-sm border border-slate-700"
                    : "bg-white/80 border border-white/50 text-slate-800 rounded-tl-sm"
                )}
              >
                {getMessageText(m)}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
           <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex w-full justify-start"
         >
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-white/80 shadow-sm border border-white/50 overflow-hidden p-1.5">
                <img 
                  src="https://ozarks-cleaning.com/img/icons/header-logo.svg" 
                  alt="Crystal" 
                  className="h-full w-full object-contain" 
                />
              </div>
             <div className="px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/50 text-slate-800 rounded-tl-sm shadow-sm flex items-center gap-1">
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-300"></span>
             </div>
           </div>
         </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <form
          onSubmit={handleLocalSubmit}
          className="flex items-center gap-2 bg-slate-50 border border-slate-200 shadow-sm rounded-full px-2 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
        >
          <input
            className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-800 placeholder:text-slate-500 font-medium"
            value={localInput}
            placeholder="Type your message..."
            onChange={(e) => setLocalInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || localInput.trim().length === 0}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-md"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
