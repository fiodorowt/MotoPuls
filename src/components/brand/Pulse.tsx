const SPIKE = "l10 -7 l9 7 h12 l7 5 l11 -30 l12 46 l10 -31 l7 10 h16 l9 -6 l9 6";

/** Separator sekcji: pozioma linia z jednym „uderzeniem” pulsu pośrodku. */
export function PulseDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`} aria-hidden="true">
      <span className="bg-line h-px flex-1" />
      <svg viewBox="0 0 150 56" className="text-accent h-10 w-28 shrink-0" focusable="false">
        <path d={`M0 28 ${SPIKE} H150`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="bg-line h-px flex-1" />
    </div>
  );
}

const HERO_PATH = `M0 60 H150 ${SPIKE} h170 ${SPIKE.replace("-30", "-44").replace("46", "66").replace("-31", "-37")} h190 ${SPIKE} h160 ${SPIKE.replace("-30", "-38").replace("46", "56").replace("-31", "-33")} H1200`;

/** Animowana linia pulsu w hero. Przy prefers-reduced-motion animacje wyłącza globals.css. */
export function HeroPulse({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 120" className={`text-accent w-full ${className}`} aria-hidden="true" focusable="false">
      <path d={HERO_PATH} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" strokeLinejoin="round" />
      <path
        d={HERO_PATH}
        pathLength={1}
        className="pulse-draw"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="1196" cy="60" r="5" fill="currentColor" className="pulse-beat" />
    </svg>
  );
}

const STEP_WIDTH = ["w-0", "w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"] as const;
const PROGRESS_PATH = `M0 28 ${Array.from({ length: 5 }, () => `h30 ${SPIKE} h30`).join(" ")}`;

/** Pasek postępu kreatora: linia pulsu wypełniająca się z każdym krokiem (1–5). */
export function PulseProgress({ step, total = 5 }: { step: number; total?: number }) {
  const width = STEP_WIDTH[Math.max(0, Math.min(5, step))];
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-valuetext={`Krok ${step} z ${total}`}
      className="relative h-10 w-full overflow-hidden"
    >
      <svg viewBox="0 0 1050 56" preserveAspectRatio="none" className="text-line-strong absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={PROGRESS_PATH} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className={`absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-500 ${width}`}>
        {/* Szerokość 500% × 1/5 kontenera = pełna szerokość paska niezależnie od kroku */}
        <svg viewBox="0 0 1050 56" preserveAspectRatio="none" className={`text-accent h-full ${INNER_WIDTH[Math.max(1, Math.min(5, step))]}`} aria-hidden="true">
          <path d={PROGRESS_PATH} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

// Wewnętrzny rysunek musi mieć szerokość całego paska: 100% / (krok/5)
const INNER_WIDTH = ["", "w-[500%]", "w-[250%]", "w-[166.667%]", "w-[125%]", "w-full"] as const;
