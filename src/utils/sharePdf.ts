import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const safe = (v: string) => v.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);

/** Saves PDF bytes to the app's documents and opens the share sheet (WhatsApp, Files, email...). */
export async function sharePdf(bytes: Uint8Array, fileName: string, dialogTitle: string): Promise<string> {
  const file = new FileSystem.File(FileSystem.Paths.document, `${safe(fileName)}.pdf`);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
  }
  return file.uri;
}
