import { directoryAllContent } from './directoryAllContent';
import fs from 'fs';

export const directoryAllFiles = (p: string) => directoryAllContent(p).filter((p) => !fs.lstatSync(p).isDirectory());
