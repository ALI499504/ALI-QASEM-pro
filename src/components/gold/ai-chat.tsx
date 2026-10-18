"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Brain, X, Send, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Msg {
  role: "user" | "ai";
  text: string;
}

const QUICK_QUESTIONS = [
  "ما هو اتجاه الذهب الآن؟",
  "هل أنصح بالشراء أم الانتظار؟",
  "ما هي أبرز مستويات الدعم والمقاومة؟",
  "ما المخاطر الحالية في السوق؟",
];

export default function AIChatAssistant() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text:
        "مرحباً! أنا مساعدك الذكي لتداول الذهب. اسألني عن أي شيء يخص السوق أو الإشارة الحالية وأجيبك فوراً بالعربية.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Mount only on client (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll messages to bottom ONLY when new messages arrive
  // Uses scrollTop directly on the container — does NOT scroll the page
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Use instant jump (no smooth) to avoid any animation
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, open]);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/gold/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "ai", text: data.answer || "عذراً، لم أتمكن من الرد الآن." },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text:
            "عذراً، حدث خطأ مؤقت في الاتصال. تأكد من اتصال الإنترنت وحاول مرة أخرى.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleChat() {
    setOpen((o) => !o);
  }

  // === PURE inline styles, FIXED pixel dimensions, NO viewport units, NO animations ===
  // Position: FIXED at bottom-left, same as the brain button.

  const BUTTON_STYLE: React.CSSProperties = {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    zIndex: 999999,
    width: "56px",
    height: "56px",
    borderRadius: "9999px",
    background: "#d4a574",
    border: "2px solid #c8a050",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 4px rgba(200,160,80,0.1)",
    padding: 0,
    opacity: open ? 0 : 1,
    pointerEvents: open ? "none" : "auto",
    transition: "opacity 0.15s ease",
  };

  // FIXED pixel dimensions — 400px wide, 500px tall
  // This avoids any viewport calculation issues
  const CHAT_STYLE: React.CSSProperties = {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    zIndex: 999998,
    width: "400px",
    height: "500px",
    maxWidth: "calc(100vw - 40px)",
    maxHeight: "calc(100vh - 40px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "24px",
    background: "#0f1420",
    border: "1px solid #2a3142",
    boxShadow: "0 12px 48px rgba(0,0,0,0.5), 0 0 24px rgba(212,165,116,0.25)",
    color: "#f1f5f9",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "opacity 0.15s ease",
    willChange: "opacity",
    transform: "none",
  };

  const chatPanel = mounted ? createPortal(
    <div style={CHAT_STYLE} data-mrobot-chat="">
      {/* Header with close button */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #2a3142",
          background: "linear-gradient(to right, rgba(212,165,116,0.15), transparent)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              background: "rgba(212,165,116,0.6)",
              filter: "blur(8px)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "9999px",
              background: "#d4a574",
              border: "1px solid #c8a050",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Brain style={{ width: 20, height: 20, color: "#000" }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#f1f5f9",
            }}
          >
            مساعد M.ROBOT
            <Sparkles style={{ width: 14, height: 14, color: "#d4a574" }} />
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#8a96a8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "9999px",
                background: "#22d39a",
              }}
            />
            متصل الآن • بيانات Binance
          </div>
        </div>
        <button
          onClick={toggleChat}
          aria-label="إغلاق"
          title="إغلاق"
          style={{
            padding: "6px",
            borderRadius: "8px",
            background: "transparent",
            border: "1px solid #2a3142",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f1f5f9",
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Messages — uses ref for scrollTop, NOT scrollIntoView */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                borderRadius: "16px",
                padding: "10px 14px",
                fontSize: "14px",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: m.role === "user" ? "rgba(212,165,116,0.95)" : "#1a2030",
                color: m.role === "user" ? "#000" : "#f1f5f9",
                border: m.role === "user" ? "none" : "1px solid #2a3142",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                background: "#1a2030",
                border: "1px solid #2a3142",
                borderRadius: "16px",
                padding: "10px 14px",
                fontSize: "14px",
              }}
            >
              ● ● ●
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      {messages.length <= 2 && (
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #2a3142",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "10px", color: "#8a96a8", marginBottom: "6px" }}>
            أسئلة سريعة:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  background: "#1a2030",
                  border: "1px solid #2a3142",
                  color: "#f1f5f9",
                  cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #2a3142",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder="اكتب سؤالك عن تداول الذهب..."
            style={{
              flex: 1,
              minHeight: "44px",
              maxHeight: "128px",
              resize: "none",
              background: "#1a2030",
              borderColor: "#2a3142",
              color: "#f1f5f9",
            }}
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => ask(input)}
            disabled={loading}
            style={{
              background: "#d4a574",
              color: "#000",
              borderRadius: "12px",
              flexShrink: 0,
            }}
          >
            <Send style={{ width: 16, height: 16 }} />
          </Button>
        </div>
        <div
          style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "#8a96a8",
            opacity: 0.7,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <AlertTriangle style={{ width: 12, height: 12 }} />
          الردود للاسترشاد فقط وليست نصيحة استثمارية.
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={toggleChat}
        style={BUTTON_STYLE}
        aria-label={open ? "إغلاق المساعد الذكي" : "فتح المساعد الذكي"}
        title={open ? "إغلاق" : "فتح المساعد الذكي"}
      >
        <Brain style={{ width: 28, height: 28, color: "#000" }} />
        {!open && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: "9999px",
              background: "#22d39a",
              boxShadow: "0 0 6px #22d39a",
            }}
          />
        )}
      </button>

      {chatPanel}
    </>
  );
}
