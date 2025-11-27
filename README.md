Lifeline — Emergency & Medical Aid Platform
--------

Overview
--------
Lifeline is a full‑stack emergency coordination platform (React frontend + Express/MongoDB backend). It provides emergency requests, helper discovery, real‑time tracking & chat, hospital locator, AI medical assistant, file uploads, and a simple orders/payment flow.

Lifeline connects people in low-resource or remote areas with nearby helpers, ambulance drivers and medical professionals quickly, reducing response times and improving access to timely care. It also offers affordable fare calculations and simple payment flows so users in rural areas can access essential services reliably.

Repository layout (important)

```
backend/ — Express API server, controllers, models, routes, scripts
frontend/ — React app (UI/components/pages)
backend/.env.example — backend env template
frontend/.env.example — frontend env template
START.bat, start-servers.bat — Windows batch scripts to start services
```

Note: The live website link is shown in the repository's About section on the right-hand side of the GitHub page.

Full feature list (implemented / present in repo)

User Registration
-----------------
1.1 Users can register with email & password
1.2 Users can register using Google OAuth
1.3 Email format and password validation
1.4 Password hashing and secure storage

User Authentication
-------------------
2.1 Login with email/password
2.2 Login with Google OAuth
2.3 JWT token generation for sessions
2.4 JWT-protected routes
2.5 Logout (client-side token removal)

User Profile Management
-----------------------
3.1 View profile
3.2 Update profile (name, phone, address, specialization, vehicleInfo)
3.3 Upload profile picture
3.4 Upload NID/identification documents
3.5 Display user role (patient/doctor/volunteer/driver)
3.6 Language preference (English/Bangla)
3.7 Notification settings (basic)
3.8 Driver verification fields (driving license)

Emergency Request Creation
--------------------------
4.1 Create emergency requests
4.2 Frontend captures GPS location; backend stores location
4.3 Select emergency type (Medical, Accident, Fire, etc.)
4.4 Set severity/urgency level
4.5 Add description and notes
4.6 Upload photos/documents related to emergency
4.7 Timestamped requests

Helper Discovery
----------------
5.1 Find nearby helpers via geolocation
5.2 Distance calculation between requester and helpers
5.3 List helpers within range
5.4 Show helper details (name, rating, distance)
5.5 Notifications to nearby helpers (Socket.IO)

Emergency Response
------------------
6.1 Helpers view emergency details
6.2 Helpers accept requests
6.3 Helpers reject requests
6.4 Requester notified when helper accepts (socket)
6.5 Multiple helpers can respond
6.6 Emergency status tracking (pending, accepted, en-route, arrived, completed, cancelled)

Real-time Location Tracking
--------------------------
7.1 Live helper location tracking (GPS + socket)
7.2 Real-time map display of helper position
7.3 Route from helper to requester (map UI)
7.4 ETA calculation (basic)
7.5 Location updates every few seconds (frontend/socket)
7.6 Requester can view helper movement

Real-time Chat Communication
---------------------------
8.1 Emergency chat between helper & requester
8.2 Dedicated chat rooms per emergency
8.3 Real-time messages (Socket.IO)
8.4 Message timestamps
8.5 Persisted chat history (Chat model)
8.6 Basic read-status support

Hospital Locator
----------------
9.1 Detect user location (frontend)
9.2 Search hospitals within a radius
9.3 Display hospitals on Google Maps
9.4 Hospital details (name, address, phone, website)
9.5 Distance calculation to hospitals
9.6 Filter hospitals by distance
9.7 View hospital information (services, beds, hours)
9.8 Directions via Google Maps
9.9 Call hospital from app (tel:)
9.10 Visit hospital website from app
9.11 Toggle map/list views
9.12 Manual location refresh

AI Medical Chatbot (LifeBot)
---------------------------
10.1 Ask medical questions
10.2 AI-powered medical guidance (Groq/OpenAI provider integration)
10.3 Symptom analysis & suggested actions
10.4 First-aid instructions
10.5 AI chat history (AIChatHistory model)
10.6 English & Bangla support
10.7 Floating widget accessibility

Voice Command System
--------------------
11.1 Activate voice commands (frontend)
11.2 Speech-to-text (Web Speech API)
11.3 Create emergencies using voice
11.4 English & Bangla voice input support
11.5 Visual feedback while recording

