import { Share } from 'react-native';
import type { Product, User } from '../types';

// Student web portals by school id. nivasity.com is the marketing site, so a shared
// link must open the student's school portal (which signs them in, then opens the material).
const SCHOOL_PORTALS: Record<string, string> = {
  '1': 'https://funaab.nivasity.com',
};

export const materialShareUrl = (product: Product, user?: User | null): string => {
  const portal = SCHOOL_PORTALS[String(user?.schoolId ?? '')];
  // Schools without a web portal yet: point to the site where students get the app.
  return portal ? `${portal}/material/${encodeURIComponent(String(product.id))}` : 'https://www.nivasity.com';
};

export const shareMaterial = async (product: Product, user?: User | null) => {
  try {
    await Share.share({
      message: `${product.name}\n${product.description}\nPrice: NGN ${product.price.toLocaleString()}\n\nGet the material here: ${materialShareUrl(product, user)}`,
    });
  } catch {
    // ignore (share sheet dismissed)
  }
};
