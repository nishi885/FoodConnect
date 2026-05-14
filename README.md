# FoodConnect / FoodBridge

A simple food donation coordination system built with Node.js, Express, EJS, MongoDB and Passport. The app connects donors, admins and collection agents to manage donation requests, approvals, assignments, and collections.

## What is included

- User authentication with role-based login for `admin`, `agent`, and `donor`
- Signup validation with strong password rules
- Admin dashboard with donor, agent, and donation statistics
- Donor dashboard with donation status and history
- Agent dashboard with assigned collections and a route planner placeholder
- Donation approval and assignment workflows
- Simple and clean dashboard UI improvements with cards and action links

## Current features

### User roles
- `admin`: manage donations, approve/reject requests, assign agents, view agent list
- `agent`: collect assigned donations and view collection history
- `donor`: submit donations and track pending / accepted requests

### Authentication
- Signup and login using email and password
- Password validation requires uppercase, lowercase, digits, and only `@` as special character

### Dashboard improvements
- Modern dashboard cards for admin/agent/donor views
- Quick action buttons for important navigation
- New placeholder route planner view for agents

## Setup and run

1. Clone the repo:
   ```bash
   git clone https://github.com/nishi885/FoodConnect.git
   cd FoodConnect_nishi_clone/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `backend/.env` with:
   ```env
   MONGO_URI=your_mongodb_connection_string
   SESSION_SECRET=your_session_secret
   NODE_ENV=development
   PORT=3000
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

5. Open in browser:
   ```
   http://localhost:3000
   ```

## Backend structure

- `backend/app.js` - main Express app setup
- `backend/config/dbConnection.js` - MongoDB connection logic
- `backend/config/passport.js` - Passport login configuration
- `backend/models/` - Mongoose models for user and donation
- `backend/routes/` - route handlers for auth, home, admin, donor, agent
- `backend/views/` - EJS templates and dashboard pages
- `assets/css/` - shared styles for dashboard and layout

## Notes and future improvements

The current codebase does not yet include OTP-based password recovery or a fully integrated AI shortest-route planner. These are planned enhancements:

- `Password reset / OTP flow`
  - add a `forgot password` page
  - send email/SMS OTP, verify code, and set a new password

- `AI / distance shortest-route feature`
  - integrate Google Maps Directions API, Mapbox, or OSRM
  - compute shortest path for agent pickup locations
  - show route planner in the agent dashboard

## How to extend

To add the password reset feature:
- create a `forgot password` route and view in `backend/routes/auth.js`
- generate a one-time token or OTP
- send it to the user via email or SMS
- verify token and allow the user to set a new password

To add shortest-route planning:
- use real pickup addresses stored with donations
- call a mapping API to compute optimized routes
- show the route on the agent planner view at `/agent/profile/google-maps`

---

Built for quick demo use and easy future enhancement.
