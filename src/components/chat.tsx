"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Chat() {
  const extractedStagesRef = useRef(new Set<string>());

  const { messages, sendMessage, status } = useChat({});
  const [localInput, setLocalInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    if (status === 'streaming' || status === 'submitted') return;

    const userText = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content || "").join(" ");
    const hasPhone = /\d{7,}/.test(userText);
    
    const lastMsg: any = messages[messages.length - 1];
    const isFinal = lastMsg.role === 'assistant' && (
      lastMsg.content?.toLowerCase().includes('менеджер') || 
      lastMsg.content?.toLowerCase().includes('свяжется') || 
      lastMsg.content?.toLowerCase().includes('расчет')
    );

    let stage = null;
    if (isFinal) {
      stage = 'FINAL';
    } else if (hasPhone) {
      stage = 'PHONE';
    }

    if (stage && !extractedStagesRef.current.has(stage)) {
      extractedStagesRef.current.add(stage);
      fetch('/api/extract-lead', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ messages })
      }).catch(e => console.error("Extract error:", e));
    }
  }, [messages, status]);
  
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

  // Прокрутка при новых сообщениях
  useEffect(() => {
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
