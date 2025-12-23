const rawDemoFlag = process.env.EXPO_PUBLIC_DEMO_DATA as string | undefined;
const isDev = process.env.NODE_ENV !== 'production';

export const DEMO_DATA_ENABLED = rawDemoFlag ? rawDemoFlag === 'true' : isDev;

