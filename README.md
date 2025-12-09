# Nivasity Mobile App

A React Native mobile application for Nivasity platform, built with Expo and TypeScript.

## Features

- **Authentication System**
  - Login
  - Registration
  - Forgot Password

- **Student Dashboard**
  - View orders and statistics
  - Browse store
  - Manage profile

- **Admin Dashboard**
  - View admin statistics
  - Manage users, orders, and products

- **E-commerce Features**
  - Product browsing
  - Shopping cart
  - Checkout with Interswitch payment integration

- **Profile Management**
  - Edit user profile
  - Update account information

## Tech Stack

- **React Native** (v0.81.5)
- **React** (v19.1.0)
- **Expo** (~54.0.27)
- **TypeScript** (~5.9.2)
- **React Navigation** (v7.x)
- **Axios** (v1.7.9)
- **AsyncStorage** (v2.1.0)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Nivasity/nivasity_app.git
cd nivasity_app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your platform:
```bash
# For iOS
npm run ios

# For Android
npm run android

# For Web
npm run web
```

## API Configuration

The app is configured to connect to the Nivasity API at `https://api.nivasity.com/v1`.

To change the API endpoint, update the `API_BASE_URL` in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://your-api-endpoint.com';
```

## Project Structure

```
nivasity_app/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Loading.tsx
│   ├── contexts/          # React Context providers
│   │   └── AuthContext.tsx
│   ├── navigation/        # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/           # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── StudentDashboardScreen.tsx
│   │   ├── AdminDashboardScreen.tsx
│   │   ├── ProfileEditScreen.tsx
│   │   ├── StoreScreen.tsx
│   │   └── CheckoutScreen.tsx
│   ├── services/          # API services
│   │   └── api.ts
│   └── types/             # TypeScript type definitions
│       └── index.ts
├── assets/                # Images and static files
├── App.tsx                # App entry point
├── app.json               # Expo configuration
└── package.json           # Dependencies
```

## User Roles

The app supports two user roles:

1. **Student**: Access to store, orders, and profile management
2. **Admin**: Access to admin dashboard and management features

## Payment Integration

The app integrates with Interswitch for payment processing. When a user proceeds to checkout, the app:

1. Creates an order in the backend
2. Initiates a payment session with Interswitch
3. Redirects the user to the payment page
4. Verifies the payment status after completion

## Development

### Adding New Screens

1. Create a new screen component in `src/screens/`
2. Add navigation routes in `src/navigation/AppNavigator.tsx`
3. Update the navigation types if needed

### API Integration

All API calls are centralized in `src/services/api.ts`. To add new endpoints:

1. Define the TypeScript types in `src/types/index.ts`
2. Add the API function in `src/services/api.ts`
3. Use the function in your screens

## Building for Production

### Android

```bash
expo build:android
```

### iOS

```bash
expo build:ios
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@nivasity.com or visit https://nivasity.com