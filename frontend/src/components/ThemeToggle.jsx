import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") !== "light"  // default = dark
  );

  useEffect(() => {
    document.body.classList.toggle("light", !dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button className="theme-toggle" onClick={() => setDark(!dark)} title="Toggle theme">
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
