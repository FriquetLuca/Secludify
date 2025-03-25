export const patchPrefix = (prefix: string): string => {
    if(prefix.endsWith("//")) {
        return patchPrefix(prefix.substring(0, prefix.length - 1));
    } else if(prefix.endsWith("/*")) {
        return patchPrefix(prefix.substring(0, prefix.length - 2));
    } else if(!prefix.startsWith("/")) {
        return `/${prefix}`
    } else if(!prefix.endsWith("/")) {
        return `${prefix}/`;
    } else {
        return prefix;
    }
};
