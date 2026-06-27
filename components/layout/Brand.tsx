export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center">
      <img
        src="/brand/next-slide-logo.png"
        alt="Next Slide"
        className={
          compact
            ? "h-12 w-auto max-w-[220px] object-contain drop-shadow-[0_0_18px_rgba(0,147,255,0.25)]"
            : "h-20 w-auto max-w-[390px] object-contain drop-shadow-[0_0_24px_rgba(0,147,255,0.35)]"
        }
        draggable={false}
      />
    </div>
  );
}
