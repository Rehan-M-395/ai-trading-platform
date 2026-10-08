"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Plus, Send, Sparkles } from "lucide-react";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const starterPrompts = [
  "Summarize this chart",
  "Explain the latest price move",
  "What should I watch next?",
];

export function JarvisPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      text: "Hi, I’m Jarvis. Ask me about price action, market structure, or a setup you’re reviewing.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextMessageId = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const history = [...messages, { id: nextMessageId.current++, role: "user" as const, text }];
    setMessages(history);
    setDraft("");
    setError(null);
    setSending(true);

    try {
      const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://127.0.0.1:8000";
      const response = await fetch(`${pythonApiUrl}/jarvis/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((message) => message.id !== 0 || message.role !== "assistant")
            .map(({ role, text: content }) => ({ role, content })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? `Jarvis request failed (${response.status}).`);
      }
      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: "assistant", text: payload.reply },
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not reach Jarvis.");
    } finally {
      setSending(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setDraft("");
    setError(null);
  }

  return (
    <aside className="relative z-10 hidden min-h-0 w-[340px] shrink-0 flex-col border-l border-white/10 bg-[#090711]/90 backdrop-blur-xl xl:flex 2xl:w-[380px]">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-200">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-white">Jarvis</h2>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                Groq
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Trading assistant</p>
          </div>
        </div>
        <button
          type="button"
          onClick={startNewChat}
          disabled={sending}
          aria-label="Start a new chat"
          title="New chat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-violet-400/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="shrink-0 border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${sending ? "animate-pulse bg-violet-300" : "bg-emerald-400"}`} />
          {sending ? "Jarvis is thinking…" : "Groq-powered trading assistant"}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] text-violet-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-200">What are we looking at?</p>
            <p className="mt-1 max-w-[230px] text-xs leading-5 text-slate-500">
              Start a conversation about the selected market or chart.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10 text-violet-200">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-3 text-[13px] leading-5 ${
                    message.role === "user"
                      ? "rounded-br-md border border-fuchsia-400/20 bg-fuchsia-400/10 text-slate-100"
                      : "rounded-bl-md border border-white/[0.07] bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {sending && (
              <div className="text-xs text-slate-500">Jarvis is thinking…</div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-white/10 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setDraft(prompt)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[10px] text-slate-400 transition hover:border-violet-400/25 hover:text-violet-100"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={sendMessage}
          className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 focus-within:border-violet-400/35"
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            maxLength={4000}
            placeholder="Message Jarvis…"
            aria-label="Message Jarvis"
            className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-5 text-white outline-none placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-600">
          Responses are generated by Groq through the Python server.
        </p>
      </div>
    </aside>
  );
}
