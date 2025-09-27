import * as fs from "fs";
import * as path from "path";

const FILE_PATH = path.join(process.cwd(), "storage.json")

interface StorageData {
  nullifer?: string;
}

function ensureDirExists(){
    const dir = path.dirname(FILE_PATH);
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir, {recursive:true})
    }
}

/**
 * Write a hash to storage.json
 */
export function writeHash(hash: string): void {
    ensureDirExists()
  const data: StorageData = { nullifer:hash };
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read the hash from storage.json
 * Returns null if file or hash not found.
 */
export function readHash(): string | null {
  if (!fs.existsSync(FILE_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(FILE_PATH, "utf-8");
  const data: StorageData = JSON.parse(raw);
  return data.nullifer ?? null;
}