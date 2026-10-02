import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { receiptsAPI } from '../services/api';

const safe = (v: string) => v.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);

/**
 * Downloads the official receipt PDF for a payment reference and opens the share sheet,
 * so the student can save it to Files/Drive or send it. Returns the local file uri.
 */
export async function downloadAndShareReceipt(ref: string, itemId?: string | number): Promise<string> {
  const bytes = await receiptsAPI.getPdf(ref, itemId);
  const file = new FileSystem.File(FileSystem.Paths.document, `nivasity-receipt-${safe(ref)}${itemId ? `-${itemId}` : ''}.pdf`);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Nivasity receipt' });
  }
  return file.uri;
}
