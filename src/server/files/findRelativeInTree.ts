import { type LocationElement } from "./locationTree";

export function findInTreeRoute(route: string, element: LocationElement): LocationElement | null {
    if(element.relativePath === route) {
        return element;
    }

    if (element.type === "directory") {
      for (const item of element.content) {
        if(route.startsWith(item.relativePath)) { // Don't search if the beggining don't match
            const found = findInTreeRoute(route, item);
            if (found) return found;
        }
      }
    }

    return null;
}

export function findLocationInTreeRoute(location: string, element: LocationElement): LocationElement | null {
  if(element.path === location) {
      return element;
  }

  if (element.type === "directory") {
    for (const item of element.content) {
      if(location.startsWith(item.path)) { // Don't search if the beggining don't match
          const found = findLocationInTreeRoute(location, item);
          if (found) return found;
      }
    }
  }

  return null;
}
