FoodConnect 🍱

FoodConnect is a food donation coordination platform built with Node.js, Express.js, MongoDB, EJS, and Passport.js. It streamlines the process of managing food donations by connecting donors, collection agents, and administrators through a centralized system.

The platform helps reduce food waste by enabling efficient donation tracking, approval workflows, and collection management.

🚀 Features
🔐 Authentication & Authorization
Secure signup and login system
Role-based access control:
Admin
Agent
Donor
Strong password validation rules
Session-based authentication using Passport.js
👤 Donor Module
Submit food donation requests
Track donation status in real time
View donation history
Access personalized dashboard
🚚 Agent Module
View assigned donation pickups
Mark collections as completed
Access collection history
Route planner interface (currently a placeholder for future integration)
🛠️ Admin Module
Approve or reject donation requests
Assign collection agents
Monitor donation activities
View dashboard statistics for:
Total donations
Registered donors
Active agents
Collection status
💬 Role-Based Chatbot
Shared chatbot interface with customized behavior for each role
Donor Assistant
Donation requests
Status tracking
Donation history support
Agent Assistant
Assigned pickup information
Collection workflow guidance
Admin Assistant
Approval and assignment workflow support
Dashboard navigation assistance
Optional OpenAI integration via API key
🎨 UI Enhancements
Modern dashboard design
Responsive card-based layout
Quick action shortcuts
Improved navigation experience
🏗️ Tech Stack
Backend
Node.js
Express.js
MongoDB
Mongoose
Passport.js
Frontend
EJS
HTML5
CSS3
JavaScript
Authentication
Passport Local Strategy
Express Session
📦 Installation
1. Clone the Repository
git clone https://github.com/nishi885/FoodConnect.git
cd FoodConnect_nishi_clone/backend
2. Install Dependencies
npm install
3. Configure Environment Variables

Create a .env file inside the backend directory:

MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
NODE_ENV=development
PORT=3000

# Optional AI Integration
HUGGINGFACE_API_KEY=your_optional_huggingface_key
HUGGINGFACE_MODEL=Qwen/Qwen2.5-7B-Instruct
HUGGINGFACE_API_URL=https://router.huggingface.co/v1/chat/completions
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
4. Start the Application
npm run dev
5. Open in Browser
http://localhost:3000
📁 Project Structure
backend/
│
├── app.js
│
├── config/
│   ├── dbConnection.js
│   └── passport.js
│
├── models/
│   ├── User.js
│   └── Donation.js
│
├── routes/
│   ├── auth.js
│   ├── admin.js
│   ├── donor.js
│   ├── agent.js
│   └── home.js
│
├── views/
│   ├── admin/
│   ├── donor/
│   ├── agent/
│   └── partials/
│
└── assets/
    └── css/
🔄 Donation Workflow
Donor
   ↓
Create Donation Request
   ↓
Admin Reviews Request
   ↓
Approve / Reject
   ↓
Assign Agent
   ↓
Agent Collects Donation
   ↓
Collection Completed
🔮 Future Enhancements
Password Recovery System
Forgot Password page
OTP generation and verification
Email/SMS integration
Secure password reset flow
Smart Route Optimization
Google Maps Directions API integration
Mapbox / OSRM support
Automatic shortest-route calculation
Interactive map view for agents
Additional Improvements
Notification system
Email alerts
Donation analytics
Mobile-friendly enhancements
Real-time status updates
🤝 Contributing

Contributions, suggestions, and feature requests are welcome. Feel free to fork the repository and submit a pull request.

📜 License

This project is developed for educational and demonstration purposes and can be extended for production use.

Developed with ❤️ to reduce food waste and improve food donation management.

Ye version project ko kaafi professional aur portfolio-ready bana deta hai, especially agar GitHub README recruiters ya college project evaluation ke liye use karna hai.
