import { registerPlugin } from "@capacitor/core";

export interface FileWriterPlugin {
  writeChunk(options: {
    filename: string;
    dataBase64: string; // BASE64
    append?: boolean;
  }): Promise<{ path: string; uri: string }>;
}

const FileWriter = registerPlugin<FileWriterPlugin>("FileWriter");

export default FileWriter;
