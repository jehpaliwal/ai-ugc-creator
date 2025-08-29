import { useState } from "react";
import api from "./api";
import ChatBubble from "./components/ChatBubble";
import Composer from "./components/Composer";

function DownloadButton({ b64, filename = "ugc.png" }) {
  const download = () => {
    const a = document.createElement("a");
    a.href = "data:image/png;base64," + b64;
    a.download = filename;
    a.click();
  };
  return (
    <button onClick={download} className="mt-2 self-start bg-gray-900 text-white text-xs px-3 py-1 rounded">
      Download PNG
    </button>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", type: "text", content: "Hi! I can create UGC captions and images. Pick a mode below and send a prompt." }
  ]);
  const [loading, setLoading] = useState(false);

  const onSend = async ({ mode, prompt, platform, tone, length, style, aspectRatio }) => {
    const userMsg = { role: "user", type: mode, content: prompt };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    try {
      if (mode === "text") {
        const { data } = await api.post("/generate-text", { prompt, platform, tone, length });
        setMessages(m => [...m, { role: "assistant", type: "text", content: data.text }]);
      } else {
        const { data } = await api.post("/generate-image", { prompt, style, aspectRatio });
        setMessages(m => [...m, { role: "assistant", type: "image", content: data.url, b64: data.b64 }]);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message;
      setMessages(m => [...m, { role: "assistant", type: "text", content: "Error: " + msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600" />
          <h1 className="font-semibold">AI UGC Creator</h1>
          <span className="ml-auto text-xs text-gray-500">{loading ? "Generating..." : "Ready"}</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role}>
              {m.type === "text" ? (
                <div className="whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div className="flex flex-col gap-2">
                  <img src={m.content} alt="UGC preview" className="rounded-lg border max-w-full max-h-[420px] object-contain bg-white" />
                  {m.b64 && <DownloadButton b64={m.b64} />}
                </div>
              )}
            </ChatBubble>
          ))}
          {loading && (
            <ChatBubble role="assistant">
              <div className="animate-pulse text-gray-500">Thinking…</div>
            </ChatBubble>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Composer onSend={onSend} />
        </div>
      </footer>
    </div>
  );
}