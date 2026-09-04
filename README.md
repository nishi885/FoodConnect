FoodConnect
FoodConnect is a full-stack food donation coordination platform that connects food donors, administrators, and collection agents. It supports the complete donation workflow from request submission and verification to agent assignment and pickup tracking.

Features
Authentication and authorization
JWT-based authentication stored in an HTTP-only cookie
Email OTP verification during signup
OTP resend and password reset flows
Role-based access control for donors, admins, and collection agents
Protected dashboards and role-specific navigation
Donor workflow
Create food donation requests with food type, quantity, pickup time, address, phone number, and a message for the admin
View pending and previous donations
Track donation status
Cancel eligible pending or rejected donations
Manage profile information
Admin workflow
View dashboard statistics for donors, agents, and donations
Review donation requests
Accept or reject donation requests through the API workflow
Assign collection agents to donations
View registered collection agents
Monitor pending, assigned, rejected, and collected donations
Collection agent workflow
View assigned pickup requests
View collection history
Mark an assigned donation as collected after pickup
Use the route planner to visualize pickup locations
Notifications
MongoDB-backed role-based notifications
Notifications for new donations, assignments, approvals, rejections, and completed collections
Unread notification count
Mark one or all notifications as read
Frontend polling for updated notifications
Maps and route planning
OpenStreetMap tiles through Leaflet
Address geocoding with Nominatim
Pickup markers and route visualization
Nearest-neighbor ordering for assigned pickup locations
The current route planner visualizes and orders pickup locations. Turn-by-turn road routing and ETA calculation can be added with OSRM, Mapbox, or Google Directions API.

FAQ assistant
Role-aware FAQ responses for guests, donors, admins, and agents
Built-in knowledge-base answers for common questions
Hugging Face API integration for AI-generated answers
Optional OpenAI fallback
Response caching to reduce repeated API requests
The Hugging Face model is configurable through environment variables. Qwen2.5-7B-Instruct can be used by setting HUGGINGFACE_MODEL accordingly.

Technology stack
Frontend
React 18
Vite
React Router
Leaflet
HTML and CSS
Backend
Node.js
Express.js
MongoDB
Mongoose
JWT
Nodemailer
bcryptjs
Project structure
backend/
  app.js
  config/
  middleware/
  models/
  routes/
  scripts/
  services/
  utils/

frontend/
  src/
    components/
    pages/
    api.js
    App.jsx
    main.jsx
    styles.css
Installation
1. Install backend dependencies
cd backend
npm install
2. Install frontend dependencies
cd ..\frontend
npm install
3. Configure environment variables
Create backend/.env with the required values:

MONGO_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
SESSION_SECRET=your_session_secret

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
EMAIL_FROM=your_email

HUGGINGFACE_API_KEY=your_huggingface_token
HUGGINGFACE_MODEL=Qwen/Qwen2.5-7B-Instruct
HUGGINGFACE_API_URL=https://router.huggingface.co/v1/chat/completions

OPENAI_API_KEY=optional_openai_key
OPENAI_MODEL=gpt-4o-mini
MongoDB and SMTP configuration are required for persistent data and email OTP verification. The FAQ assistant still provides local fallback answers when AI credentials are unavailable.

4. Start the application
Start the backend:

cd backend
npm run dev
Start the frontend in a second terminal:

cd frontend
npm run dev
Open the frontend at http://localhost:5173. The backend runs at http://localhost:5001 by default.

Donation lifecycle
Donor creates donation
        ↓
Admin reviews request
        ↓
Accepted or rejected
        ↓
Admin assigns collection agent
        ↓
Agent completes pickup
        ↓
Donation marked collected
Supported donation statuses are pending, accepted, rejected, assigned, and collected.

API areas
Authentication: /auth/*
Session and dashboard data: /api/session, /api/dashboard
Donations: /api/donations
Agent management: /api/agents
Profile updates: /api/profile
Notifications: /notifications
FAQ assistant: /api/faq
Development notes
Do not expose unrestricted admin self-registration in a production deployment.
For production notifications, recipient-specific user targeting should be preferred over role-wide delivery.
The current route planner is a visualization tool and is not a replacement for turn-by-turn navigation.
License
This project is intended for educational and portfolio use.
