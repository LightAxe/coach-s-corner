
# Security Fixes Implementation Plan

This plan addresses the validated security findings from Claude Code's review, organized into four implementation phases.

---

## Summary of Changes

| Phase | Scope | Files Affected |
|-------|-------|----------------|
| Phase 1 | Critical OTP/Auth Security | send-otp, verify-otp, database migration |
| Phase 2 | Data Protection | Database views, AuthContext, hooks |
| Phase 3 | Input Validation | Signup, AddRaceDialog, AddAthleteDialog, CreateTeam |
| Phase 4 | Code Hardening | Database migration, edge functions |

---

## Phase 1: Critical OTP and Authentication Security

### 1.1 Secure OTP Generation
**Finding #2**: Replace `Math.random()` with cryptographically secure random

**File**: `supabase/functions/send-otp/index.ts`

Current insecure code:
```typescript
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

Will be replaced with:
```typescript
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000)).padStart(6, '0');
}
```

### 1.2 Rate Limiting for OTP Requests
**Finding #1**: Add rate limiting to prevent brute-force attacks

**Database Migration**:
- Create `otp_rate_limits` table to track send/verify attempts
- Add `verification_attempts` column to `otp_codes` table
- Create cleanup function for rate limit records
- RLS policy: Service role only (no public access)

**Edge Function Changes**:
- `send-otp`: Check for 5 requests per email per hour before sending
- `verify-otp`: Increment attempt counter, invalidate code after 5 failures
- Both functions: Call cleanup opportunistically (since `pg_cron` may not be available)

### 1.3 Server-Side Role Validation
**Finding #4**: Validate role is one of allowed values

**File**: `supabase/functions/verify-otp/index.ts`

Add validation before creating profile:
```typescript
const VALID_ROLES = ['coach', 'athlete', 'parent'] as const;

if (signupData && !VALID_ROLES.includes(signupData.role)) {
  return new Response(
    JSON.stringify({ success: false, error: "Invalid role specified" }),
    { status: 400, headers: corsHeaders }
  );
}
```

### 1.4 OTP Input Validation
**Finding #9**: Sanitize and validate OTP code format

**File**: `supabase/functions/verify-otp/index.ts`

Add before database query:
```typescript
const sanitizedCode = code.trim();
if (!/^\d{6}$/.test(sanitizedCode)) {
  return new Response(
    JSON.stringify({ success: false, error: "Invalid code format" }),
    { status: 400, headers: corsHeaders }
  );
}
```

---

## Phase 2: Data Protection

### 2.1 Dynamic CORS with Pattern Matching
**Finding #5**: Restrict CORS while supporting changing URLs

**Files**: `supabase/functions/send-otp/index.ts`, `supabase/functions/verify-otp/index.ts`

Instead of hardcoding URLs, use domain pattern matching:
```typescript
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Allow lovable.app domains (preview and production)
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin)) {
    return true;
  }
  
  // Allow localhost for development
  if (/^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }
  
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin) ? origin : null;
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ...",
    "Vary": "Origin",
  };
}
```

This approach:
- Allows all `*.lovable.app` subdomains (preview and production)
- Allows localhost ports for development
- Does not require hardcoding specific URLs
- Returns empty origin for disallowed requests

### 2.2 Hide Team Join Codes from Non-Coaches
**Finding #7**: Team codes visible to all members

**Database Migration**: Create secure view for teams
```sql
CREATE OR REPLACE FUNCTION public.is_team_coach_by_uid(_team_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = _team_id
      AND profile_id = auth.uid()
      AND role = 'coach'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE VIEW public.teams_secure AS
SELECT 
  id,
  name,
  created_by,
  created_at,
  CASE WHEN is_team_coach_by_uid(id) THEN join_code ELSE NULL END as join_code,
  CASE WHEN is_team_coach_by_uid(id) THEN coach_invite_code ELSE NULL END as coach_invite_code
FROM public.teams;

GRANT SELECT ON public.teams_secure TO authenticated;
```

**Code Changes**: 
- Update `AuthContext.tsx` to query `teams` for team name only
- The `TeamSettings.tsx` page already fetches codes directly (coach-only page)
- No functional changes needed since codes are only displayed on coach pages

### 2.3 Restrict PII Access
**Finding #8**: Profile email/phone exposed to non-coaches

**Database Migration**: Create secure view for profiles
```sql
CREATE OR REPLACE VIEW public.profiles_secure
WITH (security_invoker = on)
AS
SELECT 
  id,
  first_name,
  last_name,
  role,
  created_at,
  updated_at,
  CASE 
    WHEN id = auth.uid() THEN email
    WHEN EXISTS (
      SELECT 1 FROM team_memberships tm1
      JOIN team_memberships tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.profile_id = auth.uid() 
        AND tm1.role = 'coach'
        AND tm2.profile_id = profiles.id
    ) THEN email
    ELSE NULL 
  END as email,
  CASE 
    WHEN id = auth.uid() THEN phone
    WHEN EXISTS (
      SELECT 1 FROM team_memberships tm1
      JOIN team_memberships tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.profile_id = auth.uid() 
        AND tm1.role = 'coach'
        AND tm2.profile_id = profiles.id
    ) THEN phone
    ELSE NULL 
  END as phone
FROM public.profiles;

GRANT SELECT ON public.profiles_secure TO authenticated;
```

### 2.4 Generic Error Messages
**Finding #13**: Error reveals account existence (`needsSignup: true`)

**File**: `supabase/functions/verify-otp/index.ts`

Replace specific error responses with generic ones:
```typescript
// Instead of:
// { error: "No account found", needsSignup: true }

// Use:
{ success: false, error: "Invalid or expired code. Please try again." }
```

**Frontend Impact**:
- `AuthContext.tsx`: Remove `needsSignup` handling
- Users attempting login without an account see a generic error
- Trade-off: Slightly worse UX for users who forget they don't have an account
- Security benefit: Prevents user enumeration attacks

---

## Phase 3: Input Validation Hardening

### 3.1 Signup Form Validation
**Finding #11, #15**: Add length limits and phone validation

**File**: `src/pages/Signup.tsx`
```typescript
const signupSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long'),
  email: z.string()
    .email('Please enter a valid email')
    .max(255, 'Email too long'),
  phone: z.string()
    .regex(/^[\d\s\-\(\)\+]*$/, 'Invalid phone format')
    .max(20, 'Phone number too long')
    .optional()
    .or(z.literal('')),
  role: z.enum(['coach', 'athlete', 'parent']),
});
```

### 3.2 URL Scheme Validation
**Finding #12**: Prevent `javascript:` and `data:` URL schemes

**File**: `src/components/races/AddRaceDialog.tsx`
```typescript
const safeUrlSchema = z.string()
  .refine(
    val => !val || /^https?:\/\//i.test(val),
    { message: 'URL must start with http:// or https://' }
  )
  .optional()
  .or(z.literal(''));

