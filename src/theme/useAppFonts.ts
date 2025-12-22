import { useFonts } from 'expo-font';

export const useAppFonts = () => {
  return useFonts({
    'SFProDisplay-Regular': require('../../assets/fonts/SFProDisplay-Regular.otf'),
    'SFProDisplay-Bold': require('../../assets/fonts/SFProDisplay-Bold.otf'),
    'SFProDisplay-Medium': require('../../assets/fonts/SFProDisplay-Medium.otf'),
    // Add more weights/styles as needed
  });
};
