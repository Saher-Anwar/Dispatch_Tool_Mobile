# Firebase Setup for Real-Time Location Sharing

## 🔥 Firebase Project Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it (e.g., "dispatch-tool-mobile")
4. Enable Google Analytics (optional)
5. Create project

### 2. Add Web App
1. In your Firebase project, click "Add app" → Web
2. Register app with nickname (e.g., "Location Tracker")
3. Copy the Firebase config object

### 3. Enable Realtime Database
1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose location (us-central1 recommended)
4. Start in **test mode** for now
5. Set these rules for testing:
```json
{
  "rules": {
    "trips": {
      ".read": true,
      ".write": true,
      "$tripId": {
        ".validate": "newData.hasChildren(['tripId', 'timestamp'])"
      }
    }
  }
}
```

## 📱 Update App Configuration

### 1. Update Firebase Config
Replace the config in `src/config/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 2. Update Web Viewer
Replace the config in `web-viewer/index.html` (same config as above)

### 3. Update Domain in Service
In `src/services/locationSharingService.ts`, update the domain:
```typescript
generateShareLink(tripId: string): string {
  return `https://yourdomain.com/track/${tripId}`;
}
```

## 🌐 Web Viewer Deployment

### Option 1: GitHub Pages (Free)
1. Create a new repo for the web viewer
2. Upload `web-viewer/index.html`
3. Enable GitHub Pages in repo settings
4. Your tracking links will be: `https://username.github.io/repo-name/track/TRIP_ID`

### Option 2: Netlify (Free)
1. Drag `web-viewer` folder to [Netlify](https://netlify.com)
2. Configure redirects by creating `_redirects` file:
```
/track/* /index.html 200
```
3. Your tracking links will be: `https://your-site.netlify.app/track/TRIP_ID`

### Option 3: Your Own Server
1. Upload `index.html` to your web server
2. Configure URL rewriting for `/track/*` to serve `index.html`

## 🔧 Testing the Integration

### 1. Test Data Flow
```javascript
// Test writing to Firebase (in browser console)
import { getDatabase, ref, set } from 'firebase/database';
const db = getDatabase();
set(ref(db, 'trips/test123'), {
  tripId: 'test123',
  timestamp: new Date().toISOString(),
  currentLocation: { lat: 40.7589, lng: -73.9851 },
  destination: { 
    lat: 40.7505, 
    lng: -73.9934, 
    address: "Times Square, New York" 
  },
  status: 'en_route'
});
```

### 2. Test Web Viewer
Visit: `https://yourdomain.com/track/test123`

## 🔒 Security (Production)

### 1. Secure Database Rules
```json
{
  "rules": {
    "trips": {
      "$tripId": {
        ".read": true,
        ".write": "auth != null || (!data.exists() && newData.hasChildren(['tripId', 'timestamp']))",
        ".validate": "newData.hasChildren(['tripId', 'timestamp'])"
      }
    }
  }
}
```

### 2. Environment Variables
Add to your `.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## 🚀 How It Works

1. **User starts navigation** → Creates Firebase trip entry
2. **Taps "Share Location"** → Generates unique link
3. **Shares link** → Third party opens web viewer
4. **Real-time updates** → Location broadcasts every 5 seconds
5. **Live tracking** → Web viewer shows position, ETA, progress
6. **Trip ends** → Data auto-expires after 1 hour

## 📱 User Experience

**Your App:**
- Start navigation to destination
- Tap "Share Location" 
- Share generated link via text/email
- Your location updates in real-time

**Third Party (Web Viewer):**
- Opens your link on any device
- Sees live map with your moving position
- Gets real-time ETA and progress updates
- Receives notification when you arrive

**Link Example:**
`https://yourapp.com/track/trip_1696723456789_abc123def`