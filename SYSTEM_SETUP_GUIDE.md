# FULL SYSTEM SETUP & TESTING GUIDE

## ✅ COMPLETED COMPONENTS

### Backend (Node.js + Express)
- ✅ Express server setup with CORS
- ✅ MongoDB models: User, Service, Appointment, Slot, Review
- ✅ Authentication system (JWT + bcrypt)
- ✅ Email verification with OTP
- ✅ Password reset functionality
- ✅ Auth controllers (signup, login, verify OTP, forgot password)
- ✅ Service controllers (CRUD operations)
- ✅ Appointment controllers (booking, cancellation, rescheduling)
- ✅ Admin controllers (user management, statistics)
- ✅ Role-based access control middleware
- ✅ API routes for all modules
- ✅ Error handling middleware

### Frontend (React + TypeScript + Vite)
- ✅ Auth context for global user state
- ✅ Protected routes based on authentication and role
- ✅ API client with Axios (auto-token injection)
- ✅ Updated Login page (connects to API)
- ✅ Updated Signup page (connects to API)
- ✅ Updated OTP verification page
- ✅ Updated Forgot Password page
- ✅ Updated Home page (fetches services from API)
- ✅ Auth interceptors for JWT management
- ✅ Loading and error states
- ✅ Toast notifications with Sonner

## 🔧 SETUP INSTRUCTIONS

### Prerequisites
- Node.js (v18+) installed
- MongoDB running locally OR MongoDB Atlas account (cloud)
- npm or pnpm package manager

### 1. BACKEND SETUP

#### A. Install MongoDB

**Option 1: Local MongoDB**
```bash
# Windows - Download from https://www.mongodb.com/try/download/community
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
mongod
```

**Option 2: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster
4. Get connection string
5. Update MONGODB_URI in .env

#### B. Start Backend Server
```bash
cd d:\Odoo Hackathon\app\backend

# Make sure .env file exists with correct values
# If not, run: cp .env.example .env

npm install  # Already done
npm run dev  # Start development server
```

Server will run on: **http://localhost:5000**

### 2. FRONTEND SETUP

Backend is already running on http://localhost:3000 (started earlier)

The frontend will automatically connect to http://localhost:5000/api

## 🧪 TESTING THE SYSTEM

### Test Credentials (after seeding database)
```
Customer:
- Email: customer@test.com
- Password: Test@12345

Organiser:
- Email: organiser@test.com
- Password: Test@12345

Admin:
- Email: admin@test.com
- Password: Test@12345
```

### API Endpoints to Test

#### 1. Authentication
```bash
# Signup
POST http://localhost:5000/api/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "customer"
}

# Login
POST http://localhost:5000/api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

# Verify OTP
POST http://localhost:5000/api/auth/verify-otp
{
  "email": "john@example.com",
  "otp": "123456"  // Check server console for OTP
}
```

#### 2. Services
```bash
# Get all services
GET http://localhost:5000/api/services

# Get specific service
GET http://localhost:5000/api/services/{serviceId}

# Create service (organiser only)
POST http://localhost:5000/api/services
Headers: Authorization: Bearer {token}
{
  "name": "Hair Styling",
  "description": "Professional hair cut",
  "category": "Beauty",
  "duration": 45,
  "price": 55,
  "maxCapacity": 1
}
```

#### 3. Appointments
```bash
# Get available slots
GET http://localhost:5000/api/appointments/slots/available?serviceId={id}&date=2026-05-10

# Create appointment
POST http://localhost:5000/api/appointments
Headers: Authorization: Bearer {token}
{
  "serviceId": "{id}",
  "date": "2026-05-10",
  "startTime": "10:00",
  "endTime": "10:45"
}

# Get my appointments
GET http://localhost:5000/api/appointments/my-appointments
Headers: Authorization: Bearer {token}
```

#### 4. Admin
```bash
# Get all users
GET http://localhost:5000/api/admin/users
Headers: Authorization: Bearer {adminToken}

# Get stats
GET http://localhost:5000/api/admin/stats
Headers: Authorization: Bearer {adminToken}
```

## 🚀 FRONTEND USER FLOW

