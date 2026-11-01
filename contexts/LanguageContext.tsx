import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';

// Import translation files
import hiTranslations from '../locales/hi';
import taTranslations from '../locales/ta';
import teTranslations from '../locales/te';
import knTranslations from '../locales/kn';
import mrTranslations from '../locales/mr';
import guTranslations from '../locales/gu';
import bnTranslations from '../locales/bn';

// Available languages
export const LANGUAGES = {
  en: 'English',
  hi: 'हिंदी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  bn: 'বাংলা',
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Translation type - flexible nested structure
type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationKeys = { [key: string]: TranslationValue };

// English translations (default) - flat structure for backward compatibility
const enTranslations: TranslationKeys = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    search: 'Search',
    noResults: 'No results found',
    retry: 'Retry',
    seeAll: 'See All',
    viewAll: 'View All',
    learnMore: 'Learn More',
    getStarted: 'Get Started',
    loadingStars: 'Reading the stars...',
    unableToLoad: 'Unable to load data. Please try again.',
    ok: 'OK',
    disable: 'Disable',
  },

  // Navigation
  nav: {
    home: 'Home',
    horoscope: 'Horoscope',
    kundli: 'Kundli',
    astrologers: 'Astrologers',
    wallet: 'Wallet',
    profile: 'Profile',
    settings: 'Settings',
  },

  // Auth
  auth: {
    login: 'Login',
    logout: 'Logout',
    signUp: 'Sign Up',
    loginTitle: 'Login to Your Account',
    loginSubtitle: 'Enter your mobile number to continue',
    phonePlaceholder: 'Enter mobile number',
    phoneError: 'Please enter a valid 10-digit mobile number',
    sendOtp: 'Send OTP',
    otpSent: 'OTP sent successfully',
    otpTitle: 'Enter OTP',
    otpSubtitle: 'We sent a 6-digit code to',
    otpPlaceholder: 'Enter 6-digit OTP',
    otpError: 'Invalid OTP. Please try again.',
    verifyOtp: 'Verify OTP',
    resendOtp: 'Resend OTP',
    resendOtpIn: 'Resend OTP in',
    welcomeBack: 'Welcome Back',
    loginSuccess: 'Login successful!',
    getOtp: 'Get OTP',
    verifyAndContinue: 'Verify & Continue',
    changeNumber: 'Change Number',
    otpComplete: 'Please enter the complete 6-digit OTP',
    termsAgree: 'By continuing, you agree to our',
    termsAndPrivacy: 'Terms & Privacy Policy',
    welcomeTitle: 'Welcome',
    verifyTitle: 'Verify OTP',
    otpSentTo: 'Enter the 6-digit code sent to',
    expertAstrologers: 'Verified Astrologers',
    happyUsers: 'Private & Secure',
    consultation247: '24/7 Consultation',
    appTagline: 'Your Cosmic Companion',
    devOtpTitle: '📱 Dev Mode - OTP',
    devOtpMessage: 'Your OTP is:',
    devNewOtpTitle: '📱 Dev Mode - New OTP',
    devOtpNote: '(This alert only appears in development builds)',
    loginSignUp: 'Login / Sign Up',
  },

  // Home Screen
  home: {
    greeting: 'Namaste',
    subtitle: 'Discover Your Destiny',
    freeKundli: 'Get Your Free Kundli',
    freeKundliDesc: 'Discover insights about your life, career & relationships',
    generateNow: 'Generate Now',
    todayHoroscope: "Today's Horoscope",
    ourServices: 'Our Services',
    topAstrologers: 'Top Astrologers',
    goPremium: 'Go Premium',
    premiumDesc: 'Unlimited consultations & exclusive features',
    viewPlans: 'View Plans',
    referEarn: 'Refer & Earn Rs.100',
    referDesc: 'Share with friends and earn wallet balance',
    inviteNow: 'Invite Now',
    astroShop: 'Astro Shop',
    browseAll: 'Browse All',
    learnAstrology: 'Learn Astrology',
    freeCourses: 'Free Courses & Articles',
    whyAstrofusion: 'Why AstroNemi?',
    accuratePredictions: 'Accurate Predictions',
    expertAstrologers: 'Expert Astrologers',
    available247: '24/7 Available',
    aiPowered: 'AI Powered',
  },

  // Astrologers
  astrologers: {
    title: 'Find Astrologers',
    subtitle: 'Chat • Call • Video Consultation',
    searchPlaceholder: 'Search for Experts...',
    online: 'Online',
    offline: 'Offline',
    busy: 'Busy',
    experience: '{years} Years',
    rating: '{rating} Rating',
  },

  // Kundli
  kundli: {
    title: 'Kundli',
    subtitle: 'Birth Chart Analysis',
    generateKundli: 'Generate Kundli',
    yourKundlis: 'Your Kundlis',
    noKundlis: 'No Kundlis Yet',
    noKundlisDesc: 'Generate your first Kundli to discover insights',
    enterDetails: 'Enter Birth Details',
    name: 'Full Name',
    namePlaceholder: 'Enter your full name',
    birthDate: 'Birth Date',
    birthDatePlaceholder: 'DD/MM/YYYY',
    birthTime: 'Birth Time',
    birthTimePlaceholder: 'HH:MM',
    birthPlace: 'Birth Place',
    birthPlacePlaceholder: 'Enter city name',
    generating: 'Generating your Kundli...',
    ascendant: 'Ascendant',
    moonSign: 'Moon Sign',
    sunSign: 'Sun Sign',
    nakshatra: 'Nakshatra',
    mangalDosha: 'Mangal Dosha',
    present: 'Present',
    notPresent: 'Not Present',
    planets: 'Planets',
    houses: 'Houses',
    dasha: 'Dasha',
    yogas: 'Yogas',
    insights: 'Insights',
    downloadPdf: 'Download PDF',
    shareKundli: 'Share Kundli',
    saveKundli: 'Save Kundli',
    divisionalCharts: 'Divisional Charts',
    d1Chart: 'D1 - Rashi Chart',
    d9Chart: 'D9 - Navamsa Chart',
    d3Chart: 'D3 - Drekkana Chart',
  },

  // Horoscope
   horoscope: {
     title: 'Horoscope',
     daily: 'Daily',
     weekly: 'Weekly',
     monthly: 'Monthly',
     yearly: 'Yearly',
     selectSign: 'Select Your Sign',
     todaysHoroscope: "Today's Horoscope",
     yesterday: 'Yesterday',
     tomorrow: 'Tomorrow',
     luckyNumber: 'Lucky Number',
     luckyColor: 'Lucky Color',
     luckyTime: 'Lucky Time',
     career: 'Career',
     love: 'Love',
     health: 'Health',
     finance: 'Finance',
     family: 'Family',
     cosmicSky: 'The Cosmic Sky Today',
     moonIn: 'Moon in',
     sunIn: 'Sun in',
     month: 'Month',
     tithi: 'Tithi',
     predictionTitle: 'Your Prediction',
     mood: 'Mood',
     compatibility: 'Compatibility',
     lifeAspects: 'Life Aspects',
     aries: 'Aries',
     taurus: 'Taurus',
     gemini: 'Gemini',
     cancer: 'Cancer',
     leo: 'Leo',
     virgo: 'Virgo',
     libra: 'Libra',
     scorpio: 'Scorpio',
     sagittarius: 'Sagittarius',
     capricorn: 'Capricorn',
     aquarius: 'Aquarius',
     pisces: 'Pisces',
   },

  // Panchang
  panchang: {
    snapshot: 'Daily Cosmic Snapshot',
    tithi: 'Tithi',
    nakshatra: 'Nakshatra',
    paksha: 'Paksha',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    moonIn: 'Moon in {rashi}',
    yoga: 'Yoga',
    karana: 'Karana',
  },

   // Matching
   matching: {
     title: 'Kundli Matching',
     subtitle: 'Compatibility Analysis',
     boyDetails: "Boy's Details",
     girlDetails: "Girl's Details",
     matchScore: 'Match Score',
     matchResult: 'Match Result',
     gunaMilan: '36 Guna Milan Breakdown',
     analyzingSynergy: 'Analyzing Soulmate Synergy...',
     groom: 'Groom',
     bride: 'Bride',
     calculateSynergy: 'Calculate Synergy',
     soulmateSynergy: 'Soulmate Synergy',
   },

   // Services
   services: {
     panchang: 'Panchang',
     horoscope: 'Horoscope',
     kundli: 'Kundli',
     matching: 'Matching',
     varshphal: 'Varshphal',
   },

   // Varshphal
   varshphal: {
     title: 'Yearly Report',
     calculating: 'Calculating Solar Return {year}...',
     returnMoment: 'SOLAR RETURN MOMENT',
     yearlyMuntha: 'YEARLY MUNTHA',
     yearlyThemes: 'Yearly Themes',
     varshaKundli: 'Varsha Kundli (Year-Ahead Chart)',
     description: 'Varshphal is a specialized yearly horoscope based on the Solar Return. The Muntha position is the most sensitive point determining the success level of the year.',
   },

   // Profile
   profile: {
     title: 'Profile',
     logoutConfirm: 'Are you sure you want to logout?',
     account: 'Account',
     saved: 'Saved',
     support: 'Support',
     app: 'App',
     wallet: 'Wallet',
     orders: 'My Orders',
     consultations: 'My Consultations',
     kundlis: 'My Kundlis',
     favorites: 'Favorite Astrologers',
     chatHistory: 'Chat History',
     help: 'Help & Support',
     privacy: 'Privacy & Security',
     notifications: 'Notifications',
     settings: 'Settings',
     welcome: 'Welcome to AstroNemi',
    loginPrompt: 'Login to save your Kundli, get personalized predictions, and access all features',
    myProfile: 'My Profile',
    savedKundlis: 'Saved Kundlis',
    noSavedKundlis: 'No saved Kundlis yet',
    noSavedKundlisDesc: 'Generate and save Kundlis for quick access',
    dailyHoroscope: 'Daily Horoscope',
    festivalReminders: 'Festival Reminders',
    muhuratAlerts: 'Muhurat Alerts',
    transitAlerts: 'Transit Alerts',
    referralProgram: 'Referral Program',
    astrologerConsole: 'Astrologer Console',
    deleteKundli: 'Delete Kundli',
    deleteKundliConfirm: 'Are you sure you want to delete {name}?',
    updateSuccess: 'Profile updated successfully',
    updateError: 'Failed to update profile. Please try again.',
    name: 'Full Name',
    email: 'Email',
    phone: 'Phone Number',
    editProfile: 'Edit Profile',
    contactUs: 'Contact Us',
  },

   // Wallet
   wallet: {
     title: 'My Wallet',
     balance: 'Available Balance',
     addMoney: 'Add Money',
     history: 'Transaction History',
     processing: 'Processing Payment',
     success: 'Payment Successful!',
     failed: 'Payment Failed',
     secureNote: '100% Secure Payment • Powered by Razorpay',
     quickAmounts: 'Quick Recharge',
     paymentMethod: 'Payment Method',
     bonus: 'bonus cashback!',
     sendGift: 'Send Gift',
     offers: 'Offers',
     enterAmount: 'Enter Amount',
   },

   // Settings
   settings: {
     title: 'Settings',
     appearance: 'Appearance',
     darkMode: 'Dark Mode',
     followSystem: 'Follow System Theme',
     language: 'Language',
     appLanguage: 'App Language',
     selectLanguage: 'Select Language',
     privacy: 'Privacy & Security',
     privacyPolicy: 'Privacy Policy',
     terms: 'Terms of Service',
     support: 'Support',
     help: 'Help & Support',
     about: 'About AstroNemi',
     data: 'Data',
     exportData: 'Export My Data',
     clearCache: 'Clear Cache',
     deleteAccount: 'Delete Account',
     cacheCleared: 'Cache cleared successfully',
     confirmClearCache: 'This will clear all cached data. Your saved kundlis and preferences will be preserved.',
     confirmDeleteAccount: 'This action cannot be undone. All your data including saved kundlis, consultation history, and wallet balance will be permanently deleted.',
   },

   // Admin Dashboard
   admin: {
     dashboard: 'Admin Dashboard',
     management: 'AstroNemi Management',
     metrics: {
       activeUsers: 'Active Users',
       revenue: 'Revenue',
       sessions: 'Sessions',
       conversion: 'Conversion',
     },
     alerts: {
       active: 'Active Alerts',
       resolve: 'Resolve',
     },
     actions: {
       quickActions: 'Quick Actions',
       userManagement: 'User Management',
       analytics: 'Analytics',
       payments: 'Payments',
       security: 'Security',
       settings: 'Settings',
     },
     health: {
       title: 'System Health',
       apiResponseTime: 'API Response Time',
       errorRate: 'Error Rate',
       memoryUsage: 'Memory Usage',
       crashRate: 'Crash Rate',
     },
      activity: {
        title: 'Recent Activity',
        newUserRegistration: 'New user registration',
        paymentCompleted: 'Payment completed',
        consultationBooked: 'Consultation booked',
        kundliGenerated: 'Kundli generated',
      },
    },

    // Subscription
    subscription: {
      title: 'Subscription Plans',
      free: 'Free',
      basic: 'Basic',
      premium: 'Premium',
      gold: 'Gold',
      perMonth: '/month',
      perYear: '/year',
      save: 'Save',
      currentPlan: 'Current Plan',
      upgrade: 'Upgrade',
      downgrade: 'Downgrade',
      subscribe: 'Subscribe',
      features: 'Features',
      unlimited: 'Unlimited',
      limited: 'Limited',
      adFree: 'Ad-free Experience',
      prioritySupport: 'Priority Support',
      cancelPlan: 'Cancel Plan',
      planActive: 'Plan Active',
      planExpires: 'Expires on',
      renew: 'Renew',
      unlockDestiny: 'Unlock Your Destiny',
      choosePlan: 'Choose the perfect plan for your spiritual journey',
      currentPlanLabel: 'Current Plan',
      validUntil: 'Valid until',
      monthly: 'Monthly',
      yearly: 'Yearly',
      savePercent: 'Save 40%',
      mostPopular: 'MOST POPULAR',
      subscribeNow: 'Subscribe Now',
      currentPlanButton: 'Current Plan',
      comparePlans: 'Compare All Plans',
      referEarn: 'Refer & Earn',
      referEarnText: 'Get Rs. 100 for every friend who subscribes!',
      completeSubscription: 'Complete Subscription',
      orderSummary: 'Order Summary',
      plan: 'Plan',
      billing: 'Billing',
      duration: 'Duration',
      months12: '12 months',
      month1: '1 month',
      subtotal: 'Subtotal',
      discount: 'Discount',
      total: 'Total',
      paymentMethod: 'Payment Method',
      upi: 'UPI',
      card: 'Credit/Debit Card',
      netBanking: 'Net Banking',
      wallet: 'Wallet',
      pay: 'Pay',
      subscribeTerms: 'By subscribing, you agree to our Terms of Service and Privacy Policy. Subscription auto-renews unless cancelled.',
      freePlanAlert: 'Free Plan',
      freePlanMsg: 'You are already on the free plan!',
      loginRequired: 'Login Required',
      loginRequiredMsg: 'Please login to subscribe to a plan.',
      cancel: 'Cancel',
      login: 'Login',
      successTitle: 'Success!',
      subscribedMsg: 'You are now subscribed to',
      paymentFailed: 'Payment Failed',
      pleaseTryAgain: 'Please try again.',
      errorTitle: 'Error',
      couldNotProcess: 'Could not process subscription.',
      subFeatures: {
        dailyHoroscope: 'Daily Horoscope',
        basicPanchang: 'Basic Panchang',
        limitedAiChat: 'Limited AI Chat (5/day)',
        viewAstrologerProfiles: 'View Astrologer Profiles',
        allFreeFeatures: 'All Free Features',
        weeklyMonthlyHoroscopes: 'Weekly & Monthly Horoscopes',
        unlimitedAiChat: 'Unlimited AI Chat',
        freeConsultationMinutes: 'Free Consultation Minutes',
        saveMultipleKundlis: 'Save Multiple Kundlis',
        allBasicFeatures: 'All Basic Features',
        yearlyPredictions: 'Yearly Predictions',
        transitReports: 'Transit Reports (Gochar)',
        priorityAstrologerAccess: 'Priority Astrologer Access',
        pdfReportDownloads: 'PDF Report Downloads',
        exclusiveRemedies: 'Exclusive Remedies',
        allPremiumFeatures: 'All Premium Features',
        unlimitedConsultations: 'Unlimited Consultations*',
        vipAstrologerAccess: 'VIP Astrologer Access',
        personalizedDailyGuidance: 'Personalized Daily Guidance',
        sadeSatiAlerts: 'Sade Sati & Transit Alerts',
        familyKundliStorage: 'Family Kundli Storage (5)',
        prioritySupport247: 'Priority Support 24/7',
        exclusiveEventsAccess: 'Exclusive Events Access',
      },
      compare: {
        dailyHoroscope: 'Daily Horoscope',
        weeklyMonthlyHoroscope: 'Weekly/Monthly Horoscope',
        aiChat: 'AI Chat',
        freeMinutes: 'Free Minutes',
        pdfReports: 'PDF Reports',
        vipAstrologers: 'VIP Astrologers',
        allPlans: 'All Plans',
        basicPlus: 'Basic+',
        unlimitedBasic: 'Unlimited (Basic+)',
        mins5to50: '5-50 mins',
        premiumPlus: 'Premium+',
        goldOnly: 'Gold Only',
      },
    },

    // Referral
    referral: {
      title: 'Refer & Earn',
      yourCode: 'Your Referral Code',
      shareCode: 'Share Code',
      howItWorks: 'How It Works',
      referralHistory: 'Referral History',
      pending: 'Pending',
      credited: 'Credited',
      totalEarnings: 'Total Earnings',
      friendsReferred: 'Friends Referred',
      shareVia: 'Share via',
      whatsapp: 'WhatsApp',
      facebook: 'Facebook',
      twitter: 'Twitter',
      copyLink: 'Copy Link',
      terms: 'Terms & Conditions',
      noCodeYet: 'No code yet',
      noCodeYetMsg: 'Your referral code will appear once your profile is set up.',
      shareFailed: 'Failed to share',
      enterCode: 'Please enter a referral code',
      ownCode: 'You cannot use your own referral code',
      codeApplied: 'Code Applied!',
      codeAppliedMsg: 'You received Rs. {amount} in your wallet.',
      invalidCode: 'Invalid code',
      invalidCodeMsg: 'That referral code is not recognised.',
      earnPerReferral: 'Earn Rs. {amount} Per Referral!',
      heroSubtitle: 'Share your code with friends and earn wallet balance when they sign up',
      friendGets: 'Friend Gets',
      youEarn: 'You Earn',
      shareWithFriends: 'Share with Friends',
      totalReferrals: 'Total Referrals',
      successful: 'Successful',
      totalEarned: 'Total Earned',
      haveCode: 'Have a Referral Code?',
      enterCodeSubtitle: 'Enter a friend\'s code to get Rs. {amount} in your wallet',
      referralCodePlaceholder: 'Enter referral code',
      apply: 'Apply',
      step1Title: 'Share Your Code',
      step1Desc: 'Send your unique referral code to friends via WhatsApp, SMS, or any platform',
      step2Title: 'Friend Signs Up',
      step2Desc: 'Your friend downloads the app and enters your code during signup',
      step3Title: 'Both Get Rewarded',
      step3Desc: 'You get Rs. {you} and your friend gets Rs. {friend} in wallet',
      noReferrals: 'No referrals yet. Share your code to start earning.',
      completed: 'Completed',
      premiumBonus: 'Premium Bonus!',
      premiumBonusText: 'Refer 10 friends and get 1 month Premium FREE!',
      term1: 'Referral code can only be used by new users during signup',
      term2: 'Referral rewards are credited after successful verification',
      term3: 'Wallet balance can be used for consultations with astrologers',
      term4: 'Referral rewards cannot be transferred or withdrawn',
      term5: 'AstroNemi reserves the right to modify rewards at any time',
      shareAndEarn: 'Share your code and earn credits',
    },

    // Help
    help: {
      title: 'Help & Support',
      liveChat: 'Live Chat',
      liveChatMsg: 'Our support team is available 24/7. Starting chat...',
      enterQuery: 'Please enter your query',
      querySubmitted: 'Your query has been submitted. Our team will respond within 24 hours.',
      email: 'Email',
      emailPlaceholder: 'Your email address',
      callUs: 'Call Us',
      available247: '24/7 Available',
      faq: 'Frequently Asked Questions',
      all: 'all',
      responseTime: 'Response within 24 hours',
      submitQuery: 'Submit a Query',
      submitQueryButton: 'Submit Query',
      messagePlaceholder: 'Describe your issue or question...',
    },

    // About
    about: {
      title: 'About Us',
      tagline: 'Your Gateway to Cosmic Wisdom',
      whoWeAre: 'Who We Are',
      whoWeAre1: 'AstroNemi is a modern astrology platform that combines ancient wisdom with cutting-edge technology.',
      whoWeAre2: 'Founded by experts in both traditional astrology and software development, we aim to make cosmic insights accessible to everyone.',
      missionText: 'To make ancient wisdom accessible to everyone through technology.',
      madeWithLove: 'Made with ❤️ in India',
      happyUsers: 'Happy Users',
      consultations: 'Consultations',
      appRating: 'App Rating',
      whatWeOffer: 'What We Offer',
      freeKundli: 'Free Kundli Generation',
      freeKundliDesc: 'Accurate birth chart analysis',
      expertAstrologersDesc: 'Verified professionals available 24/7',
      multipleLanguages: 'Multiple Languages',
      multipleLanguagesDesc: 'Consultations in Hindi, English & more',
      trustedPlatform: 'Trusted Platform',
      trustedPlatformDesc: 'Secure payments & privacy guaranteed',
      ourMission: 'Our Mission',
      contactUs: 'Contact Us',
      followUs: 'Follow Us',
    },

    // Not Found
    notFound: {
      title: 'Page Not Found',
      oops: 'Oops! Page Not Found',
      subtitle: 'The stars couldn\'t find this page',
      returnHome: 'Return to Home',
    },

    // Not Found Web
    notFoundWeb: {
      title: '📱 AstroNemi Mobile App',
      subtitle: 'This page is only available in the mobile app.',
      description: 'The page you\'re looking for isn\'t available on the web.',
      instructions: 'Follow these steps to run the app on your device:',
      step1: '1. Install Expo Go on your mobile device',
      step2: '2. Scan the QR code shown in the terminal',
      step3: '3. Enjoy the full app experience!',
      downloadExpo: 'Download Expo Go:',
      iosAppStore: 'iOS: App Store',
      androidPlayStore: 'Android: Google Play Store',
      feature1: '• Live video consultations with astrologers',
      feature2: '• Real-time chat and voice calls',
      feature3: '• Push notifications for important updates',
      feature4: '• Advanced Kundli calculations',
      feature5: '• Personalized horoscope readings',
    },

    // Security
    security: {
      title: 'Security Settings',
      status: 'Security Status',
      enabled: 'Enabled',
      disabled: 'Disabled',
      biometricLogin: 'Biometric Login',
      biometricAuth: 'Biometric Authentication',
      biometricDescEnabled: 'Use your fingerprint or face to login quickly',
      biometricDescDisabled: 'Set up biometric in device settings first',
      twoFactor: 'Two-Factor Authentication',
      twoFactorAuth: 'Two-Factor Auth',
      twoFactorDesc: 'Add an extra layer of security to your account',
      score: 'Security Score',
      activeMethods: 'Active Methods',
      changePassword: 'Change Password',
      password: 'Password',
      lastChanged: 'Last changed 30 days ago',
      showPassword: 'Show Password',
      recentLoginActivity: 'Recent Login Activity',
      viewAllActivity: 'View All Activity',
      enableTwoFactor: 'Enable Two-Factor Authentication',
      choose2faMethod: 'Choose your preferred 2FA method:',
      smsVerification: 'SMS Verification',
      sms2faEnabled: 'SMS 2FA has been enabled',
      authenticatorApp: 'Authenticator App',
      authenticator2faEnabled: 'Authenticator app 2FA has been enabled',
      disableTwoFactor: 'Disable Two-Factor Authentication',
      disable2faConfirm: 'Are you sure you want to disable 2FA? This will make your account less secure.',
      usePasscode: 'Use Passcode',
      authPrompt: 'Authenticate to enable biometric login',
      authFailed: 'Authentication failed. Please try again.',
      biometricEnabled: 'Biometric login has been enabled successfully!',
      biometricDisabled: 'Biometric login has been disabled',
      noBiometricEnrolled: 'No biometric credentials enrolled. Please set up biometric authentication in your device settings.',
      notAvailable: 'Not Available',
      tips: 'Security Tips',
      tipStrongPassword: 'Use a strong, unique password',
      tipTwoFactor: 'Enable two-factor authentication',
      tipBiometric: 'Use biometric login for convenience',
      tipReviewActivity: 'Review login activity regularly',
      dangerZone: 'Danger Zone',
      logoutAllDevices: 'Log Out All Devices',
    },

    // Shop
    shop: {
      title: 'Astro Shop',
      subtitle: 'Gemstones & Remedies',
      categories: 'Categories',
      gemstones: 'Gemstones',
      rudraksha: 'Rudraksha',
      yantras: 'Yantras',
      crystals: 'Crystals',
      mala: 'Mala',
      books: 'Books',
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      price: 'Price',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      description: 'Description',
      benefits: 'Benefits',
      howToUse: 'How to Use',
      reviews: 'Reviews',
      relatedProducts: 'Related Products',
      cart: 'Cart',
      checkout: 'Checkout',
      orderPlaced: 'Order Placed Successfully',
      trackOrder: 'Track Order',
      spiritualShop: 'Spiritual Shop',
      loadingProducts: 'Loading products...',
      unableToLoad: 'Unable to Load',
      tryAgain: 'Try Again',
      certified: 'Certified',
      authentic: '100% Authentic',
      labCertified: 'Lab Certified',
      freeShipping: 'Free Shipping',
      all: 'All',
      loadingMore: 'Loading more...',
      whyShop: 'Why Shop With Us?',
      authenticDesc: 'All products are lab tested and certified',
      freeShippingDesc: 'Pan India delivery at no extra cost',
      easyReturns: 'Easy Returns',
      easyReturnsDesc: '7-day return policy on all items',
      energized: 'Energized',
      energizedDesc: 'All items blessed with Vedic rituals',
      productDetails: 'Product Details',
      reviewsSuffix: 'reviews',
      associatedPlanet: 'Associated Planet',
      weight: 'Weight',
      consultBeforeBuying: 'Consult Before Buying',
      off: 'OFF',
    },
  };

