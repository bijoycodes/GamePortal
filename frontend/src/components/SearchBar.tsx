"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CloseIcon, SearchIcon } from "./icons";

export interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
}

export function SearchBar({ initialValue = "", placeholder = "Search games, developers..." }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function navigate(nextValue: string): void {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextValue.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    const encoded = params.toString();
    router.push(encoded ? `${pathname}?${encoded}` : pathname);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    navigate(value);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <label htmlFor="game-search" className="sr-only">
        Search games
      </label>
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="game-search"
          name="q"
          type="search"
          value={value}
          maxLength={120}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="input pl-9"
        />
      </div>
      <button type="submit" className="btn-primary">
        Search
      </button>
      {initialValue && (
        <button type="button" className="btn-secondary" onClick={() => { setValue(""); navigate(""); }}>
          <CloseIcon className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </form>
  );
}
