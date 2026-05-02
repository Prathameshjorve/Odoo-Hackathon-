# OTP-Based Authentication API Documentation

## Overview
The authentication system now supports OTP (One-Time Password) verification for email confirmation and password resets. All OTPs are 6-digit codes sent via SMTP email and expire in 5 minutes.

---

## Architecture Changes

### Database Schema Updates
**User Model - Added Fields:**
- `otp` (String, nullable): The 6-digit OTP code
- `otpExpiry` (DateTime, nullable): Expiration timestamp (5 minutes from generation)
- `emailVerified` (Boolean): Set to true only after OTP verification

### Files Created
1. **`services/emailService.js`** - Nodemailer SMTP wrapper for OTP emails
2. **`utils/generateOtp.js`** - OTP generation utility (6-digit + 5-min expiry)

### Files Modified
1. **`controllers/authController.js`** - Updated signup, login, and password reset flows
2. **`routes/auth.js`** - Added new OTP endpoints
3. **`prisma/schema.prisma`** - Added OTP fields to User model
4. **`.env`** - Added SMTP configuration

---

## API Endpoints

### 1. User Registration (POST `/auth/register`)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "role": "USER"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully. OTP has been sent to your email. Please verify within 5 minutes.",
  "data": {
    "userId": "cuid123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

**What Happens:**
- User is created with `emailVerified = false`
- OTP (6-digit) is generated and saved to database
- OTP email is sent to user's inbox
- User is NOT logged in yet (must verify first)

---

### 2. Verify Email with OTP (POST `/auth/verify-otp`)

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid OTP."
}
```

**Error Cases:**
- `"OTP has expired. Please request a new one."` - OTP older than 5 minutes
- `"Invalid OTP."` - Code doesn't match
- `"No OTP request found. Please sign up again."` - User never requested OTP

**What Happens:**
- OTP and email are validated
- `emailVerified` is set to `true`
- OTP fields are cleared from database
- User can now login

---

### 3. User Login (POST `/auth/login`)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "cuid123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "emailVerified": true,
      "organizationId": null
    }
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in."
}
```

**What Changed:**
- Login now checks `emailVerified === true` before issuing JWT
- Unverified users get 403 error with verification message

---

### 4. Resend OTP (POST `/auth/resend-otp`)

**Request for Email Verification:**
```json
{
  "email": "user@example.com",
  "type": "signup"
}
```

**Request for Password Reset:**
```json
{
  "email": "user@example.com",
  "type": "password-reset"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP has been resent to your email. It expires in 5 minutes."
}
```

**What Happens:**
- New OTP is generated
- Previous OTP is overwritten
- User gets fresh 5-minute window

---

### 5. Request Password Reset (POST `/auth/request-password-reset`)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account with that email exists, an OTP has been sent to reset your password."
}
```

**What Happens:**
- OTP is generated and saved
- Email with OTP is sent
- Response is same regardless of whether email exists (security: prevent user enumeration)

---

### 6. Reset Password with OTP (POST `/auth/reset-password`)

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid OTP."
}
```

**Error Cases:**
- `"OTP has expired. Please request a new one."` - OTP older than 5 minutes
- `"Invalid OTP."` - Code doesn't match
- `"Password must be at least 8 characters long."` - Weak password

**What Happens:**
- OTP is validated
- Password is hashed and updated
- ALL refresh tokens are revoked (forces logout everywhere)
- OTP fields are cleared

---

## Complete Authentication Workflow

### Signup → Verification → Login

```
1. User calls POST /auth/register
   ├─ User created with emailVerified = false
   ├─ OTP generated (6 digits)
   ├─ OTP saved + 5-min expiry set
   └─ Email sent with OTP code

2. User receives email with OTP code

3. User calls POST /auth/verify-otp with email + OTP
   ├─ OTP validated + expiry checked
   ├─ emailVerified set to true
   ├─ OTP fields cleared
   └─ Response: "Email verified. You can now log in."

4. User calls POST /auth/login with email + password
   ├─ Password verified
   ├─ emailVerified check passes ✓
   ├─ JWT generated
   ├─ Refresh token created + stored in cookie
   └─ Response: accessToken + refreshToken
```

### Password Reset with OTP

```
1. User calls POST /auth/request-password-reset
   ├─ OTP generated (6 digits)
   ├─ OTP saved + 5-min expiry set
   └─ Email sent with OTP code

2. User receives email with OTP code

3. User calls POST /auth/reset-password with email + OTP + newPassword
   ├─ OTP validated + expiry checked
   ├─ Password hashed
   ├─ Password updated in database
   ├─ ALL refresh tokens revoked
   ├─ OTP fields cleared
   └─ Response: "Password reset. Please log in."

4. User logs in with new password
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

### HTTP Status Codes
- `200 OK` - Successful request
- `201 Created` - User registered
- `400 Bad Request` - Validation error, invalid OTP, expired OTP
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Email not verified, token revoked
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

## SMTP Configuration

Update `.env` with your email service credentials:

```bash
# Gmail (recommended for testing)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@bookfastx.com"
FROM_NAME="BookFastX"

