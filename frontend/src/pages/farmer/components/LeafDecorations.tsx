import type { CSSProperties } from "react";

const LeafDecorations = () => (
  <>
    {/* Feuille verte — haut droite */}
    <svg
      style={
        {
          position: "fixed",
          top: "8%",
          right: "3%",
          width: 70,
          height: 70,
          opacity: 0.35,
          pointerEvents: "none",
          zIndex: -1,
          animation: "farmerSwayLeft 7s ease-in-out infinite",
        } as CSSProperties
      }
      viewBox="0 0 60 60"
    >
      <path d="M30 5 C48 15,50 40,30 55 C10 40,12 15,30 5Z" fill="#74c69d" />
      <line x1="30" y1="5" x2="30" y2="55" stroke="#40916c" strokeWidth="1.5" opacity="0.6" />
    </svg>

    {/* Feuille dorée — bas droite */}
    <svg
      style={
        {
          position: "fixed",
          bottom: "12%",
          right: "2%",
          width: 90,
          height: 90,
          opacity: 0.28,
          pointerEvents: "none",
          zIndex: -1,
          animation: "farmerSwayRight 9s ease-in-out infinite",
          transform: "scaleX(-1)",
        } as CSSProperties
      }
      viewBox="0 0 80 80"
    >
      <path d="M40 6 C64 20,66 54,40 74 C14 54,16 20,40 6Z" fill="#c9a84c" />
      <line x1="40" y1="6" x2="40" y2="74" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5" />
    </svg>

    {/* Petite feuille verte — milieu gauche (optionnel) */}
    <svg
      style={
        {
          position: "fixed",
          top: "52%",
          left: "260px",
          width: 50,
          height: 50,
          opacity: 0.25,
          pointerEvents: "none",
          zIndex: -1,
          animation: "farmerSwayLeft 8s ease-in-out infinite",
          animationDelay: "-3s",
        } as CSSProperties
      }
      viewBox="0 0 50 50"
    >
      <path d="M25 4 C40 12,42 34,25 46 C8 34,10 12,25 4Z" fill="#8DBF3C" />
    </svg>
  </>
);

export default LeafDecorations;
