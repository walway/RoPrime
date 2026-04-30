import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp.jsx";
import "./popup.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Missing #root element for popup app.");
}

createRoot(rootElement).render(<PopupApp />);