### 1. Customer Journey
1. Visit http://localhost:3000
2. Click "Sign up" → Create account
3. Verify email with OTP
4. Login
5. Browse services on Home page
6. Click "Book Now" on any service
7. Complete booking flow
8. View my bookings

### 2. Organiser Journey
1. Signup with role: "organiser"
2. Verify email
3. Login
4. Dashboard (to be created) → Create/manage services
5. View bookings for your services
6. Confirm/manage appointments

### 3. Admin Journey
1. Signup with role: "admin" (manual in DB)
2. Login
3. Dashboard (to be created) → View all users
4. View statistics and reports
5. Manage user accounts

## ⚠️ KNOWN LIMITATIONS & TODO

### Frontend TODO
- [ ] Complete Booking page (connect to API)
- [ ] Create Organiser Dashboard
  - [ ] Manage Services page
  - [ ] View Bookings page
  - [ ] Calendar view
  - [ ] Statistics
- [ ] Create Admin Dashboard
  - [ ] Users Management page
  - [ ] Statistics page
  - [ ] Reports page
- [ ] Create Customer Dashboard
  - [ ] My Bookings page
  - [ ] Booking History page
  - [ ] Payment history
- [ ] Payment integration (mock or Stripe)
- [ ] Email notifications (mock in development)
- [ ] Ratings and reviews feature
- [ ] Advanced filtering and search

### Backend TODO
- [ ] Email service integration (Nodemailer)
- [ ] Real payment integration (Stripe/PayPal)
- [ ] Advanced booking analytics
- [ ] Notification system
- [ ] Database seeding script for test data
- [ ] API rate limiting
- [ ] Logging system
- [ ] Automated appointment reminders
- [ ] Calendar synchronization

## 📋 TROUBLESHOOTING

### Backend won't start
```
Error: MongoDB connection failed
→ Make sure MongoDB is running
→ Check MONGODB_URI in .env
→ For cloud DB, ensure IP whitelist includes your IP

Error: Port 5000 already in use
→ Change PORT in .env to another port (5001, 5002, etc)
→ Or kill the process using port 5000
```

### Frontend can't reach backend
```
Error: Network Error (401, 403, 500)
→ Make sure backend is running: http://localhost:5000/health
→ Check CORS_ORIGIN in backend .env
→ Check if token is being sent in Authorization header
→ Check browser console for detailed error

Error: Token not being saved
→ Clear localStorage in browser
→ Check browser DevTools → Application → LocalStorage
```

### OTP not received
```
→ Check server console (terminal running npm run dev)
→ OTP is printed in console in development
→ In production, integrate real email service (Nodemailer, SendGrid, etc)
```

## 📊 DATABASE SCHEMA SUMMARY

### User Model
- name, email, password (hashed)
- role: customer | organiser | admin
- phone, avatar, bio, status
- isEmailVerified, otp, resetToken
- loginAttempts, lockUntil, lastLogin

### Service Model
- name, description, category, organiser
- duration (minutes), price, maxCapacity
- workingHours (start, end)
- daysAvailable, bufferTime
- rating, reviewCount, isActive

### Appointment Model
- service, organiser, customer
- date, startTime, endTime
- status: pending | confirmed | completed | cancelled
- paymentStatus, paymentAmount
- rescheduleCount, notes

### Slot Model
- service, organiser, date
- startTime, endTime, maxCapacity
- bookedCount, isAvailable
- appointments array

## 🔒 SECURITY FEATURES IMPLEMENTED

✅ JWT authentication
✅ Password hashing (bcryptjs)
✅ Strong password validation
✅ OTP verification
✅ Role-based access control
✅ Protected routes on frontend
✅ CORS configuration
✅ Account lockout after failed attempts
✅ Automatic token injection
✅ Token expiration (7 days default)
✅ Error handling with no sensitive data

## 📞 SUPPORT

For issues or questions:
1. Check server logs: `npm run dev` terminal
2. Check browser console: F12 → Console tab
3. Test API with Postman/Insomnia
4. Check .env file configuration

---

**System Status**: 🟡 Ready for development (need to seed database and test full flow)
**Last Updated**: May 2, 2026
