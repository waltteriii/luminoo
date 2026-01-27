import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { ErrorBoundary } from "./components/ui/error-boundary";

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
