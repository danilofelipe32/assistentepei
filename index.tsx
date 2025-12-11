import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// --- Polyfill for process.env in browser environments ---
// This prevents "ReferenceError: process is not defined" when running via Babel Standalone
// This is critical for Vercel deployments relying on browser-side transpilation.
if (typeof process === 'undefined') {
    (window as any).process = { env: {} };
}

// Declare global libraries loaded via script tags for TypeScript
declare const pdfjsLib: any;

// --- Resilient PDF.js Worker Initialization ---
if (typeof pdfjsLib !== 'undefined') {
    const PDF_JS_VERSION = (pdfjsLib as any).version;
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.worker.min.js`;
} else {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof pdfjsLib !== 'undefined') {
             const PDF_JS_VERSION = (pdfjsLib as any).version;
             (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.worker.min.js`;
        } else {
            console.warn("A biblioteca pdf.js não foi encontrada. O processamento de PDF estará desativado.");
        }
    });
}

// --- MAIN RENDER LOGIC ---
const Main = () => {
    return <App />;
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Main />);