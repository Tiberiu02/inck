import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type TextFieldProps = {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
};
export function TextField({ value, onChange, className = "" }: TextFieldProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={twMerge("bg-gray-100 border-[1px] px-2 border-gray-400 rounded-md", className)}
    />
  );
}

type DropdownProps<T> = {
  value: T;
  onChange: (newValue: T) => void;
  className?: string;
  children: ReactNode[];
};
export function Dropdown<T>({ value, onChange, className = "", children }: DropdownProps<T>) {
  return (
    <select
      value={value as string}
      onChange={(e) => onChange(e.target.value as T)}
      className={twMerge("bg-gray-100 border-[1px] px-2 border-gray-400 rounded-md", className)}
    >
      {children}
    </select>
  );
}
