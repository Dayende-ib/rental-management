import { useEffect, useRef } from "react";

export default function useRealtimeRefresh(onRefresh, entities = []) {
  const callbackRef = useRef(onRefresh);

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const allowed = new Set((entities || []).map((e) => String(e || "").toLowerCase()));

    const handler = (event) => {
      const entity = String(event?.detail?.entity || "").toLowerCase();
      if (!allowed.size || allowed.has(entity) || entity === "system") {
        callbackRef.current?.(event?.detail);
      }
    };

    window.addEventListener("app:realtime", handler);
    return () => window.removeEventListener("app:realtime", handler);
  }, [JSON.stringify(entities || [])]);
}

