export function MaterialSymbol({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className="material-symbols-outlined">
      <span className={className}>{name}</span>
    </span>
  );
}
