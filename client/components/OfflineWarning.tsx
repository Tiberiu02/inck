import { MaterialSymbol } from "./MaterialSymbol";

export function OfflineWarning() {
  return (
    <div
      id="offline-warning"
      className="invisible z-10 absolute right-6 top-2 text-2xl bg-gray-500 text-white py-1 px-3 rounded-full flex items-center gap-3 opacity-50"
    >
      <MaterialSymbol name="wifi_off" className="text-2xl" />
      <div className="text-md text-lg">working offline</div>
    </div>
  );
}
