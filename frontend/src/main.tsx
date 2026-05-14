import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Royal Aurora — always light mode, strip any previously stored dark preference
document.documentElement.classList.remove("dark");
localStorage.removeItem("theme");

createRoot(document.getElementById("root")!).render(<App />);
