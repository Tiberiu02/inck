export class Icons {
  private static MaterialSymbol(name: string, color?: string) {
    return `
      <span class="material-symbols-outlined" ${color ? `style="color:${color}"` : ""}>
        ${name}
      </span>
    `;
  }

  static Copy(color?: string) {
    return Icons.MaterialSymbol("content_copy", color);
  }

  static Paste(color?: string) {
    return Icons.MaterialSymbol("content_paste", color);
  }

  static Cut(color?: string) {
    return Icons.MaterialSymbol("content_cut", color);
  }

  static Close(color?: string) {
    return Icons.MaterialSymbol("close", color);
  }

  static Check(color?: string) {
    return Icons.MaterialSymbol("check_circle", color);
  }

  static Delete(color?: string) {
    return Icons.MaterialSymbol("delete", color);
  }

  static Undo(color?: string) {
    return Icons.MaterialSymbol("undo", color);
  }

  static Redo(color?: string) {
    return Icons.MaterialSymbol("redo", color);
  }

  static Emoji(emoji: string) {
    return `
      <div style="font-family: 'Noto Color Emoji', sans-serif">${emoji}</div>
    `;
  }
}
