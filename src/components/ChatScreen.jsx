import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Terminal, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Bot, 
  User,
  ShieldCheck,
  RefreshCw,
  Utensils
} from 'lucide-react';
import { api } from '../api';

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I am SmartServe, your intelligent canteen assistant. I help optimize daily meal preparation, prevent stock-outs, and guide safe food waste reduction actions. All my recommendations are strictly grounded in your kitchen's historical data.",
      tool_calls: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    "Why only 80 samosas today?",
    "What should I do with 15 extra portions of rice at 2 PM?",
    "What leftover stock do we have right now?",
    "Simulate what happens if attendance increases by 20%.",
    "Show waste history over the last 14 days."
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.chatAgent(textToSend);
      const assistantMsg = {
        role: 'assistant',
        text: response.reply,
        tool_calls: response.tool_calls || []
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "I encountered an error querying the canteen database. Please ensure the backend is running.",
          tool_calls: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleToolDrawer = (msgIndex) => {
    setExpandedTools((prev) => ({ ...prev, [msgIndex]: !prev[msgIndex] }));
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col h-[750px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-stone-900 text-sm">Ask SmartServe AI</h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Data Grounded
              </span>
            </div>
            <p className="text-xs text-stone-500">Every response is strictly verified using real canteen database tools.</p>
          </div>
        </div>
      </div>

      {/* Suggested Prompts Banner */}
      <div className="px-4 py-2.5 bg-emerald-50/50 border-b border-emerald-100 overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-[11px] font-bold text-emerald-900 whitespace-nowrap">Suggested:</span>
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="text-xs whitespace-nowrap bg-white hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full transition-colors font-medium shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const hasTools = msg.tool_calls && msg.tool_calls.length > 0;
          const isDrawerOpen = expandedTools[index];

          return (
            <div key={index} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${
                isUser ? 'bg-stone-800' : 'bg-emerald-600'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                isUser
                  ? 'bg-stone-900 text-white rounded-tr-xs'
                  : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-tl-xs shadow-2xs'
              }`}>
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Show Data Used Collapsible Drawer */}
                {!isUser && hasTools && (
                  <div className="mt-3 pt-3 border-t border-stone-200">
                    <button
                      onClick={() => toggleToolDrawer(index)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      {isDrawerOpen ? 'Hide Grounded Data Used' : `Show Data Used (${msg.tool_calls.length} Tool Executions)`}
                      {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isDrawerOpen && (
                      <div className="mt-2.5 p-3 bg-stone-900 text-stone-200 rounded-xl text-xs font-mono space-y-2 border border-stone-800 overflow-x-auto">
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          Executed Tools & Ground Truth
                        </div>
                        {msg.tool_calls.map((tc, tIdx) => (
                          <div key={tIdx} className="border-b border-stone-800 pb-2 last:border-b-0 last:pb-0">
                            <div className="text-amber-400 font-semibold">→ {tc.tool_name}()</div>
                            <div className="text-stone-400 text-[11px]">Args: {JSON.stringify(tc.arguments)}</div>
                            <div className="text-emerald-300 text-[11px] mt-1 max-h-32 overflow-y-auto">
                              Result: {JSON.stringify(tc.result, null, 2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              SmartServe is querying canteen tools and calculating actions...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-stone-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about prep quantities, leftover repurposing, or simulate scenarios..."
            className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