# Alternative: Use Ethereal (auto-generated for testing)
# Leave SMTP_USER and SMTP_PASS empty, service will auto-generate test account
```

### Gmail App Password Setup
1. Enable 2-Factor Authentication on your Google Account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Use this 16-character password as `SMTP_PASS` in `.env`

---

## Testing with cURL

### 1. Register User
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "name": "Test User",
    "role": "USER"
  }'
```

### 2. Verify OTP (check email for OTP code)
```bash
curl -X POST http://localhost:4000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }'
```

### 4. Resend OTP
```bash
curl -X POST http://localhost:4000/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "type": "signup"
  }'
```

### 5. Request Password Reset
```bash
curl -X POST http://localhost:4000/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }'
```

### 6. Reset Password with OTP
```bash
curl -X POST http://localhost:4000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456",
    "newPassword": "NewPassword123"
  }'
```

---

## Frontend Integration

### TypeScript/React Example
```typescript
// Signup with OTP
async function signupWithOtp(email: string, password: string, name: string) {
  const res = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role: 'USER' }),
  });
  
  const data = await res.json();
  if (data.success) {
    // Show OTP input form
    // Store email for verification step
    sessionStorage.setItem('verificationEmail', email);
  }
  return data;
}

// Verify OTP
async function verifyOtpCode(email: string, otp: string) {
  const res = await fetch('/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  
  const data = await res.json();
  if (data.success) {
    // Navigate to login screen
    // Clear verification email from storage
    sessionStorage.removeItem('verificationEmail');
  }
  return data;
}

// Login (unchanged - now checks emailVerified)
async function login(email: string, password: string) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await res.json();
  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    document.cookie = `refreshToken=${data.data.refreshToken}; HttpOnly`;
  }
  return data;
}
```

---

## Backward Compatibility

### Legacy Email Verification Still Works
- Old `POST /auth/verify-email` endpoint remains active
- Users can still use link-based verification
- New signups use OTP, but old link verification continues to work for existing data

### Gradual Migration
- No breaking changes to existing APIs
- Existing booking and appointment systems unaffected
- Optional: Frontend can support both OTP and link verification during transition

---

## Key Features

✅ **OTP Verification:**
- 6-digit codes sent via email
- 5-minute expiration
- Prevents unverified users from logging in

✅ **Password Reset:**
- OTP-based password reset (replaces token links)
- All sessions revoked after password change
- User must re-login

✅ **Rate Limiting Friendly:**
- Simple numeric codes
- Short expiry (5 min)
- Can implement additional rate limiting if needed

✅ **Security:**
- Bcrypt password hashing (unchanged)
- JWT tokens (unchanged)
- OTP stored in database (not in email)
- Secure SMTP connection

✅ **No Breaking Changes:**
- Existing login/password logic untouched
- Booking system unaffected
- Organization and appointment APIs unchanged

---

## Troubleshooting

### Emails Not Sending
1. Check `.env` has SMTP credentials
2. For Gmail: Verify App Password is set (not regular password)
3. Check 2FA is enabled on Gmail account
4. Try with Ethereal (auto-generates for testing)

### OTP Expired
- OTP valid for exactly 5 minutes
- Use `/auth/resend-otp` to get new code
- No limit on resend attempts

### User Locked After Failed Verification
- User can always request new OTP via `/auth/resend-otp`
- No account lockout mechanism
- User can signup again with same email (will overwrite previous)

### Lost in Verification Flow
- Check database `User` table - is `emailVerified = false`?
- Check `otp` field - is it NULL? (means already verified or never set)
- Resend OTP and try again

---

## Database Queries for Testing

### Check user verification status
```sql
SELECT id, email, emailVerified, otp, otpExpiry FROM User WHERE email = 'test@example.com';
```

### Clear OTP (for testing)
```sql
UPDATE User SET otp = NULL, otpExpiry = NULL WHERE email = 'test@example.com';
```

### Force verification (for testing)
```sql
UPDATE User SET emailVerified = true WHERE email = 'test@example.com';
```

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| User Signup | Now sends OTP instead of verification link | New verification flow |
| User Login | Added check for `emailVerified` | Unverified users blocked |
| Password Reset | Changed to OTP-based (was token-based) | Simpler reset flow |
| Database | Added `otp` and `otpExpiry` fields | Schema migration required |
| Routes | Added `/auth/verify-otp` and `/auth/resend-otp` | New endpoints |
| Services | Added `emailService.js` and `generateOtp.js` | Reusable OTP logic |

**Status:** ✅ All existing APIs and booking systems remain unchanged.
