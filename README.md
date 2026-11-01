# AstroNemi - Comprehensive Vedic Astrology App

## ✅ Status: Expo Setup Complete & Ready for Mobile Testing

All Metro bundler errors resolved. App successfully running on Expo for iOS and Android development.

> **v1 launch note:** AI features (AstroBot chat, AI instant consultations, AI Guru
> insights, soulmate AI synthesis) are implemented and kept in the codebase, but
> **disabled in production**. See `docs/PRODUCTION_READINESS.md` for the AI-off
> launch checklist and re-enable steps. Dream interpretation stays available as
> offline symbolic guidance.

**Quick Start:**
```bash
npm start
# Scan QR code with Expo Go app on your phone
```

📖 **See docs/ folder for setup guides**

---

<div align="center">
  <img src="assets/images/icon.png" alt="AstroNemi Logo" width="120" height="120">
  
  <h3>Your Complete Guide to Vedic Astrology</h3>
  
  [![Expo](https://img.shields.io/badge/Expo-54-blue)](https://expo.dev)
  [![React Native](https://img.shields.io/badge/React%20Native-0.81-green)](https://reactnative.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
</div>

---

## 📱 Features

### Core Astrology Features
- **Birth Chart (Kundli)** - Complete Vedic birth chart with planetary positions
- **KP Astrology** - Krishnamurti Paddhati system for precise predictions
- **Jaimini Astrology** - Jaimini chara dasha and karakas
- **Ashtakvarga** - 8-fold strength analysis of planets
- **Shadbala** - Six-fold strength calculation
- **Nadi Astrology** - Ancient Nadi predictions

### Compatibility & Matchmaking
- **Kundli Matching** - Guna Milan with detailed analysis
- **Chart Comparison** - Compare two birth charts
- **Compatibility Score** - Detailed compatibility report

### Predictions & Forecasts
- **Daily Horoscope** - Personalized daily predictions
- **Transit Analysis** - Gochar (planetary transit) effects
- **Varshphal** - Annual horoscope (solar return)
- **Muhurat** - Auspicious timing for events
- **Panchang** - Hindu almanac with tithi, nakshatra, yoga

### Specialized Astrology
- **Medical Astrology** - Health predictions and remedies
- **Financial Astrology** - Wealth and career predictions
- **Child Astrology** - Children's horoscope analysis
- **Pet Astrology** - Pet horoscopes and compatibility
- **Western Astrology** - Tropical zodiac system
- **Chinese Astrology** - Chinese zodiac signs

### Divination
- **Tarot Reading** - Multiple tarot spreads
- **Numerology** - Life path, destiny numbers
- **Dream Interpretation** - Dream analysis and meanings

### Consultation Services
- **Live Chat** - Real-time chat with astrologers
- **Video Calls** - Face-to-face consultations
- **Voice Calls** - Phone consultations
- **Ask a Question** - Get answers to specific questions
- **AI Chatbot** - AI-powered astrology assistant

### Commerce & Content
- **Gemstone Shop** - Buy certified gemstones
- **Courses** - Learn astrology online
- **Blog** - Articles and insights
- **Podcasts** - Audio content
- **Videos** - Educational videos
- **Community** - Connect with other users

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/astronemi.git
   cd astronemi/rork-astronemi-app-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Razorpay (Payments)
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret

# Agora (Video Calls)
AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-certificate

# Sentry (Crash Reporting)
SENTRY_DSN=your-sentry-dsn

# Mixpanel (Analytics)
MIXPANEL_TOKEN=your-mixpanel-token
```

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `lib/database.types.ts`
3. Enable Row Level Security
4. Configure authentication providers
5. Set up storage buckets

---

## 📁 Project Structure

```
rork-astronemi-app-main/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen
│   │   ├── horoscope.tsx  # Horoscope screen
│   │   ├── kundli.tsx     # Kundli screen
│   │   ├── astrologers.tsx # Astrologers list
│   │   └── wallet.tsx     # Wallet screen
│   ├── login.tsx          # Login screen
│   ├── profile.tsx        # Profile screen
│   └── ...                # Other screens
├── components/            # Reusable components
│   ├── LocationPicker.tsx # Location selection
│   └── ...
├── contexts/              # React contexts
│   ├── AuthContext.tsx    # Authentication state
│   ├── ThemeContext.tsx   # Theme state
│   ├── LanguageContext.tsx # Language state
│   └── ...
├── services/              # API services
│   ├── payment.ts         # Razorpay integration
│   ├── chat.ts            # Real-time chat
│   ├── video-call.ts      # Agora video
│   ├── notifications.ts   # Push notifications
│   └── ...
├── config/                # Configuration files
│   ├── code-splitting.ts  # Lazy loading config
│   └── bundle-analysis.ts # Bundle optimization
├── utils/                 # Utility functions
│   ├── vedic-astrology.ts # Vedic calculations
│   ├── kundli-generator.ts # Kundli generation
│   └── ...
├── mocks/                 # Mock data
├── types/                 # TypeScript types
├── lib/                   # Third-party integrations
│   ├── supabase.ts        # Supabase client
│   └── database.types.ts  # Database schema
├── supabase/              # Supabase functions
│   └── functions/
│       └── verify-payment/
├── __tests__/             # Unit, integration, and critical-flow tests
└── assets/                # Static assets
```

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Critical-flow tests

```bash
npm run test:smoke
```

### Run Specific Test

```bash
npm test -- --testPathPattern "wallet"
```

---

## 🚢 Deployment

### Build for Production

Before the first release, run `eas init` and replace
`expo.extra.eas.projectId` in `app.json`, then provide the `EXPO_PUBLIC_*`
values through EAS environment variables. The production gate validates them:

```bash
npm run check:production
```

```bash
# Android
npx eas build --platform android --profile production

# iOS
npx eas build --platform ios --profile production
```

### Submit to Stores

```bash
# Google Play
npx eas submit --platform android --latest

# App Store
npx eas submit --platform ios --latest
```

### Deploy Backend

```bash
supabase functions deploy
```

---

## 📊 Monitoring

### Analytics Events

The app tracks the following events:
- `app_opened` - App launch
- `screen_view` - Screen navigation
- `consultation_booked` - Consultation booking
- `payment_completed` - Successful payment
- `subscription_started` - New subscription

### Crash Reporting

Crashes are automatically reported to Sentry with:
- Device information
- User context
- Breadcrumb trail
- Stack trace

---

## 🔐 Security

### Authentication Flow

1. Phone number verification via OTP
2. JWT token generation
3. Session management
4. Secure token storage

### Data Protection

- All API calls use HTTPS
- Sensitive data encrypted at rest
- Row Level Security on database
- Input validation on all forms

---

## 🌐 Internationalization

Supported Languages:
- English (en)
- Hindi (hi)
- Tamil (ta)
- Telugu (te)
- Marathi (mr)
- Gujarati (gu)
- Kannada (kn)
- Bengali (bn)

### Add New Language

1. Create translation file in `locales/xx.json`
2. Add to `LanguageContext.tsx`
3. Update language selector

---

## 📈 Performance Optimization

### Bundle Optimization

- Route-based code splitting
- Lazy loading of screens
- Image optimization
- Tree shaking

### Runtime Performance

- Memoization with React.memo
- Virtualized lists
- Optimized re-renders
- Background task optimization

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- Conventional commits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Expo](https://expo.dev) - React Native framework
- [Supabase](https://supabase.com) - Backend services
- [Razorpay](https://razorpay.com) - Payment gateway
- [Agora](https://agora.io) - Video call SDK
- [Sentry](https://sentry.io) - Error monitoring

---

## 📞 Support

- **Email:** support@astronemi.app
- **Phone:** +91-XXXXXXXXXX
- **Website:** https://astronemi.app

---

<div align="center">
  Made with ❤️ by Team AstroNemi
</div>
