import styles from "./Paysage.module.css";

/** Paysage décoratif : collines, mer et soleil couchant qui se lève doucement. */
export function Paysage({ anime = false }: { anime?: boolean }) {
  return (
    <svg
      className={`${styles.paysage} ${anime ? styles.anime : ""}`}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="400" height="220" fill="#FBE7B0" />
      <circle className={styles.soleil} cx="290" cy="120" r="38" fill="#F6C21C" />
      <g className={styles.nuages} fill="#FFF8E6">
        <ellipse cx="80" cy="50" rx="34" ry="10" />
        <ellipse cx="330" cy="36" rx="26" ry="8" />
      </g>
      <path d="M0 150 L70 90 L120 130 L180 70 L250 140 L400 110 L400 220 L0 220 Z" fill="#E8B54A" />
      <path d="M0 170 Q100 135 200 165 T400 155 L400 220 L0 220 Z" fill="#C98A1B" />
      <path className={styles.vague} d="M0 190 Q50 182 100 190 T200 190 T300 190 T400 190 L400 220 L0 220 Z" fill="#8A5A00" />
    </svg>
  );
}
