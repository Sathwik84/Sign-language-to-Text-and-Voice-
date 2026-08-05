import { createContext, useContext, useEffect, useRef, useState } from "react";

// Vite proxy routes /live and /video through port 5173 → Flask port 5000
const BACKEND = "";

const ASLCtx = createContext(null);

export const SUPPORTED_SIGNS = [
    "accident", "africa", "all", "apple", "basketball", "bed", "before", "bird", "birthday", "black", "blue", "book", "bowling", "brown", "but", "can", "candy", "chair", "change", "cheat", "city", "clothes", "color", "computer", "cook", "cool", "corn", "cousin", "cow", "dance", "dark", "deaf", "decide", "doctor", "dog", "drink", "eat", "enjoy", "family", "fine", "finish", "fish", "forget", "full", "give", "go", "graduate", "hat", "hearing", "help", "hot", "how", "jacket", "kiss", "language", "last", "later", "letter", "like", "man", "many", "medicine", "meet", "mother", "need", "no", "now", "orange", "paint", "paper", "pink", "pizza", "play", "pull", "purple", "right", "same", "school", "secretary", "shirt", "short", "son", "study", "table", "tall", "tell", "thanksgiving", "thin", "thursday", "time", "walk", "want", "what", "white", "who", "woman", "work", "wrong", "year", "yes"
];

export function ASLProvider({ children }) {
    const [gesture, setGesture] = useState("");
    const [confidence, setConfidence] = useState(0);
    const [connected, setConnected] = useState(false);
    const [history, setHistory] = useState([]);
    const [keyboardText, setKeyboardText] = useState("");
    const lastRef = useRef("");

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user?.id;

    // Load initial history
    useEffect(() => {
        if (!userId) return;
        fetch(`http://localhost:5000/api/history?user_id=${userId}`)
            .then(r => r.json())
            .then(data => {
                if (data.success && data.history) {
                    setHistory(data.history.map(item => ({
                        ...item,
                        time: new Date(item.time)
                    })));
                }
            })
            .catch(err => console.error("Failed to load history:", err));
    }, [userId]);

    /* ── Poll backend every 900ms ── */
    useEffect(() => {
        const iv = setInterval(async () => {
            try {
                const r = await fetch(`${BACKEND}/live`);
                if (!r.ok) throw new Error("Backend offline");
                const j = await r.json();
                setGesture(j.gesture || "");
                setConfidence(j.confidence || 0);
                setConnected(true);

                // Auto-add to history when sign changes and confidence is high enough
                if (j.gesture && j.gesture !== lastRef.current && j.confidence > 0.35) {
                    lastRef.current = j.gesture;
                    const entry = {
                        id: Date.now(),
                        gesture: j.gesture,
                        confidence: j.confidence,
                        time: new Date(),
                    };
                    setHistory(prev => [entry, ...prev].slice(0, 200));

                    if (userId) {
                        fetch(`http://localhost:5000/api/history`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ user_id: userId, gesture: j.gesture, confidence: j.confidence })
                        }).catch(e => console.error("Error saving history:", e));
                    }
                }
            } catch {
                setConnected(false);
            }
        }, 900);
        return () => clearInterval(iv);
    }, []);

    const clearHistory = () => {
        setHistory([]);
        lastRef.current = "";
        if (userId) {
            fetch(`http://localhost:5000/api/history?user_id=${userId}`, { method: "DELETE" })
                .catch(e => console.error("Error clearing history:", e));
        }
    };

    /* ── Keyboard Mode Actions ── */
    const appendKeyboard = (word) => {
        if (!word) return;
        setKeyboardText(prev => prev ? prev + " " + word : word);
    };

    const backspaceKeyboard = () => {
        setKeyboardText(prev => {
            const parts = prev.trim().split(" ");
            if (parts.length <= 1) return "";
            return parts.slice(0, -1).join(" ");
        });
    };

    const clearKeyboard = () => setKeyboardText("");

    return (
        <ASLCtx.Provider value={{
            gesture, confidence, connected, history, clearHistory,
            keyboardText, appendKeyboard, backspaceKeyboard, clearKeyboard
        }}>
            {children}
        </ASLCtx.Provider>
    );
}

export const useASL = () => useContext(ASLCtx);
