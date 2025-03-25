import { type LocationElement } from "./locationTree";

export function sortLocationTree(element: LocationElement) {
    const result = { ...element };
    if (result.type === "directory") {
        result.content.sort((a, b) => {
            // Sort directories before files
            if (a.type === "directory" && b.type === "file") return -1;
            if (a.type === "file" && b.type === "directory") return 1;
            // Sort alphabetically by name
            return a.name.localeCompare(b.name);
        });
        // Recursively sort subdirectories
        result.content.forEach(sortLocationTree);
    }
    return result;
}
