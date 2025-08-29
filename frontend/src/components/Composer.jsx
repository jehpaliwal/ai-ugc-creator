import { useState } from "react";

export default function Composer({ onSend }) {
  const [mode, setMode] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("casual");
  const [length, setLength] = useState("short");
  const [style, setStyle] = useState("product");
  const [aspectRatio, setAspectRatio] = useState("square");

  const submit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSend({ mode, prompt, platform, tone, length, style, aspectRatio });
    setPrompt("");
  };

  return (
    <form onSubmit={submit} className="w-full border-t bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={()=>setMode("text")}
          className={`px-3 py-1 rounded ${mode==="text"?"bg-indigo-600 text-white":"bg-gray-200"}`}>Text</button>
        <button type="button" onClick={()=>setMode("image")}
          className={`px-3 py-1 rounded ${mode==="image"?"bg-indigo-600 text-white":"bg-gray-200"}`}>Image</button>
      </div>

      {mode==="text" ? (
        <div className="flex flex-wrap gap-2 mb-2">
          <select value={platform} onChange={e=>setPlatform(e.target.value)} className="border rounded px-2 py-1">
            <option>instagram</option><option>tiktok</option><option>twitter</option>
          </select>
          <select value={tone} onChange={e=>setTone(e.target.value)} className="border rounded px-2 py-1">
            <option>casual</option><option>friendly</option><option>funny</option>
          </select>
          <select value={length} onChange={e=>setLength(e.target.value)} className="border rounded px-2 py-1">
            <option>short</option><option>medium</option><option>long</option>
          </select>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-2">
          <select value={style} onChange={e=>setStyle(e.target.value)} className="border rounded px-2 py-1">
            <option>product</option><option>selfie</option><option>demo</option>
          </select>
          <select value={aspectRatio} onChange={e=>setAspectRatio(e.target.value)} className="border rounded px-2 py-1">
            <option>square</option><option>portrait</option><option>landscape</option>
          </select>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea rows={2} className="flex-1 border rounded p-2"
          placeholder={mode==="text" ? "Write a UGC caption about..." : "Describe the UGC image you want..."}
          value={prompt} onChange={e=>setPrompt(e.target.value)} />
        <button className="bg-indigo-600 text-white px-4 py-2 rounded">Send</button>
      </div>
    </form>
  );
}