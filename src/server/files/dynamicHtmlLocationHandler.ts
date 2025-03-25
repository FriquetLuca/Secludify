import path from "path";
import { type FileData } from ".";
import fs from 'fs';

export function dynamicHtmlLocationHandler(file: FileData, allowMarkdown: boolean = false): FileData {
    if(fs.existsSync(file.location)) {
        const stats = fs.statSync(file.location);
        if(stats.isDirectory()) {
            const indexFile = path.join(file.location, 'index.html');
            if(fs.existsSync(indexFile)) {
                return {
                    ...file,
                    contentType: 'text/html',
                    location: indexFile,
                };
            }
        }
    }
    else if(path.extname(file.location).length === 0) {
        const newFileLocation1 = `${file.location}.html`;
        if(fs.existsSync(newFileLocation1)) {
            return {
                ...file,
                contentType: 'text/html',
                location: newFileLocation1,
            };
        }
        if(allowMarkdown) {
            const newFileLocation2 = `${file.location}.md`;
            if(fs.existsSync(newFileLocation2)) {
                return {
                    ...file,
                    contentType: 'text/html',
                    location: newFileLocation2,
                };
            }
        }
    }
    return file;
}
