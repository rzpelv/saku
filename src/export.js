import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export async function exportFile(content, name, type, {
  native = Capacitor.isNativePlatform(),
  filesystem = Filesystem,
  share = Share,
  browserDocument = globalThis.document,
  browserURL = URL,
} = {}) {
  if (native) {
    const { uri } = await filesystem.writeFile({
      path: name,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await share.share({ title: name, files: [uri] });
    } catch (error) {
      if (error?.message !== "Share canceled") throw error;
    }
    return;
  }
  const url = browserURL.createObjectURL(new Blob([content], { type }));
  const a = browserDocument.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => browserURL.revokeObjectURL(url), 1000);
}
