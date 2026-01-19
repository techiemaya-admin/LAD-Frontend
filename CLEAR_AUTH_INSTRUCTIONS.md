# Fix Google Connect Authentication Error

## Problem
You're seeing "User ID not available" and 401 errors because your browser has a JWT token from local development that was signed with a different secret than production.

## Solution

### Option 1: Clear Browser Storage (Recommended)
1. Open your deployed app in the browser
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Under **Local Storage** → Clear `auth_token` and `token`
5. Under **Cookies** → Clear `access_token` cookie
6. Refresh the page
7. Log in again

### Option 2: Use Incognito/Private Window
1. Open the deployed app in an incognito/private window
2. Log in fresh

### Option 3: Quick JavaScript Clear
1. Open DevTools Console on your deployed app
2. Run:
```javascript
localStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
location.reload();
```

This will clear all local storage and cookies, then reload the page so you can log in fresh with a token signed by the production JWT_SECRET.