Emergency 999 Panic Button
--------------------------
12.1 One-click panic alarm
12.2 Siren sound (frontend)
12.3 Screen flash alert (frontend)
12.4 Device vibration (if supported)
12.5 Capture location automatically
12.6 Directly call 999 from app
12.7 Show emergency contact info

Helper Availability Management
-----------------------------
13.1 Set availability status (available/busy)
13.2 Toggle availability quickly
13.3 Only show available helpers to requesters
13.4 Basic schedule/availability fields
13.5 Real-time status updates

Medical Records Management
--------------------------
14.1 Upload medical documents
14.2 Categorize documents by type
14.3 Store documents (uploads folder or Cloudinary)
14.4 View and download medical records
14.5 Support PDF & image formats

Rating and Review System
------------------------
15.1 Rate helpers (1–5 stars)
15.2 Text reviews
15.3 Average rating calculation
15.4 Rating history display
15.5 Ratings visible on helper profiles

CPR Guide
---------
16.1 Step-by-step CPR instructions
16.2 Visual icons per step
16.3 Emergency contact info in guide
16.4 Offline-ready static guide

Wound Care Tutorials
--------------------
17.1 Step-by-step wound care guides
17.2 Visual illustrations
17.3 Safety warnings and precautions

Offline Medical Guides (PDF)
---------------------------
18.1 Downloadable PDFs (static assets)
18.2 View PDFs in browser
18.3 Covers CPR, Choking, Bleeding, Fractures, Heart Attack
18.4 Offline access to guides

Video Library
-------------
19.1 Educational videos embedded (YouTube)
19.2 Categorize videos by topic
19.3 Show duration & metadata
19.4 Embedded playback in-app

Health Tips Feed
----------------
20.1 Daily health tips feed
20.2 Categorized tips
20.3 Icon per tip
20.4 Card-style display

Multi-language Support
----------------------
21.1 Switch between English & Bangla
21.2 UI translation (i18n)
21.3 Save language preference per user
21.4 AI replies in selected language
21.5 Language-aware voice commands

Dashboard
---------
22.1 Emergency statistics & summary
22.2 Recent emergencies list
22.3 Quick actions
22.4 Helpers see nearby emergencies
22.5 User activity summary
22.6 View & update current location
22.7 Wearable integration UI placeholders

Emergency History
-----------------
23.1 View past emergencies
23.2 Emergency details & status
23.3 Filter by status
23.4 View responding helpers
23.5 Timestamps for activities

Geolocation Services
--------------------
24.1 Detect location via GPS
24.2 Distance calculations (Haversine-like)
24.3 Accuracy helpers included
24.4 Manual refresh option
24.5 Show coordinates
24.6 Handle location permission requests
24.7 Retry logic for failures

Map Integration
---------------
25.1 Google Maps integration for maps & routes
25.2 Show user/hospital/helper markers
25.3 Radius circles and popups
25.4 Zoom & pan controls

File Upload System
------------------
26.1 Upload profile pictures, NID, emergency photos, medical records
26.2 File type & size validation (middleware)
26.3 Local uploads or Cloudinary (configurable)
26.4 Driver license upload support

Search and Filter
-----------------
27.1 Hospital search by radius
27.2 Filter emergencies by type/status
27.3 Sort hospitals by distance
27.4 Helpers can filter requests

Wearable Device Integration
---------------------------
28.1 VitalSigns model & UI exist
28.2 Manual data import & display available
28.3 Full device adapters not included (placeholders)

Payment / Orders system
-----------------------
29.1 Create/manage orders (/api/orders/create)
29.2 Verify payments (/api/orders/verify)
29.3 Complete/distribute payments (/api/orders/complete)

Premium / Paid Services (explicit - what patients can avail)
---------------------------------------------------------
These are the paid/premium services available in the app (server-side handling present in Orders flow). Patients can request or be charged for the following:

