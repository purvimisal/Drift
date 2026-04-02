import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setSessionIdGetter } from "@workspace/api-client-react";

function getOrCreateSessionId(): string {
  const previewSession = new URLSearchParams(window.location.search).get("previewSession");
  if (previewSession) return previewSession;
  let id = localStorage.getItem("drift_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("drift_session_id", id);
  }
  return id;
}

setSessionIdGetter(getOrCreateSessionId);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
