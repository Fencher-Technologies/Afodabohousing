export type AppStatusBarStyle = "light" | "dark";

export function getContrastingStatusBarStyle(backgroundColor: string): AppStatusBarStyle {
  const hex = normalizeHex(backgroundColor);

  if (!hex) {
    return "dark";
  }

  const red = parseInt(hex.slice(0, 2), 16) / 255;
  const green = parseInt(hex.slice(2, 4), 16) / 255;
  const blue = parseInt(hex.slice(4, 6), 16) / 255;

  const luminance =
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue);

  return luminance > 0.45 ? "dark" : "light";
}

function normalizeHex(color: string): string | null {
  const value = color.trim().replace("#", "");

  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return value
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }

  return null;
}

function linearize(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}