const formSchema = z.object({
  // ...existing fields...
  map_link: safeUrlSchema,
  results_link: safeUrlSchema,
});
```

### 3.3 Other Form Validations
**Finding #11**: Add max length to all text inputs

**Files to update**:
- `src/pages/CreateTeam.tsx`: Team name max 100 chars
- `src/components/athletes/AddAthleteDialog.tsx`: Names max 50 chars
- `src/components/records/AddOffseasonResultDialog.tsx`: Notes max 500 chars

---

## Phase 4: Code Hardening

### 4.1 Improve Team Code Generation
**Finding #16**: Use cryptographic randomness for team codes

**Database Migration**: Update `regenerate_team_code` function
```sql
CREATE OR REPLACE FUNCTION public.regenerate_team_code(_team_id uuid, _code_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NOT is_team_coach(_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Use cryptographic randomness instead of md5(random())
  new_code := upper(encode(gen_random_bytes(3), 'hex'));
  
  IF _code_type = 'athlete' THEN
    UPDATE teams SET join_code = new_code WHERE id = _team_id;
  ELSIF _code_type = 'coach' THEN
    UPDATE teams SET coach_invite_code = new_code WHERE id = _team_id;
  ELSE
    RAISE EXCEPTION 'Invalid code type';
  END IF;
  
  RETURN new_code;
END;
$$;
```

**File**: `src/pages/CreateTeam.tsx`

Update client-side code generation (for initial team creation):
```typescript
function generateJoinCode(): string {
  const array = new Uint8Array(3);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}
```

### 4.2 OTP Cleanup in Edge Functions
**Finding #17**: `cleanup_expired_otp_codes()` is never called

Since `pg_cron` may not be available, add opportunistic cleanup at the start of `send-otp`:
```typescript
// At the start of send-otp, before generating new code
await supabase.rpc('cleanup_expired_otp_codes');
await supabase.rpc('cleanup_otp_rate_limits');
```

---

## Findings Not Being Addressed

| Finding | Reason |
|---------|--------|
| #3 OTP Table RLS | The RLS policy is correctly configured - edge functions use service role which bypasses RLS |
| #6 race_results DELETE | Already has a DELETE policy for coaches (verified in linter output) |
| #10 dangerouslySetInnerHTML | Low risk - content is developer-defined chart config, not user input |
| #14 Session Timeout | Would require significant UX changes; Supabase handles session refresh securely |
| #18 Console Errors | Low priority; would require build configuration changes |

---

## Implementation Order

1. **Phase 1** (Critical): Must be deployed together
   - Database migration for rate limiting
   - Updated `send-otp` with secure OTP + rate limiting
   - Updated `verify-otp` with validation + rate limiting

2. **Phase 2** (High Priority): Can be deployed incrementally
   - CORS changes (included with Phase 1 edge function updates)
   - Database views for data protection
   - Frontend generic error handling

3. **Phase 3** (Medium Priority): Can be deployed independently
   - Form validation improvements across components

4. **Phase 4** (Lower Priority): Can be deployed independently
   - Team code generation improvements
   - OTP cleanup integration

---

## Testing Recommendations

After implementation:
1. **Rate Limiting**: Send 6 OTP requests to same email within 1 hour - 6th should be blocked
2. **OTP Validation**: Try invalid codes (letters, wrong length) - should get format error
3. **Role Validation**: Attempt signup with invalid role via API - should be rejected
4. **CORS**: Verify requests work from preview URL and are blocked from unauthorized origins
5. **Data Protection**: Verify athletes cannot see join codes or other users' email/phone
6. **Input Validation**: Test form submissions with very long strings and invalid URLs
