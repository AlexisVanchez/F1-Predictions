# 🏎️ F1 Predictions Oracle

Welcome to the **F1 Predictions Oracle**, a premium web application designed for Formula 1 enthusiasts to predict race results, compete in leagues, and earn prestigious achievements. Built with a focus on high-performance aesthetics (F1 Night theme) and real-time data integration.

## 🚀 Get Started

### Prerequisites
- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **Firebase Account**: For authentication and Firestore database

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AlexisVanchez/F1-Predictions.git
   cd f1_predictions
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Firebase Setup**:
   - Create a project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Firestore Database** and **Google Authentication**.
   - Update your configuration in `src/redux/firebase_config.js`.

4. **Run the application**:
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:3000`.

## 📦 Core Dependencies

This project relies on the following key technologies:

| Dependency | Purpose |
|------------|---------|
| **React (v17)** | Frontend library for building the user interface. |
| **Redux Toolkit** | Centralized state management for user data, bets, and race results. |
| **Firebase (v9)** | Backend services for authentication and real-time NoSQL database. |
| **TailwindCSS** | Utility-first CSS framework for custom styling and "F1 Night" theme. |
| **React Router** | Client-side routing for seamless page navigation. |
| **OpenF1 API** | Integration with live Formula 1 race data and historical results. |

## 🛠️ Project Structure

- `src/Components`: UI components (Profile, Home, Leagues, etc.)
- `src/hooks`: Custom React hooks (e.g., `useAchievements`)
- `src/redux`: Redux slices and Firebase configuration
- `src/utils`: Utility functions (scoring logic, achievement calculations)

## 🏆 Key Features

- **Dynamic Achievements**: Monaco GP Master, Constructor Loyalty, and Yearly Championships.
- **Custom Leagues**: Create or join leagues with unique scoring systems.
- **Real-time Analytics**: Points trends, prediction accuracy, and global rankings.
- **F1 Night Aesthetic**: Dark mode with red accents, glassmorphism, and bold italic typography.

---
*Built for the Paddock.* 🏁
