import { BackgroundTypes } from "@inck/common-types/Notes";
import { LocalStorage } from "../../LocalStorage";
import { Dropdown } from "./Input";

const NUM_STEPS = 9;

const BgOpts = {
  [BackgroundTypes.lines]: {
    MIN: 40,
    MAX: 120,
    BG_CLASS: "bg-note",
  },
  [BackgroundTypes.grid]: {
    MIN: 20,
    MAX: 60,
    BG_CLASS: "bg-grid",
  },
};

export function BackgroundSelector({ background, setBackground, spacing, setSpacing }) {
  return (
    <>
      <div className="flex gap-4">
        Background
        <Dropdown
          className="w-full"
          value={background}
          onChange={(bg) => {
            setBackground(bg);
            setSpacing(LocalStorage.lastSpacing(bg));
          }}
        >
          <option value={BackgroundTypes.blank}>None</option>
          <option value={BackgroundTypes.grid}>Grid</option>
          <option value={BackgroundTypes.lines}>Lines</option>
        </Dropdown>
      </div>
      {(background == BackgroundTypes.grid || background == BackgroundTypes.lines) && (
        <>
          <div className="flex gap-4">
            Spacing
            <div className="relative w-full flex">
              <div className="absolute top-1/2 w-full h-full flex justify-between px-2">
                {Array(NUM_STEPS)
                  .fill(0)
                  .map((idx) => (
                    <div key={idx} className="w-[1px] h-1 mt-2 bg-gray-400"></div>
                  ))}
              </div>
              <input
                className="w-full relative"
                type="range"
                min={BgOpts[background].MIN}
                max={BgOpts[background].MAX}
                step={(BgOpts[background].MAX - BgOpts[background].MIN) / (NUM_STEPS - 1)}
                value={spacing}
                onChange={(e) => setSpacing(+e.target.value)}
              />
            </div>
          </div>

          <div
            className={`relative w-full h-40 -mb-6 border-[1px] border-slate-400 rounded-lg ${BgOpts[background].BG_CLASS}`}
            style={{ backgroundSize: `${spacing}px ${spacing}px` }}
          ></div>
        </>
      )}
    </>
  );
}
