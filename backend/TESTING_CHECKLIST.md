# OTP Authentication Implementation - Testing Checklist

## Pre-Testing Setup

- [ ] Database migrated (`prisma migrate dev` completed)
- [ ] `.env` updated with SMTP credentials
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend server running on `http://localhost:4000`
- [ ] Check `backend/prisma/migrations/` has new migration folder
- [ ] Verify database has `otp` and `otpExpiry` columns in `User` table

---

## Signup & OTP Verification Flow

### New Signup with OTP
- [ ] POST `/auth/register` with valid email, password (8+ chars), name
- [ ] Response: 201 Created with success message mentioning OTP
- [ ] Database check: User created with `emailVerified = false`
- [ ] Database check: `otp` field is NOT NULL (has 6-digit code)
- [ ] Database check: `otpExpiry` is set to ~5 minutes in future
- [ ] Email received: Check inbox for OTP email from configured sender
- [ ] Email contains: 6-digit OTP code clearly visible

### OTP Verification
- [ ] POST `/auth/verify-otp` with correct email and OTP from email
- [ ] Response: 200 OK, "Email verified successfully"
- [ ] Database check: `emailVerified` changed to `true`
- [ ] Database check: `otp` and `otpExpiry` are now NULL
- [ ] User can now login (test next)

### OTP Error Cases
- [ ] POST `/auth/verify-otp` with wrong OTP → 400 "Invalid OTP"
- [ ] POST `/auth/verify-otp` after 5+ minutes → 400 "OTP has expired"
- [ ] POST `/auth/verify-otp` without OTP field → 400 "Email and OTP required"
- [ ] POST `/auth/verify-otp` with non-existent email → 404 "User not found"

### Resend OTP
- [ ] POST `/auth/resend-otp` with email and type "signup"
- [ ] Response: 200 OK, "OTP has been resent"
- [ ] Database check: OTP changed (different 6-digit code)
- [ ] Database check: otpExpiry updated (new 5-min window)
- [ ] Email received: New OTP email with new code
- [ ] Old OTP code should NOT work (use new one)
- [ ] POST `/auth/resend-otp` for already verified user → 400 "Email already verified"

---

## Login Flow with Verification Check

### Successful Login (After Verification)
- [ ] POST `/auth/login` with verified user's email + password
- [ ] Response: 200 OK with accessToken, refreshToken, user data
- [ ] Response includes: `emailVerified: true`
- [ ] Tokens are valid JWTs

### Login Blocked if Unverified
- [ ] Create new user → gets OTP but don't verify
- [ ] POST `/auth/login` with unverified user's email + password
- [ ] Response: 403 Forbidden, "Please verify your email before logging in"
- [ ] NO accessToken or refreshToken issued
- [ ] User is forced to verify OTP first

### Invalid Credentials (Unchanged)
- [ ] POST `/auth/login` with wrong password → 401 "Invalid email or password"
- [ ] POST `/auth/login` with non-existent email → 401 "Invalid email or password"
- [ ] POST `/auth/login` without email/password fields → 400 "Email and password required"

---

## Password Reset with OTP

### Request Password Reset
- [ ] POST `/auth/request-password-reset` with valid email
- [ ] Response: 200 OK, generic success message (security: no user enumeration)
- [ ] Database check: `otp` field set to new 6-digit code
- [ ] Database check: `otpExpiry` set to ~5 minutes in future
- [ ] Email received: Password reset email from configured sender
- [ ] Email contains: 6-digit OTP code

### Reset Password with OTP
- [ ] POST `/auth/reset-password` with email + OTP (from email) + new password (8+ chars)
- [ ] Response: 200 OK, "Password reset successfully"
- [ ] Database check: Password hash updated (use new password to login)
- [ ] Database check: `otp` and `otpExpiry` are NULL
- [ ] User can login with new password
- [ ] All refresh tokens revoked (user logged out everywhere)

### Password Reset Error Cases
- [ ] POST `/auth/reset-password` with wrong OTP → 400 "Invalid OTP"
- [ ] POST `/auth/reset-password` after 5+ minutes → 400 "OTP has expired"
- [ ] POST `/auth/reset-password` with weak password (< 8 chars) → 400 "Password must be at least 8 characters"
- [ ] POST `/auth/reset-password` without OTP request → 400 "No OTP request found"
- [ ] Non-existent email → 404 "User not found"

