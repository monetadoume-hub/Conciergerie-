"use client";

import { useState } from "react";

interface Turn {
  question: string;
  response: string | null;
  pending: boolean;
}

export function AskWidget({ guideToken }: { guideToken: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setInput("");
    setSending(true);
    setTurns((prev) => [...prev, { question, response: null, pending: true }]);

    try {
      const res = await fetch("/api/guest/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guide_token: guideToken, question }),
      });
      const data = await res.json();

      setTurns((prev) =>
        prev.map((t, i) =>
          i === prev.length - 1
            ? { ...t, response: data.response ?? "Une erreur est survenue.", pending: false }
            : t
        )
      );
    } catch {
      setTurns((prev) =>
        prev.map((t, i) => (i === prev.length - 1 ? { ...t, response: "Une erreur est survenue.", pending: false } : t))
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {turns.length > 0 && (
        <div className="space-y-3">
          {turns.map((turn, i) => (
            <div key={i} className="space-y-1">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-neutral-900 px-3 py-2 text-sm text-white">
                {turn.question}
              </p>
              {turn.pending ? (
                <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-400">
                  …
                </p>
              ) : (
                <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-800">
                  {turn.response}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question…"
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
