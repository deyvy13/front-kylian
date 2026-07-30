// Diseño compartido del logo "KJ" para favicon, apple-icon y PWA.
export function kjIconStyle(size: number, opts?: { rounded?: boolean; maskable?: boolean }) {
  const rounded = opts?.rounded ?? true;
  // safe zone para maskable: ~80% del tamaño total
  const inset = opts?.maskable ? size * 0.1 : 0;
  return {
    outer: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0056d6",
    } as const,
    inner: {
      width: `${size - inset * 2}px`,
      height: `${size - inset * 2}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: rounded ? `${size * 0.22}px` : "0",
      background: "linear-gradient(135deg, #006cff 0%, #4d9bff 45%, #7c3aed 100%)",
      color: "white",
      fontWeight: 900,
      fontSize: `${size * 0.62}px`,
      letterSpacing: `${-size * 0.04}px`,
      // Simula un stroke extra para engrosar las letras aún más
      textShadow:
        `${size * 0.012}px 0 0 currentColor, ` +
        `${-size * 0.012}px 0 0 currentColor, ` +
        `0 ${size * 0.012}px 0 currentColor, ` +
        `0 ${-size * 0.012}px 0 currentColor`,
      boxShadow: `inset 0 ${size * 0.02}px 0 rgba(255,255,255,0.35)`,
    } as const,
  };
}
