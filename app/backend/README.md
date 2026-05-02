# Backend Setup (MySQL migration)

This backend can run against either MongoDB (legacy) or MySQL via Sequelize. To fully migrate to MySQL, follow these steps.

1. Install and run MySQL (or use a Docker container):

   - Docker quick start:

```powershell
docker run --name booksy-mysql -e MYSQL_ROOT_PASSWORD=secret -e MYSQL_DATABASE=booksy -p 3306:3306 -d mysql:8
```

2. Copy `.env.example` to `.env` and edit credentials:

```text
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=secret
DB_NAME=booksy
USE_MYSQL=true

# JWT
JWT_SECRET=change_this_jwt_secret

# Email (for OTP)
EMAIL_USER=you@example.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Booksy <you@example.com>
```

3. Install dependencies (already done in this repo):

```powershell
cd app/backend
npm install
```

4. Seed the DB (creates admin user `admin@booksy.local` by default):

```powershell
npm run db:seed
```

You can override admin credentials with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASS` in `.env`.

5. Start the backend:

```powershell
npm run dev
```

Notes:
- If MySQL is not available, the server will fall back to MongoDB using `MONGODB_URI`.
- To remove MongoDB entirely, you can uninstall `mongoose` after confirming MySQL runs correctly.
# Booksy Backend

Appointment Booking System Backend built with Node.js, Express, and MongoDB.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Update the values as needed:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/booksy
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
OTP_EXPIRE=10m
CORS_ORIGIN=http://localhost:3000
```

### 3. Start MongoDB
Make sure MongoDB is running locally or update MONGODB_URI in .env

### 4. Run Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-otp` - Verify email with OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:serviceId` - Get service by ID
- `GET /api/services/organiser/:organiserId` - Get services by organiser
- `POST /api/services` - Create service (organiser/admin)
- `PUT /api/services/:serviceId` - Update service (organiser/admin)
- `DELETE /api/services/:serviceId` - Delete service (organiser/admin)

### Appointments
- `GET /api/appointments/slots/available` - Get available slots for a service
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/my-appointments` - Get user's appointments
- `GET /api/appointments/:appointmentId` - Get appointment details
- `PUT /api/appointments/:appointmentId/cancel` - Cancel appointment
- `PUT /api/appointments/:appointmentId/reschedule` - Reschedule appointment
- `PUT /api/appointments/:appointmentId/confirm` - Confirm appointment (organiser)
- `GET /api/appointments/stats` - Get appointment statistics

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId` - Get user details
- `PUT /api/admin/users/:userId/status` - Update user status
- `PUT /api/admin/users/:userId/activate` - Activate user
- `PUT /api/admin/users/:userId/deactivate` - Deactivate user
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/dashboard/data` - Get dashboard data

## Project Structure

```
src/
├── config/
│   ├── config.js       - Configuration
│   └── database.js     - MongoDB connection
├── models/
│   ├── User.js         - User model
│   ├── Service.js      - Service model
│   ├── Appointment.js  - Appointment model
│   ├── Slot.js         - Slot model
│   └── Review.js       - Review model
├── controllers/
│   ├── authController.js        - Auth logic
│   ├── serviceController.js     - Service logic
│   ├── appointmentController.js - Appointment logic
│   └── adminController.js       - Admin logic
├── routes/
│   ├── authRoutes.js        - Auth routes
│   ├── serviceRoutes.js     - Service routes
│   ├── appointmentRoutes.js - Appointment routes
│   └── adminRoutes.js       - Admin routes
├── middleware/
│   ├── auth.js   - Authentication middleware
│   └── error.js  - Error handling
├── utils/
│   └── helpers.js - Helper functions
└── index.js      - Main server file
```

## User Roles

- **Customer**: Can book appointments, view their bookings, cancel/reschedule
- **Organiser**: Can create services, manage availability, view bookings, confirm appointments
- **Admin**: Can manage users, view statistics, monitor all bookings

## Features

- User authentication with JWT
- Email verification with OTP
- Password reset functionality
- Service management
- Appointment booking with availability checking
- Appointment cancellation and rescheduling
- Role-based access control
- Admin dashboard with statistics

## Technologies Used

- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin requests
