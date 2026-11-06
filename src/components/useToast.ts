"use client";
import { useCallback, useRef, useState } from "react";
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((s: string) => {
    setText(s);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setText(null), 2400);
  }, []);
  return { text, show };
}
