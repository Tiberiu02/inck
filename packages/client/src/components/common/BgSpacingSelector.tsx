import { BackgroundTypes } from "@inck/common-types/Notes";

export function BgSpacingSelector({ background, spacing, setSpacing }) {
  return (
    <>
      <div className="flex gap-4">
        Spacing
        <div className="relative w-full flex">
          <div className="absolute top-1/2 w-full h-full flex justify-between px-2">
            {Array(9)
              .fill(0)
              .map((idx) => (
                <div key={idx} className="w-[1px] h-1 mt-2 bg-gray-400"></div>
              ))}
          </div>
          <input
            className="w-full relative"
            type="range"
            min="40"
            max="120"
            step="10"
            value={spacing}
            onChange={(e) => setSpacing(+e.target.value)}
          />
        </div>
      </div>
      {background == BackgroundTypes.lines && (
        <div
          className="relative w-full h-40 -mb-6 border-[1px] border-slate-400 rounded-lg bg-note"
          style={{ backgroundSize: `${spacing}px ${spacing}px` }}
        ></div>
      )}
      {background == BackgroundTypes.grid && (
        <div
          className="relative w-full h-40 -mb-6 border-[1px] border-slate-400 rounded-lg bg-grid"
          style={{ backgroundSize: `${spacing / 2}px ${spacing / 2}px` }}
        ></div>
      )}
    </>
  );
}