---

## Backward Compatibility - Legacy Endpoints Still Work

### Email Verification Link (Legacy)
- [ ] GET `/auth/verify-email?token=...&email=...` still works
- [ ] Old EmailVerificationToken records still processable
- [ ] Does not interfere with OTP verification
- [ ] Both methods (link + OTP) can coexist

### Refresh Token (Unchanged)
- [ ] POST `/auth/refresh-token` with valid refresh token works
- [ ] Response: New accessToken + new refreshToken
- [ ] Old token is revoked (rotation maintained)

### Logout (Unchanged)
- [ ] POST `/auth/logout` with refresh token works
- [ ] Response: Success message
- [ ] Database check: RefreshToken marked as revoked

### Resend Verification Email (Legacy - Still Works)
- [ ] POST `/auth/resend-verification-email` still works
- [ ] Generates and sends EmailVerificationToken
- [ ] Does not interfere with OTP flow

---

## Protected APIs - Verify Booking System Unchanged

### Auth Middleware Still Works
- [ ] Protected endpoints still require valid accessToken
- [ ] POST with Bearer token → Access granted
- [ ] POST without token → 401 Unauthorized
- [ ] POST with invalid token → 401 Unauthorized
- [ ] POST with expired token → 401 Unauthorized (use refresh-token to get new one)

### Appointment Endpoints (Sample)
- [ ] GET `/appointments` with valid token → Works (booking system unaffected)
- [ ] POST `/appointments` with valid token → Works
- [ ] Existing appointment filters/sorting → Works

### Booking Endpoints (Sample)
- [ ] GET `/bookings` with valid token → Works
- [ ] POST `/bookings` to create booking → Works
- [ ] Booking validations still enforced

---

## Database Integrity

### Verify Migrations Applied
- [ ] Column `otp` exists in User table (VARCHAR, nullable)
- [ ] Column `otpExpiry` exists in User table (DATETIME, nullable)
- [ ] Both columns are nullable (NULL by default)
- [ ] No data lost in migration

### Existing Data Preserved
- [ ] Existing users have NULL otp and otpExpiry
- [ ] Existing verified users still have `emailVerified = true`
- [ ] All passwords unchanged
- [ ] All organizations preserved
- [ ] All appointments preserved
- [ ] All bookings preserved

### Schema Consistency
- [ ] EmailVerificationToken table still exists (legacy support)
- [ ] PasswordResetToken table still exists (legacy support)
- [ ] All foreign keys intact
- [ ] All indexes intact

---

## SMTP Configuration Verification

### Email Service Functional
- [ ] OTP signup email received
- [ ] OTP password reset email received
- [ ] Email contains correct OTP code
- [ ] Email shows correct sender name/email
- [ ] Email formatting is readable (HTML template)

### Ethereal Fallback Works (If No SMTP Credentials)
- [ ] Leave `SMTP_USER` and `SMTP_PASS` empty in `.env`
- [ ] System auto-creates Ethereal test account
- [ ] Emails are capturable in Ethereal preview URL
- [ ] Useful for development/testing without real SMTP

---

## Error Handling & Edge Cases

### Duplicate Email Signup
- [ ] POST `/auth/register` with existing email → 400 "User already exists"
- [ ] Database: No duplicate User created

### Multiple OTP Requests
- [ ] Request OTP → Get code 1
- [ ] Request OTP again → Get code 2 (different)
- [ ] Old code 1 should NOT work
- [ ] Only new code 2 should work

