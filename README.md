# Kalam Spark Mobile

Kalam Spark Mobile is an offline-first AI Mentoring application built with React Native. It features a highly resilient, **3-Tier LLM Failover Architecture** to ensure the app continues to function seamlessly, even without an internet connection, by leveraging an on-device quantized model.

**🎉 Created for the Gemma 4 Hackathon 🎉**

## 📖 Project Summary

Kalam Spark provides a personalized mentoring experience using Google's Gemma 4. To provide uninterrupted service, it implements a 3-tier architecture for LLM inference:
1. **Tier 1 (Primary - Cloud):** OpenRouter API (`google/gemma-4-31b-it:free`) for fast, high-quality responses.
2. **Tier 2 (Backup - Cloud):** Google AI Studio API (`gemma-4-31b-it`) as a reliable fallback.
3. **Tier 3 (Offline - Local):** Cactus On-Device Quantized Model (`google_gemma-4-E2B-it-Q2_K.gguf`). Using `llama.rn`, the app falls back to this heavily compressed 2-bit model running entirely on the user's mobile device CPU when offline or cloud APIs fail.

This ensures accessibility and reliability in all network conditions, directly from your mobile device.

## 🚀 Features

- **3-Tier LLM Architecture:** Cloud-first with seamless fallback to an offline, on-device AI model.
- **Offline Inference:** Runs `gemma-4-E2B-it-Q2_K` locally on mobile using `llama.rn` and `react-native-fs`.
- **Memory Safe Design:** On-device CPU-only inference optimized for constrained mobile environments (4 threads, no mlock).
- **Cross-Platform:** Built with React Native for Android and iOS support.

## 🛠️ Tech Stack

- **Framework:** React Native
- **Local Inference:** `llama.rn` (llama.cpp wrapper)
- **Local Storage:** `@react-native-async-storage/async-storage` & `react-native-fs`
- **Networking:** Axios
- **Navigation:** React Navigation

---

## 💻 How to Run the App

### Prerequisites

- Node.js (v22 or newer)
- npm or Yarn
- React Native environment setup (Android Studio / Xcode). See [React Native Docs](https://reactnative.dev/docs/environment-setup) for detailed instructions.

### 1. Clone the Repository

```sh
git clone https://github.com/kavii10/Kalam-Spark-Mobile-Cactus.git
cd Kalam-Spark-Mobile-Cactus
```

### 2. Install Dependencies

```sh
npm install
# or
yarn install
```

### 3. Setting up the Offline Model (Required for Tier-3 Offline Mode)

To use the offline capabilities, you need the quantized Gemma 4 model.
1. Download the `google_gemma-4-E2B-it-Q2_K.gguf` model file to your mobile device.
2. Inside the app, navigate to the settings screen and use the "Import Model" feature to copy the `.gguf` file from your device's downloads into the app's secure internal storage.

### 4. Start the Application

**Start the Metro Bundler:**
```sh
npm start
# or
yarn start
```

**Run on Android:**
Open a new terminal window and run:
```sh
npm run android
# or
yarn android
```

**Run on iOS:**
*(macOS only. Requires CocoaPods to be installed first)*
```sh
cd ios
pod install
cd ..
npm run ios
# or
yarn ios
```

---
*Developed for the Gemma 4 Hackathon*
