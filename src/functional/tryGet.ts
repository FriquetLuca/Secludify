export function tryGet<T>(getter: () => T, defaultValue: T) {
    try {
      if(typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
        return { ...defaultValue, ...getter() };
      }
      return getter();
    } catch {
      return defaultValue;
    }
}