### Password Reset on Unverified User
- [ ] POST `/auth/request-password-reset` for unverified user
- [ ] Works (gets OTP sent)
- [ ] After password reset via OTP, user still has `emailVerified = false`
- [ ] User must still verify email to login (password change doesn't auto-verify)

### Concurrent Requests
- [ ] Verify OTP → Process immediately (no race conditions)
- [ ] Login simultaneously on different devices → Both should work
- [ ] Refresh token on multiple tabs → Each gets new token

---

## Frontend Compatibility

### Response Format Consistent
- [ ] All responses follow { success, message, data? } format
- [ ] Status codes correct (200, 201, 400, 403, 404, 500)
- [ ] Frontend HTTP interceptors work with new endpoints

### Token Format Unchanged
- [ ] Access token is still JWT
- [ ] Refresh token is still JWT
- [ ] Token structure hasn't changed (payload format same)
- [ ] Frontend middleware still validates

### Error Messages Descriptive
- [ ] Error messages are user-friendly (for frontend display)
- [ ] Messages don't expose sensitive system details
- [ ] Console shows detailed error logs (for debugging)

---

## Performance & Security

### Rate Limiting (If Configured)
- [ ] Repeated OTP requests don't crash system
- [ ] Brute force attempts handled gracefully
- [ ] Server resources not exhausted

### Timing Attacks Mitigated
- [ ] OTP comparison uses constant-time comparison (prevent timing attacks)
- [ ] Generic error messages for invalid credentials

### No OTP Leakage
- [ ] OTP never shown in API responses
- [ ] OTP only in emails
- [ ] Database logs don't expose OTP in plaintext (check if logging enabled)

### Session Management
- [ ] Refresh tokens have proper expiry
- [ ] Revoked tokens are checked before use
- [ ] Old refresh tokens from previous session don't work after logout

---

## Regression Testing - Existing Features

### Organization Admin
- [ ] Organization can create appointments (unchanged)
- [ ] Organization can manage members (unchanged)
- [ ] Admin dashboard functions (unchanged)

### Booking System
- [ ] Booking creation works (unchanged)
- [ ] Slot locking works (unchanged)
- [ ] Payment integration works (unchanged)
- [ ] Cancellation logic works (unchanged)

### Notifications
- [ ] Notification creation still works (unchanged)
- [ ] Notification delivery unaffected (unchanged)

### File Upload/Media
- [ ] Media upload endpoints work (unchanged)
- [ ] Appointment pictures upload (unchanged)

---

## Documentation & Deployment

- [ ] OTP_AUTHENTICATION_GUIDE.md is in backend directory
- [ ] All team members understand new endpoints
- [ ] Frontend developers have API spec
- [ ] Database migration documented
- [ ] SMTP setup instructions clear
- [ ] Deployment checklist includes SMTP config

---

## Sign-Off Checklist

**Testing Date:** _______________

**Tester Name:** _______________

- [ ] All signup/verification tests PASSED
- [ ] All login tests PASSED
- [ ] All password reset tests PASSED
- [ ] All error cases handled correctly
- [ ] All backward compatibility tests PASSED
- [ ] All protected API tests PASSED
- [ ] All database integrity checks PASSED
- [ ] SMTP configuration working
- [ ] No existing features broken
- [ ] Performance acceptable
- [ ] Security measures in place

**Sign-Off:** _____ Approved for Production

**Notes/Issues Found:**
```
[List any issues or deviations]
```

---

## Quick Test Script (Bash/PowerShell)

### Test Signup → Verify → Login Flow
```bash
# 1. Signup
RESPONSE=$(curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "name": "Test User",
    "role": "USER"
  }')
echo "Signup: $RESPONSE"

# 2. Verify OTP (replace 123456 with actual OTP from email)
RESPONSE=$(curl -X POST http://localhost:4000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }')
echo "Verify: $RESPONSE"

# 3. Login
RESPONSE=$(curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }')
echo "Login: $RESPONSE"
```

---

## Support & Debugging

**If OTP emails don't send:**
1. Check backend logs for SMTP errors
2. Verify SMTP_USER and SMTP_PASS in `.env`
3. For Gmail: Confirm App Password (not account password)
4. Try with Ethereal (leave SMTP credentials empty)

**If user stuck in verification:**
1. SSH to DB and check `otp` and `otpExpiry` fields
2. Call `/auth/resend-otp` endpoint
3. Use new OTP code

**If password reset fails:**
1. Ensure `emailVerified = true` before reset
2. Check OTP has not expired (5 min window)
3. Verify new password is 8+ characters

**For frontend integration help:**
- See `OTP_AUTHENTICATION_GUIDE.md` - Frontend Integration section
- Reference TypeScript/React code samples
- All endpoints documented with cURL examples
