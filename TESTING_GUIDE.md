# COMPLETE SYSTEM TESTING GUIDE

## 🎯 QUICK START

### Prerequisites Checklist
- [ ] Node.js v18+ installed
- [ ] MongoDB running (local or Atlas)
- [ ] Frontend dependencies installed (already done)
- [ ] Backend dependencies installed (already done)

### Step 1: Verify Backend Installation
```bash
cd d:\Odoo Hackathon\app\backend
npm list | grep "express\|mongoose\|jsonwebtoken\|bcryptjs"
```
Expected output: All packages should be listed without errors

### Step 2: Start Backend Server
```bash
cd d:\Odoo Hackathon\app\backend
npm run dev
```

Expected output:
```
Server running on port 5000 in development mode
MongoDB connected successfully
```

### Step 3: Verify Frontend
Frontend is already running on http://localhost:3000 from earlier.

## 🧪 STEP-BY-STEP TESTING

### Test 1: User Registration & Authentication

#### A. Signup Flow
1. Open http://localhost:3000
2. Click "Sign up" button
3. Fill in:
   - Name: `Test Customer`
   - Email: `testcustomer@example.com`
   - Password: `TestPass123!` (must have 8+ chars, uppercase, number, special char)
4. Click "Create account"

**Expected Result**: 
- ✅ Account created
- ✅ OTP verification page shown
- ✅ OTP displayed in backend terminal

#### B. Email Verification
1. Check backend terminal for OTP (e.g., `OTP for testcustomer@example.com: 123456`)
2. Enter OTP in the verification page
3. Click "Verify"

**Expected Result**:
- ✅ Email verified successfully
- ✅ Redirected to login page
- ✅ Toast notification confirms

#### C. Login
1. Enter email: `testcustomer@example.com`
2. Enter password: `TestPass123!`
3. Click "Sign in"

**Expected Result**:
- ✅ Logged in successfully
- ✅ Token stored in localStorage
- ✅ Redirected to customer home page

**Verify in Browser DevTools**:
- Open F12 → Application → LocalStorage → http://localhost:3000
- Should see: `token` and `user` entries

---

### Test 2: Services Listing

#### A. Browse Services
1. Verify you're on http://localhost:3000/customer/home
2. Check if services are loading (or "No services" message)

**Expected Result**:
- ✅ Services loading spinner or services displayed
- ✅ Category filter buttons functional
- ✅ Search functionality working

**API Check**:
```bash
# In another terminal, test API directly
curl http://localhost:5000/api/services
```

**Expected Response**:
```json
{
  "success": true,
  "data": [],  // or list of services
  "message": "Services fetched successfully"
}
```

---

### Test 3: Protected Routes

#### A. Try accessing organizer dashboard while logged in as customer
1. Manually navigate to http://localhost:3000/organiser/dashboard
2. You should be redirected to home page

**Expected Result**:
- ✅ Redirect to home page (role check prevents access)

#### B. Try accessing without login
1. Open new incognito window
2. Navigate to http://localhost:3000/customer/home
3. You should be redirected to login

**Expected Result**:
- ✅ Redirect to login page (auth check prevents access)

---

### Test 4: API Testing with Postman/Insomnia

#### A. Get All Services
```
GET http://localhost:5000/api/services
```

**Expected Response**:
```json
{
  "success": true,
  "data": [],
  "message": "Services fetched successfully"
}
```

#### B. Create Service (Organizer only)
```
POST http://localhost:5000/api/services
Headers: Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "name": "Hair Styling",
  "description": "Professional hair cut and styling",
  "category": "Beauty",
  "duration": 45,
  "price": 55,
  "maxCapacity": 1
}
```

First, you need to signup as organizer:
```
POST http://localhost:5000/api/auth/signup
{
  "name": "Test Organizer",
  "email": "organizer@example.com",
  "password": "OrgPass123!",
  "role": "organizer"
}
```

#### C. Get Available Slots
```
GET http://localhost:5000/api/appointments/slots/available?serviceId={SERVICE_ID}&date=2026-05-10
```

#### D. Create Appointment
```
POST http://localhost:5000/api/appointments
Headers: Authorization: Bearer {CUSTOMER_TOKEN}
Content-Type: application/json

{
  "serviceId": "{SERVICE_ID}",
  "date": "2026-05-10",
  "startTime": "10:00",
  "endTime": "10:45",
  "notes": "Test appointment"
}
```

---

### Test 5: Error Handling

#### A. Wrong Password
1. Try login with correct email but wrong password
2. Should see error message

**Expected Result**:
- ✅ "Invalid credentials" error
- ✅ Account not locked (only after 5 attempts)

#### B. Non-existent Service
```
GET http://localhost:5000/api/services/invalid-id
```

**Expected Result**:
```json
{
  "success": false,
  "message": "Service not found"
}
```

#### C. Invalid Token
```
GET http://localhost:5000/api/auth/profile
Headers: Authorization: Bearer invalid-token
```

**Expected Result**:
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

---

### Test 6: Admin Dashboard

