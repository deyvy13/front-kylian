// Diseño simple del logo "KJ": fondo azul plano + letras blancas gruesas.
export function kjIconStyle(size: number, opts?: { rounded?: boolean; maskable?: boolean }) {
  const rounded = opts?.rounded ?? true;
  const inset = opts?.maskable ? size * 0.1 : 0;
  return {
    outer: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#006cff",
    } as const,
    inner: {
      width: `${size - inset * 2}px`,
      height: `${size - inset * 2}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: rounded ? `${size * 0.22}px` : "0",
      background: "#006cff",
      color: "white",
      fontWeight: 900,
      fontSize: `${size * 0.62}px`,
      letterSpacing: `${-size * 0.04}px`,
      textShadow:
        `${size * 0.02}px 0 0 currentColor, ` +
        `${-size * 0.02}px 0 0 currentColor, ` +
        `0 ${size * 0.02}px 0 currentColor, ` +
        `0 ${-size * 0.02}px 0 currentColor`,
    } as const,
  };
}
