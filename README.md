# 📍 React Native Live Location Tracking App

## 🧭 Objective

To develop a React Native application feature that:

- Continuously tracks the user's location.
- Draws a live path of movement on a map.
- Works offline and persists data across sessions.
- Supports both **foreground** and **background** location tracking.

---

## 🚀 Features

### 1. Live Tracking Map Screen
- Displays a map view using `react-native-maps`.
- Shows the user’s **current location** with a marker that moves in real time.

### 2. Real-time Path Drawing
- Draws a **polyline** to visualize the user's travel path.
- Updates the path live as the user moves.

### 3. Offline Functionality
- Fully functional **without internet**.
- Stores the traveled path locally using `AsyncStorage` (or optionally SQLite/MMKV/filesystem).

### 4. Persistent Path After Restart
- Automatically reloads the saved path when the app restarts.
- Draws the entire path on the map view on launch.

### 5. Background & Foreground Location Tracking
- Continues tracking:
  - While the app is open (foreground)
  - While the app is minimized or closed (background)
- Handles **permissions** and **platform-specific setup** for background tracking.

---

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/ysharma1999/LiveTracking
cd live-tracking-app


npm install
# or
yarn install

npx pod-install
Running the App
Android
npx react-native run-android
iOS
npx react-native run-ios