#### A. Create Admin User (in MongoDB)
```javascript
// Run in MongoDB terminal
db.users.insertOne({
  name: "Admin User",
  email: "admin@example.com",
  password: "$2a$10$...hashed...",  // Hashed password
  role: "admin",
  status: "active",
  isEmailVerified: true,
  createdAt: new Date()
})
```

#### B. Login as Admin
1. Go to http://localhost:3000/login
2. Enter: admin@example.com / AdminPass123!
3. You should be redirected to /admin/dashboard

**Expected Result**:
- ✅ Admin dashboard loads
- ✅ Statistics displayed
- ✅ Users list shown

---

## 📊 DATA SEEDING (Optional)

### Auto-Seed Script
Create `backend/seed.js`:
```javascript
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import User from './src/models/User.js';
import Service from './src/models/Service.js';
import { config } from './src/config/config.js';

async function seed() {
  try {
    await mongoose.connect(config.mongoUri);
    
    // Clear existing data
    await User.deleteMany({});
    await Service.deleteMany({});

    // Create customers
    const customers = await User.create([
      {
        name: 'John Customer',
        email: 'customer1@test.com',
        password: 'Test@12345',
        role: 'customer',
        isEmailVerified: true
      },
      {
        name: 'Jane Customer',
        email: 'customer2@test.com',
        password: 'Test@12345',
        role: 'customer',
        isEmailVerified: true
      }
    ]);

    // Create organizers
    const organizers = await User.create([
      {
        name: 'Sarah Organizer',
        email: 'organizer1@test.com',
        password: 'Test@12345',
        role: 'organizer',
        isEmailVerified: true
      }
    ]);

    // Create admin
    await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Test@12345',
      role: 'admin',
      isEmailVerified: true
    });

    // Create services
    await Service.create({
      name: 'Hair Styling',
      description: 'Professional hair cutting and styling',
      category: 'Beauty',
      organiser: organizers[0]._id,
      duration: 45,
      price: 55,
      maxCapacity: 1
    });

    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
```

Run seeding:
```bash
node seed.js
```

---

## 🔍 DEBUGGING TIPS

### Frontend Issues

#### 1. API Not Reachable
```
Error: Network Error
```

**Solution**:
- Check backend is running: `curl http://localhost:5000/health`
- Check CORS: `http://localhost:3000` is in CORS_ORIGIN in backend/.env

#### 2. Token Not Saved
```
LocalStorage shows no token
```

**Solution**:
- Check F12 → Console for errors during login
- Verify API returns token in response
- Check auth context is working

#### 3. Components Not Loading
```
Blank screen or errors
```

**Solution**:
- Check F12 → Console for JS errors
- Verify all imports are correct
- Check API endpoints in src/lib/api.ts

### Backend Issues

#### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
- Start MongoDB: `mongod`
- Or use MongoDB Atlas and update MONGODB_URI

#### 2. Port Already in Use
```
Error: listen EADDRINUSE :::5000
```

**Solution**:
```bash
# Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID {PID} /F
# Or change PORT in .env
```

#### 3. JWT Token Issues
```
Error: Cannot read property 'id' of undefined
```

**Solution**:
- Check JWT_SECRET is set in .env
- Verify token format: "Bearer {token}"
- Check token expiration

---

## ✅ CHECKLIST: SYSTEM READY

- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:3000
- [ ] Can signup with strong password
- [ ] Can verify email with OTP
- [ ] Can login and see token in localStorage
- [ ] Can see services on home page
- [ ] Can navigate without authentication redirects
- [ ] Admin dashboard accessible with admin account
- [ ] API endpoints responding correctly
- [ ] Error handling working (invalid credentials, not found, etc)
- [ ] Toast notifications showing
- [ ] Protected routes working

---

## 🚀 NEXT STEPS

### Immediate Enhancements
1. [ ] Complete Booking page (connect to API)
2. [ ] Create Organizer Service Management page
3. [ ] Implement real email notifications
4. [ ] Add real payment integration

### Database Improvements
1. [ ] Create seed script for test data
2. [ ] Add database indexes
3. [ ] Create backup strategy

### Deployment
1. [ ] Set up production database (MongoDB Atlas)
2. [ ] Create deployment pipeline (GitHub Actions)
3. [ ] Set up monitoring (Sentry, LogRocket)
4. [ ] Configure SSL/TLS certificates

### Security
1. [ ] Enable rate limiting
2. [ ] Add helmet for security headers
3. [ ] Implement CSRF protection
4. [ ] Add input validation and sanitization

### Performance
1. [ ] Add caching (Redis)
2. [ ] Implement pagination
3. [ ] Add database query optimization
4. [ ] Set up CDN for static assets

---

## 📞 SUPPORT

**Common Issues & Solutions:**
- See SYSTEM_SETUP_GUIDE.md in project root
- Check backend logs: `npm run dev` terminal
- Check frontend logs: F12 → Console
- Test API with: Postman, Insomnia, or curl

**Testing Tools:**
- Postman: https://www.postman.com/downloads/
- MongoDB Compass: https://www.mongodb.com/products/compass
- VS Code REST Client: Install extension `REST Client`

---

**Status**: 🟢 SYSTEM READY FOR TESTING
**Last Updated**: May 2, 2026
**Project**: Booksy - Appointment Booking System
