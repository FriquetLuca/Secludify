import fs from 'fs';
import path from 'path';

export const directoryAllContent = (p: string, a: string[] = []) => {
    if(fs.statSync(p).isDirectory()) {
        fs.readdirSync(p).map((f: string) => directoryAllContent(a[a.push(path.join(p, f)) - 1], a));
    }
    return a;
};
