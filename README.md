# Life Sentinel
**Live Demo:** https://lifesentinel.vercel.app/

> **Predict & Protect**

> Life Sentinel is an AI-powered emergency management and response platform designed to help people act faster and more safely before, during, and after emergencies.

Life Sentinel combines AI-assisted emergency assessment, browser location services, weather and hazard awareness, nearby emergency resources, trusted contacts, emergency reporting, safety guidance, and SOS workflows in a responsive React single-page application.
> **Emergency notice:** Life Sentinel is an assistance and information tool. It does not replace emergency services, medical advice, law enforcement, or professional disaster-response systems. In a life-threatening emergency, call the appropriate local emergency number immediately (for example, **1122** in Pakistan).
## Why Life Sentinel?

The name **Life Sentinel** represents the purpose of the platform:

- **Life** — the people and communities the platform is designed to help protect.
- **Sentinel** — a watchful protector that helps identify risks, provide guidance, and connect people to help when it matters most.

Life Sentinel does not try to stop emergencies from happening. It focuses on the critical moments around an emergency, helping turn confusion and information delays into clearer, more informed action.
## Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Firebase Setup](#firebase-setup)
- [Firestore Data Model and Security](#firestore-data-model-and-security)
- [Optional Backend Integration](#optional-backend-integration)
- [Available Scripts](#available-scripts)
- [Routes](#routes)
- [External Data Sources](#external-data-sources)
- [Fallback Behavior and Limitations](#fallback-behavior-and-limitations)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Manual Verification Checklist](#manual-verification-checklist)

## Key Features

### Emergency awareness

- **Safety dashboard** with location, live weather context, proximity-aware alerts, nearby resource shortcuts, safe-route information, trusted-contact count, and community incident summaries.
- **Browser geolocation** with a friendly city/country label resolved through reverse geocoding.
- **Location-aware alerts** that filter supported alert data by distance from the user's current location.
- **Weather monitoring** using Open-Meteo by default, including severity classification for weather conditions such as thunderstorms, heavy rain, and hail.
- **Emergency resource finder** that uses OpenStreetMap data through the Overpass API to find nearby hospitals, police stations, fire stations, shelters, clinics, and ambulance stations based on the user's current location.
- **Emergency map** built with Leaflet and React Leaflet.

### SOS and emergency reporting

- **Press-and-hold SOS flow** with continuous location tracking during an active SOS session.
- **Emergency reporting** with category, severity, description, location, timestamp, and voice-recording support.
- Supports emergency categories including **Accident, Fire, Flood, Earthquake, Medical, Crime/Harassment, and Other**.
- **Real browser voice recording** using the MediaRecorder API, with microphone permission requested when recording is started.
- **Trusted-contact notification workflow** for SOS events when an optional backend notification service is configured.
- **Emergency-service call shortcuts** provide quick access to local emergency numbers such as Police (15), Rescue (1122), Fire (16), and Edhi (115).
* **Honest fallback behavior:** when an optional backend is not configured, reports are stored locally and, for authenticated users, are also attempted in Firestore. The UI communicates the actual delivery state instead of claiming that emergency services were notified.
 
### Personal safety tools

- **AI Emergency Assistant** powered by GPT-5.6 Luna for emergency classification, risk assessment, and safety guidance through the server-side `api/ai/chat.js` proxy.
- **Detect** — analyzes available user input such as text, voice, images, and location context to help identify the emergency type and severity.
- **Predict** — provides weather and hazard awareness using available environmental data.
- **Guide** — provides situation-specific emergency instructions and safety guidance.
- **Connect** — helps users reach trusted contacts and locate nearby hospitals, police stations, fire stations, shelters, clinics, and ambulance stations.
- **Harassment-risk assessment** with safety guidance for personal safety situations.
- **Safe routes**, **community incidents**, alerts, emergency guides, and dedicated guidance pages.
  
### Account and experience

- Firebase **email/password sign-up, sign-in, sign-out, session restoration, and password reset**.
- Protected application routes for authenticated users.
- Firestore-backed user profiles, trusted contacts, and emergency reports.
- English and Urdu interface support, including right-to-left support where applicable.
- Light/dark theme support and first-run onboarding.
- Responsive desktop and mobile layouts.

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, JavaScript, Vite 5 |
| Styling | Tailwind CSS 3 and CSS custom properties |
| Routing | React Router 6 |
| Icons | Lucide React |
| Authentication | Firebase Authentication (email/password) |
| Database | Cloud Firestore |
| Maps | Leaflet and React Leaflet |
| Weather | Open-Meteo by default; optional OpenWeatherMap support |
| Nearby places | OpenStreetMap data through the Overpass API |
| AI | GPT-5.6 Luna through the server-side Vercel AI proxy, with local fallback guidance |
| Voice recording | Browser MediaRecorder API |
| Deployment | Vercel |

## Architecture

```text
Browser
  │
  ├─ React + Vite UI
  │    ├─ React Router routes
  │    ├─ Context providers
  │    │    ├─ AuthContext       → Firebase Auth + Firestore profile state
  │    │    ├─ SafetyContext     → GPS, weather, SOS state
  │    │    ├─ LanguageContext   → English/Urdu translations
  │    │    └─ ThemeContext      → Light/dark preference
  │    └─ Pages and reusable layout components
  │
  ├─ Firebase
  │    ├─ Authentication         → email/password accounts and sessions
  │    └─ Cloud Firestore        → user profiles, contacts, reports
  │
  ├─ Public data providers
  │    ├─ Open-Meteo             → weather and severe-weather signals
  │    ├─ OpenStreetMap/Overpass → nearby emergency resources
  │    └─ Nominatim              → reverse geocoding
  │
    └─ Vercel serverless backend
       ├─ AI chat proxy with Firebase authentication
       ├─ emergency report delivery
       ├─ SOS activation/deactivation
       ├─ trusted-contact notifications
       └─ optional server-side location and resource endpoints


**### Key directories**

```text
life-sentinel/
├─ src/
│  ├─ components/
│  │  ├─ Layout/                # Main layout and SOS control
│  │  └─ ProtectedRoute.jsx     # Authenticated-route guard
│  ├─ contexts/
│  │  ├─ AuthContext.jsx        # Firebase Auth and Firestore profile state
│  │  ├─ SafetyContext.jsx      # Location, weather, and SOS state
│  │  ├─ LanguageContext.jsx    # English/Urdu translations
│  │  └─ ThemeContext.jsx       # Theme preference
│  ├─ data/                     # Translations, emergency guides, mock data
│  ├─ pages/                    # Dashboard and feature pages
│  ├─ services/
│  │  ├─ firebase.js            # Firebase initialization
│  │  ├─ firestoreService.js    # Profiles and reports persistence
│  │  ├─ emergencyService.js    # Reports, SOS, and fallback handling
│  │  ├─ weatherService.js      # Open-Meteo/OpenWeatherMap integration
│  │  ├─ placesService.js       # Overpass lookup and distance utilities
│  │  ├─aiService.js            # AI assistant client and emergency guidance
│  │  └─ apiClient.js           # Optional backend HTTP client
│  ├─ App.jsx                   # Provider composition and routes
│  └─ index.css                 # Global theme and shared visual styles
├─ api/
│  └─ ai/
│     └─ chat.js                # Authenticated server-side AI proxy
├─ .env.example                 # Environment-variable template
├─ firebase.json                # Firebase Hosting / Firestore CLI configuration
├─ firestore.rules              # Firestore security rules
├─ package.json
└─ vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- A Firebase project with a registered **Web App**
- Firebase Authentication and Cloud Firestore enabled

### Installation

```bash
git clone <your-repository-url>
cd life-sentinel
npm install
```

Create your local configuration file from the template.

**PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Fill in the Firebase variables described below, then start the development server:

```bash
npm run dev
```

Vite is configured for port `5173` by default. Open the local URL printed in the terminal.

## Environment Configuration

The project reads browser-safe configuration from Vite environment variables (`VITE_*`). Copy `.env.example` to `.env`; never commit a real `.env` file.

### Required for authentication and Firestore

```env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
```

### Optional configuration

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | Base URL for the optional Life Sentinel backend. Leave blank or use the template placeholder to keep backend calls disabled. |
| `VITE_BACKEND_API_KEY` | Optional browser-safe API token for the backend. Prefer short-lived user tokens in a production system. |
| `AI_API_URL` | Server-side AI provider endpoint used by the Vercel AI proxy. |
| `AI_API_KEY` | Server-side AI provider key. Never expose this as a `VITE_*` frontend variable. |
| `AI_MODEL` | Model identifier used by the server-side AI proxy. |
| `VITE_OPENWEATHER_API_KEY` | Enables the optional OpenWeatherMap path. Without it, the app uses Open-Meteo. |
| `VITE_OPENWEATHER_API_URL` | Optional OpenWeatherMap base URL. |
| `VITE_GOOGLE_MAPS_API_KEY` | Reserved optional map key. The current map/resource experience uses Leaflet and OpenStreetMap by default. |

### Important frontend-secret guidance

Anything prefixed with `VITE_` is bundled into the browser and can be viewed by users. Do **not** place service-account JSON, private keys, long-lived Twilio credentials, or any server secret in `.env` values consumed by the frontend.

Use a server-side backend or Cloud Functions for privileged operations such as SMS delivery, payment processing, administrative Firestore access, and provider-secret storage.

## Firebase Setup

### 1. Register the existing web app

In the Firebase Console, select your existing project and use its existing Web App configuration. Copy the web configuration values into `.env` using the `VITE_FIREBASE_*` variables above.

### 2. Enable Email/Password authentication

1. Open **Firebase Console → Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. Optionally configure password-reset email templates and authorized domains.

### 3. Create Cloud Firestore

1. Open **Firebase Console → Firestore Database**.
2. Create the `(default)` database if it does not exist.
3. Use production rules rather than test-mode rules.

### 4. Deploy the included Firestore rules

The project includes `firestore.rules` and `firebase.json`. Deploy the rules to the same Firebase project used by your web app:

```bash
npx firebase login
npx firebase deploy --only firestore:rules --project <your-project-id>
```

Alternatively, paste the contents of `firestore.rules` into **Firebase Console → Firestore Database → Rules** and click **Publish**.

> If Firestore returns `permission-denied`, first verify that the rules were published for the `(default)` database in the correct Firebase project.

## Firestore Data Model and Security

### Collections

```text
users/{uid}
  uid: string
  fullName: string
  email: string
  phone: string
  bloodGroup: string
  medicalConditions: string
  trustedContacts: [
    {
      id: string,
      name: string,
      phone: string,
      relation: string
    }
  ]
  createdAt: server timestamp
  updatedAt: server timestamp

reports/{reportId}
  userId: string
  category: string
  severity: string
  description: string
  location: object
  address: string
  status: string
  createdAt: server timestamp
  ...additional report fields
```

### Security behavior

The bundled Firestore rules enforce the following:

- Unauthenticated users cannot read or write profile or report data.
- A user can read and write only their own `users/{uid}` document.
- A report can be created only when `request.resource.data.userId` equals the authenticated user's UID.
- Users can read, update, and delete only reports whose stored `userId` matches their UID.
- All other Firestore paths are denied by default.

Trusted contacts are stored in `users/{uid}.trustedContacts`; they are not shared across accounts. The contact-management page reads the authenticated user's document from Firestore on load and awaits writes before marking a contact as saved.

## Optional Backend Integration

The frontend can communicate with an optional Life Sentinel backend for additional server-side features when `VITE_BACKEND_URL` is configured. This optional backend is separate from the Vercel serverless AI proxy in `api/ai/chat.js` and is not included in this repository.

Expected endpoints are:

| Method | Endpoint | Used for |
| --- | --- | --- |
| `POST` | `/api/reports` | Submit an emergency report |
| `POST` | `/api/sos/activate` | Start a backend-managed SOS session |
| `POST` | `/api/sos/deactivate` | End a backend-managed SOS session |
| `POST` | `/api/notifications/send` | Notify a single trusted contact |
| `POST` | `/api/location/update` | Submit an updated location |
| `GET` | `/api/incidents?lat=&lng=&radius=` | Retrieve nearby incidents |
| `GET` | `/api/resources?lat=&lng=&type=` | Retrieve nearby resources |

The API client sends JSON and, when provided, includes `Authorization: Bearer <VITE_BACKEND_API_KEY>`.

For production, protect these routes with authenticated server-side authorization, validate request payloads, rate limit abuse-prone operations, log delivery attempts, and keep SMS/provider credentials entirely on the server.

## AI Assistant

Life Sentinel includes an AI-powered Emergency Assistant designed to provide concise, actionable safety guidance during emergency situations.

### AI request flow

The AI Assistant uses the following production flow:

```text
Authenticated user
       │
       ▼
Life Sentinel frontend
       │
       │ Firebase ID token
       ▼
Vercel serverless function
       │
       └─ api/ai/chat.js
            ├─ Verifies Firebase authentication
            ├─ Validates the request
            ├─ Keeps the AI API key server-side
            └─ Sends the request to the configured AI provider
       │
       ▼
GPT-5.6 Luna
       │
       ▼
AI response
       │
       ▼
Life Sentinel frontend
### `api/ai/chat.js`

The `api/ai/chat.js` Vercel serverless function acts as the secure server-side AI proxy.

It:

- Accepts authenticated AI requests.
- Verifies the Firebase ID token before processing a request.
- Validates the emergency category, user message, conversation history, and language.
- Supports English and Urdu responses.
- Keeps the AI provider API key server-side.
- Sends requests to the configured AI provider using the Responses API.
- Uses **GPT-5.6 Luna** as the AI model.
- Uses low reasoning effort to prioritize concise and actionable emergency guidance.
- Limits the AI response length for practical emergency use.
- Returns appropriate error states when authentication, configuration, network communication, or the AI provider fails.

### AI model configuration

The AI model is configured through the following server-side environment variables:
 AI_API_URL=your_ai_provider_endpoint
AI_API_KEY=your_server_side_api_key
AI_MODEL=gpt-5.6-luna

`AI_API_KEY` is never exposed through a `VITE_*` frontend environment variable.

The AI Assistant is designed to provide supportive emergency information and safety guidance. It does not replace emergency services, medical professionals, law enforcement, or professional disaster-response systems.
## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production bundle in `dist/`. |
| `npm run preview` | Serve the production build locally for review. |
| `npx firebase deploy --only firestore:rules --project <project-id>` | Deploy Firestore rules. |
| `npx firebase deploy --only hosting --project <project-id>` | Deploy the built single-page app to Firebase Hosting. |

## Routes

| Path | Access | Page |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login` | Public | Sign in, sign up, and password reset |
| `/dashboard` | Authenticated | Safety overview dashboard |
| `/report` | Authenticated | Emergency report workflow |
| `/assistant` | Authenticated | AI emergency assistant |
| `/map` | Authenticated | Emergency map |
| `/alerts` | Authenticated | Weather and local alerts |
| `/community` | Authenticated | Community incidents |
| `/routes` | Authenticated | Safe routes |
| `/resources` | Authenticated | Emergency resources |
| `/contacts` | Authenticated | Trusted contacts |
| `/guide` | Authenticated | Emergency guide |
| `/guidance` | Authenticated | Safety-guidance categories |
| `/guidance/:categoryId` | Authenticated | Guidance detail |
| `/harassment` | Authenticated | Harassment-risk assistance |
| `/settings` | Authenticated | Profile, preferences, and account settings |

## External Data Sources

| Service | Usage | API key required? |
| --- | --- | --- |
| Browser Geolocation API | Current position and continuous SOS tracking | No |
| Nominatim / OpenStreetMap | Reverse geocoding coordinates into a city/country label | No |
| Open-Meteo | Current weather, forecast, and severe-condition signals | No |
| OpenWeatherMap | Optional premium weather provider | Yes |
| Overpass API / OpenStreetMap | Nearby hospitals, clinics, police, fire stations, shelters, and ambulance stations | No |

External services can be unavailable, rate limited, incomplete, or delayed. The app handles unavailable data with fallbacks and status messaging; it should not be treated as an official emergency dispatch or weather-warning system.

## Fallback Behavior and Limitations

Life Sentinel is intentionally transparent about integration availability:

- **AI assistant:** uses the GPT-5.6 Luna model through the server-side Vercel AI proxy in `api/ai/chat.js` when the AI integration is configured. If the AI service is unavailable or not configured, the application can fall back to local emergency classification and built-in guidance. AI outputs are assistive and not a substitute for professional advice.
- **Backend reporting/SOS:** backend delivery is used only when `VITE_BACKEND_URL` is configured. If it is unavailable, the UI reports the actual fallback state.
- **Emergency reports:** when the backend is not configured, a report is stored in `localStorage` (`ls_reports`) and, when authenticated, is also attempted in Firestore.
- **Preferences:** language, dark-mode preference, onboarding completion, and local report fallback are stored client-side. Firebase Authentication—not local storage—is the source of truth for authenticated sessions.
- **Location:** location-dependent features require browser location permission. If the current location cannot be obtained, Life Sentinel does not substitute an unrelated demo location and instead communicates that location-based data is unavailable.
- **Safe routes:** current route reports use demo/community data. Real-time traffic and live route-incident data are not currently available. Available routes can provide a navigation link to Google Maps for directions.
- **Maps and places:** OpenStreetMap data may be incomplete or out of date.
- **Notifications:** actual SMS/call/notification delivery requires a properly secured server-side service. The frontend alone cannot guarantee delivery.

## Deployment

Life Sentinel is deployed as a Vite/React application on **Vercel**.

**Live Demo:** https://lifesentinel.vercel.app/

### Vercel deployment

1. Connect the Life Sentinel GitHub repository to Vercel.
2. Set the required `VITE_FIREBASE_*` environment variables in the Vercel project settings.
3. Configure any optional backend or AI environment variables required by the deployed features.
4. Deploy the project. Vercel runs the Vite production build and serves the resulting application.

Before deploying, verify:

- Firebase Email/Password authentication is enabled.
- The correct Firestore rules are published to the `(default)` database.
- Production Firebase Web App values are configured in Vercel environment variables.
- Backend URLs use HTTPS when a backend is configured.
- No frontend environment value contains a private server-side secret.
- Browser location permission works correctly on the deployed HTTPS site.

## Troubleshooting

### `permission-denied` when saving contacts or profiles

1. Verify the user is signed in.
2. Verify the Firestore `(default)` database exists.
3. Publish `firestore.rules` to the same Firebase project configured in `.env`.
4. Confirm the rules include the owner check for `users/{userId}`.
5. In Firebase Console, ensure you are editing rules for `(default)`, not a different named database.

### Login does not work

- Confirm all six `VITE_FIREBASE_*` values are present in `.env`.
- Restart `npm run dev` after modifying `.env`.
- Enable Email/Password in Firebase Authentication.
- Add your deployment domain to Firebase Authentication's authorized domains when deploying beyond localhost.

### The app cannot access location

- Grant browser location permission for the local/deployed site.
- Use HTTPS in deployed environments; browsers commonly restrict geolocation on insecure origins.
- Check whether operating-system privacy settings block location access.

### Backend calls fail

- Leave `VITE_BACKEND_URL` blank to use the app's documented fallback behavior.
- If using a backend, verify the URL, HTTPS certificate, CORS policy, and server-side authorization.

### Resource or weather data is unavailable

- Check internet access and the status/rate limits of Open-Meteo, Nominatim, and Overpass.
- Treat displayed external data as assistive information, not as guaranteed official data.

## Manual Verification Checklist

Run these checks after configuring Firebase or deploying a new version:

1. Create an email/password account.
2. Confirm a matching `users/{uid}` document is created in Firestore.
3. Log out, log back in, and refresh the page; the session should restore.
4. Add a trusted contact, refresh `/contacts`, and confirm it remains visible.
5. Sign in with a different account and confirm the first account's trusted contacts are not visible.
6. Submit an emergency report and confirm the UI accurately states whether it was sent, stored in Firestore, or stored locally.
7. Test the SOS confirmation flow with a safe test contact and a non-production notification backend.
8. Confirm unauthenticated users are redirected from protected routes to `/login`.
9. Review the layout on desktop and mobile widths.
10. Run a production build:

   ```bash
   npm run build
   ```

## Contributing

1. Create a feature branch.
2. Keep UI, accessibility, translation, and responsive behavior consistent with the existing design.
3. Do not commit `.env` files, credentials, service-account files, or private keys.
4. Run `npm run build` before opening a pull request.
5. Clearly document changes to Firestore data structures, security rules, or backend contracts.

## License

No license file is currently included. Add an explicit license before redistributing or accepting external contributions.
