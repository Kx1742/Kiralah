export type Display = {
  theme: "system" | "light" | "dark";
  text: "normal" | "large";
};

export const DISPLAY_KEY = "kiralah:display";
export const DEFAULT_DISPLAY: Display = { theme: "system", text: "normal" };

/** Runs before the page paints, so a dark or large-text page never flashes light or small. */
export const DISPLAY_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("${DISPLAY_KEY}")||"{}");var r=document.documentElement;if(p.theme==="dark"||p.theme==="light")r.dataset.theme=p.theme;if(p.text==="large")r.dataset.text="large";}catch(e){}})();`;

export function applyDisplay(display: Display): void {
  const root = document.documentElement;
  if (display.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = display.theme;
  if (display.text === "large") root.dataset.text = "large";
  else delete root.dataset.text;
}
