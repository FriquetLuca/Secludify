import fs from "fs";
import { tryGet } from "../../functional";
  
export function loadMetadata<T>(path: string, defaultValue: T, overrideExt?: string) {
    return tryGet<T>(() => JSON.parse(fs.readFileSync(`${path}${overrideExt??".livify"}`, { encoding: "utf-8" })), defaultValue)
}
