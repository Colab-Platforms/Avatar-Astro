import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { i18nReady } from "./i18n";
import "./index.css";
import "./polish.css";
import { registerServiceWorker } from "./pwa/register";

// Start once the saved language (if any) has loaded, so the first paint is already in it. English is bundled, so this is instant.
void i18nReady.finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});

registerServiceWorker();