- Ambulance transport (paid for long distances)
- Pricing rule (server): first 5 km free. For each additional km (rounded up), charge 100 	 per km. Example: 8 km => (8  5) = 3  3  100 = 300 	. The server computes the fare from EmergencyRequest.distance or the order distance field.
- Ambulance equipment / add-ons
- Patients can request equipment or add-ons for ambulance (e.g., stretcher, oxygen). These are added to the order as equipment (array) and may affect the total amount. The order model supports an equipment field and serviceType variants like AMBULANCE_EQUIPMENT.
- Priority / long-distance ambulance (paid)
- The system distinguishes AMBULANCE_LONG_DISTANCE where server computes fare and can mark the order as pending payment if amount > 0.
- Doctor teleconsultation / consultation fees (paid)
- Doctors may have prescriptionFee or consultation fees set in their profile. Orders can include doctorId and the system can create a PRESCRIPTION or DOCTOR_CONSULT order with amount payable to paymentTo (doctor's bKash or phone). The frontend supports creating paid prescription orders.
- Volunteer item purchases / volunteer fees (paid)
- Patients who request volunteers to buy items can create VOLUNTEER_PURCHASE orders. Order fields: itemPrice, volunteerFee (platform fee), volunteerId. The frontend calculates a volunteerFee and totalAmount, then creates an order for payment to the volunteer.
- Prescription delivery fees (paid)
- Prescription orders and delivery fees are handled via orders with serviceType: PRESCRIPTION and charged amount. The Payment/Order flow supports verification and completion.
- Payment recipient resolution and distribution (bKash-style)
- For payable orders, paymentTo is required (bKash number or phone). The system will try to infer paymentTo from provider (doctor/driver/volunteer) profiles (their bkashNumber or phone). Order lifecycle supports marking paid and distributing (the actual bKash send API is TODO 
-- currently the system marks paymentDistributed when completed).
- Manual payment verification
- The /api/orders/verify endpoint accepts a transactionId and marks the order as paid; admins/providers then complete and distribute.


Requirements (must-have to run)
--------------------------------

- Node.js (v16+ recommended) and npm
- MongoDB running locally or remote (set in MONGODB_URI)
- Create backend/.env and frontend/.env from the .env.example files and fill keys

Required environment variables (set in .env files)
-----------------------------------------------

Backend (backend/.env) 													 
- MONGODB_URI 													
---

Repository layout
-----------------

- backend/ — Express API server, controllers, models, routes, middleware and utility scripts
- frontend/ — React application (components, pages, i18n and build configuration)
- frontend/public/ — static assets served by the frontend (includes manifest.json)
- frontend/.env.example — example env for the frontend (copy to .env locally)
- backend/.env.example — example env for the backend (copy to .env locally)
- helper scripts: START.bat, start-servers.bat, setup.ps1

---

Requirements
------------

- Node.js (recommended v16 or later)
- npm
- MongoDB (local or Atlas)
- (Optional) Cloudinary for image/file hosting
- (Optional) Google Cloud project for Maps & OAuth

---

Environment variables
---------------------

Copy the example files and fill values. Do NOT commit .env files.

Backend (minimal examples):

- MONGODB_URI — mongodb connection string
- JWT_SECRET — random strong string
- PORT — optional (default 5000)
- CLIENT_URL — frontend origin (for CORS and OAuth redirects)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL — Google OAuth
- GROQ_API_KEY or equivalent — AI provider key (optional)

Frontend (minimal examples):

- REACT_APP_API_URL — e.g. https://api.example.com/api or http://localhost:5000/api
- REACT_APP_GOOGLE_MAPS_API_KEY — Google Maps API key
- REACT_APP_GOOGLE_CLIENT_ID — Google OAuth client id

Keep secret values out of source. Use host provider environment variables for production.

---

How to run (development)
------------------------

Prereqs: Node.js, npm, MongoDB and configured .env files.

Backend (development):

1. cd backend
2. npm install
3. npm run dev   (starts nodemon)

Frontend (development, separate terminal):

1. cd frontend
2. npm install
3. npm start

Alternatively, if the repo has a combined dev script you can run from the root:

npm run dev

Default dev URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

---


Developer notes
---------------

- Backend uses Passport.js (Google OAuth) and JWT for auth.
- Socket.IO handles real-time features (tracking, chat, notifications).
- File uploads: backend/middleware/upload.js (local storage by default; Cloudinary optional).
- i18n support lives in frontend/src/locales (English/Bangla).

If backend has an inner .git directory it may be treated as an embedded repo when adding the project to a single repository. Remove or relocate inner .git if you want backend tracked as normal files.
