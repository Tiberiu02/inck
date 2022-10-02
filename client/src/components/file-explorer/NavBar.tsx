import Link from "next/link";
import { disconnect } from "../AuthToken";
import { MaterialSymbol } from "../MaterialSymbol";
import { FaPencilAlt } from "react-icons/fa";

export function NavBar({ children, openSettings }) {
  return (
    <div className="flex flex-row gap-10 sm:gap-10 justify-between h-16 items-center px-4 sm:px-6 border-b-[1px] bg-white border-gray-300">
      <div className="flex gap-16">
        {/** Logo */}
        <Link href="/">
          <div className="hidden sm:flex flex-row gap-3 items-center text-gray-800 cursor-pointer">
            <FaPencilAlt className="text-2xl" />
            <p className="font-extrabold tracking-wider text-2xl text-gr mt-[0.1rem]">Inck</p>
          </div>
        </Link>

        {/** Selection options */}
        <div className="justify-center align-middle">{children}</div>
      </div>

      {/** User Options */}
      <div className="flex flex-row gap-2">
        {/** Settings */}
        <div onClick={openSettings}>
          <div className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full cursor-pointer">
            <MaterialSymbol name="settings" className="text-2xl" />
          </div>
        </div>

        {/** Log out */}
        <button
          onClick={() => disconnect()}
          className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full"
        >
          <MaterialSymbol name="logout" className="text-2xl" />
        </button>
      </div>
    </div>
  );
}
