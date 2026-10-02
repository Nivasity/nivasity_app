import { useFonts } from 'expo-font';

// Geist, same as the web portal. AppText picks the file from fontWeight.
export const useAppFonts = () => {
  return useFonts({
    'Geist-Regular': require('../../assets/fonts/Geist_400Regular.ttf'),
    'Geist-Medium': require('../../assets/fonts/Geist_500Medium.ttf'),
    'Geist-SemiBold': require('../../assets/fonts/Geist_600SemiBold.ttf'),
    'Geist-Bold': require('../../assets/fonts/Geist_700Bold.ttf'),
    'Geist-ExtraBold': require('../../assets/fonts/Geist_800ExtraBold.ttf'),
  });
};
