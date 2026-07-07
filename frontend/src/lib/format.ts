export const formatDA = (n: number | string): string =>
  new Intl.NumberFormat("fr-DZ").format(typeof n === "string" ? parseFloat(n) : n) + " DA";
