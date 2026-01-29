
# Passwordless Email OTP Authentication

## Overview
Replace the current password-based authentication with a modern, passwordless flow using email OTP (one-time passwords). Users will create accounts by providing their information, then log in by simply entering their email and receiving a 6-digit code.

## User Experience Flow

### New User (Signup)
1. User enters: First name, Last name, Email, Phone number (for future SMS), Role selection
2. System sends a 6-digit OTP code to their email
3. User enters the code on a verification screen
4. Account is created and user is logged in
5. Redirect to Create Team (coach) or Join Team (athlete/parent)

### Returning User (Login)
1. User enters their email address
2. System sends a 6-digit OTP code to their email
3. User enters the code (using a nice 6-box OTP input component)
4. User is logged in and redirected to dashboard

## Technical Implementation

### 1. Database Migration
Add `phone` column to profiles table for future SMS support:
```sql
ALTER TABLE profiles ADD COLUMN phone TEXT;
```

### 2. AuthContext Updates
Replace password-based methods with OTP methods:
- Remove `signUp(email, password, ...)` and `signIn(email, password)`
- Add `sendOtp(email)` - calls `supabase.auth.signInWithOtp({ email })`
- Add `verifyOtp(email, token)` - calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- Add temporary storage for pending signup data (name, role, phone)

### 3. New Signup Flow (Signup.tsx)
**Step 1 - Information Collection:**
- First name, Last name, Email, Phone (optional), Role selection
- Store this data temporarily in state/context
- Call `signInWithOtp({ email })` to send code

**Step 2 - OTP Verification (VerifyOtp.tsx):**
- Display 6-digit OTP input using the existing `InputOTP` component
- On successful verification, create the profile record with stored data
- Redirect based on role

### 4. Simplified Login Flow (Login.tsx)
**Step 1 - Email Entry:**
- Single email input field
- "Send me a code" button
- Calls `signInWithOtp({ email })`

**Step 2 - OTP Verification:**
- Navigate to verification page or show inline OTP input
- On successful verification, user is logged in
- Existing profile is loaded automatically

### 5. Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/contexts/AuthContext.tsx` | Modify | Replace password methods with OTP methods |
| `src/pages/Signup.tsx` | Modify | Remove password field, add phone, multi-step flow |
| `src/pages/Login.tsx` | Modify | Simplify to email + OTP flow |
| `src/pages/VerifyOtp.tsx` | Create | Shared OTP verification screen |
| `src/pages/ForgotPassword.tsx` | Delete | No longer needed |
| `src/pages/ResetPassword.tsx` | Delete | No longer needed |
| `src/App.tsx` | Modify | Update routes |

### 6. OTP Email Template
The built-in authentication system will send emails with the format:
> "Your one-time login code is: 123456"

## Benefits
- No passwords to remember or manage
- More secure (no password database to breach)
- Modern UX that users expect from contemporary apps
- Phone number collected for future SMS OTP support
- Simpler codebase with less auth complexity

## Future Enhancement (SMS)
Once SMS is ready, we can:
1. Let users choose email or phone for OTP delivery
2. Use `signInWithOtp({ phone })` for SMS codes
3. SMS auto-fills beautifully on iOS/Android