// All translations - using imported locale files with nested structure
const translations: Record<LanguageCode, TranslationKeys> = {
  en: enTranslations,
  hi: hiTranslations as unknown as TranslationKeys,
  ta: taTranslations as unknown as TranslationKeys,
  te: teTranslations as unknown as TranslationKeys,
  mr: mrTranslations as unknown as TranslationKeys,
  gu: guTranslations as unknown as TranslationKeys,
  kn: knTranslations as unknown as TranslationKeys,
  bn: bnTranslations as unknown as TranslationKeys,
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string>) => string;
  tNested: (section: string, key: string) => string;
  availableLanguages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@astrofusion_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  // effect:audited — Initialization: Load saved language preference from AsyncStorage on mount
  // This MUST be a useEffect because it reads from persistent storage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLang && savedLang in LANGUAGES) {
          setLanguageState(savedLang as LanguageCode);
        }
      } catch (error) {
        Logger.error('Error loading language:', error);
      }
    };
    // Load in background without blocking
    loadLanguage().catch(err => Logger.error('Error in loadLanguage:', err));
  }, []);

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      Logger.error('Error saving language:', error);
    }
  };

  // Translation function — supports dot-notation nested keys like "common.loading"
  // and also interpolation: t('greeting', { name: 'John' }) => "Hello, John"
  const t = (key: string, params?: Record<string, string>): string => {
    const getNestedValue = (obj: TranslationKeys, path: string): string | null => {
      const parts = path.split('.');
      let current: Record<string, unknown> = obj;
      for (const part of parts) {
        if (current == null || typeof current[part] === 'undefined') return null;
        const val = current[part];
        if (val === null || typeof val !== 'object') {
          return typeof val === 'string' ? val : null;
        }
        current = val as Record<string, unknown>;
      }
      return typeof current === 'string' ? current : null;
    };

    const translation = translations[language];
    let value = getNestedValue(translation, key);

    if (!value) {
      value = getNestedValue(enTranslations, key);
    }

    if (!value) return key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value!.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
      });
    }

    return value;
  };

  // Translation function for nested keys (e.g., tNested('common', 'loading'))
  const tNested = (section: string, key: string): string => {
    const translation = translations[language];
    const sectionData = translation[section];
    if (sectionData && typeof sectionData === 'object' && key in sectionData) {
      const value = (sectionData as Record<string, string>)[key];
      if (typeof value === 'string') {
        return value;
      }
    }
    // Fallback to English
    const englishSection = enTranslations[section];
    if (englishSection && typeof englishSection === 'object' && key in englishSection) {
      const value = (englishSection as Record<string, string>)[key];
      if (typeof value === 'string') {
        return value;
      }
    }
    return `${section}.${key}`;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tNested,
        availableLanguages: LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    // Return default values if context is not available
    return {
      language: 'en' as LanguageCode,
      setLanguage: () => {},
      t: (key: string, _params?: Record<string, string>) => key,
      tNested: (section: string, key: string) => `${section}.${key}`,
      availableLanguages: LANGUAGES,
    };
  }
  return context;
}

export { LanguageContext };
