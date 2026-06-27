export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center">
      <img
        src="/brand/next-slide-logo.png"
        alt="Next Slide"
        className={compact ? "h-10 w-auto max-w-[170px] object-contain" : "h-12 w-auto max-w-[240px] object-contain"}
        draggable={false}
      />
    </div>
  );
}
