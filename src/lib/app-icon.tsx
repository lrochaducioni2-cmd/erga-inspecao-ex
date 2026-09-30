// Ícone do app ("Ex" em âmbar sobre azul), desenhado como imagem para a
// tela inicial do celular, o favicon e o manifesto do app instalável.
export function AppIconArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#16405F",
        color: "#F2B233",
        fontSize: Math.round(size * 0.46),
        fontWeight: 700,
        letterSpacing: -Math.round(size * 0.02),
      }}
    >
      Ex
    </div>
  );
}
