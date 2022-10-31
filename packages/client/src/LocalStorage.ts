import { BackgroundTypes } from "@inck/common-types/Notes";

// test

export class LocalStorage {
  static lastSpacing(pattern: BackgroundTypes): number {
    if (window.localStorage) {
      const val = window.localStorage.getItem(`last-bgSpacing-${pattern}`);
      if (val) return +val;
    }

    return 70;
  }

  static updateLastSpacing(pattern: BackgroundTypes, newSpacing: number) {
    window.localStorage.setItem(`last-bgSpacing-${pattern}`, newSpacing.toString());
  }

  static loadCachedNote(noteId: string) {
    const cache = window.localStorage && window.localStorage.getItem(`note-cache-${noteId}`);
    return cache ? JSON.parse(cache) : {};
  }

  static updateCachedNote(noteId: string, data: any) {
    const roundNumbersToFiveDecimals = (_, v: any) => (typeof v == "number" ? Math.round(v * 1e5) / 1e5 : v);
    if (window.localStorage) {
      window.localStorage.setItem(`note-cache-${noteId}`, JSON.stringify(data, roundNumbersToFiveDecimals));
    }
  }

  static removeCachedNote(noteId: string) {
    if (window.localStorage) {
      window.localStorage.removeItem(`note-cache-${noteId}`);
    }
  }

  static cachedNotes(): string[] {
    return Object.keys(localStorage)
      .filter((s) => s.match(/^note-cache-([\w\d]+)$/))
      .map((s) => s.match(/^note-cache-([\w\d]+)$/)[1]);
  }
}
