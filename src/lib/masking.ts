export const maskName = (name: string): string => {
  if (name.length <= 1) {
    return name;
  }
  if (name.length === 2) {
    return `${name[0]}*`;
  }
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}`;
};

export const maskPhoneLast4 = (phoneLast4: string): string => `****${phoneLast4}`;
