export default function ChatBubble({ role, children }) {
    const mine = role === "user";
    return (
      <div className={`w-full flex ${mine ? "justify-end" : "justify-start"} mb-3`}>
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed shadow border
          ${mine ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-900 border-gray-200"}`}
        >
          {children}
        </div>
      </div>
    );
  }