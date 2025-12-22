# Nivasity Mobile App

A React Native mobile application for Nivasity, built with Expo and TypeScript.

## Features

- **Authentication**
  - Login
  - Registration
  - Forgot Password
- **Student Experience**
  - Dashboard stats and recent orders
  - Store browsing and checkout
  - Profile and theme (light/dark)
- **Payments**
  - Checkout with Interswitch payment integration

## Tech Stack

- **React Native** (v0.81.5)
- **React** (v19.1.0)
- **Expo** (~54.0.27)
- **TypeScript** (~5.9.2)
- **React Navigation** (v7.x)
- **Axios**
- **AsyncStorage**

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Studio / Emulator

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the dev server:
```bash
npm start
```

3. Run on your platform:
```bash
npm run ios
npm run android
npm run web
```

## API Configuration

By default the app uses `https://api.nivasity.com/v1`. To change it, set `EXPO_PUBLIC_API_BASE_URL` (recommended) or edit `API_BASE_URL` in `src/services/api.ts`.

## Project Structure

```
nivasity_app/
  src/
    components/
    contexts/
    navigation/
    screens/
    services/
    theme/
    types/
  assets/
  App.tsx
  app.json
  package.json
```

## Payment Integration

When a user proceeds to checkout, the app:

1. Creates an order in the backend
2. Initiates a payment session with Interswitch
3. Opens the payment URL

## License

MIT (see `LICENSE`).
