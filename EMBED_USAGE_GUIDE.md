# Contact Form Embed - Usage Guide for Different Websites

## 📌 Overview

Your LAD contact form can be embedded on ANY website with a single line of code. It works on:
- ✅ Static HTML websites
- ✅ WordPress sites
- ✅ React/Vue/Angular apps
- ✅ Shopify stores
- ✅ Custom web applications
- ✅ Single-page applications (SPAs)

---

## 🚀 Basic Installation (All Websites)

### Step 1: Get Your Domain URL

First, determine your LAD Frontend domain:

```
Development:  http://localhost:3000
Staging:      https://staging.yourdomain.com
Production:   https://yourdomain.com
```

### Step 2: Add Script to Your Website

Add this single line of code just before the closing `</body>` tag:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

That's it! The floating button will appear automatically.

---

## 💻 Implementation Examples

### 1️⃣ **Simple HTML Website**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Company</title>
</head>
<body>
    <!-- Your website content here -->
    <header>
        <h1>Welcome to My Company</h1>
        <p>We're here to help!</p>
    </header>

    <main>
        <p>Contact us for more information.</p>
    </main>

    <!-- Add embed script at the end -->
    <script src="https://yourdomain.com/embed.js"></script>
</body>
</html>
```

---

### 2️⃣ **WordPress Website**

#### Option A: Using a Custom Code Plugin

1. Install plugin: **Code Snippets** or **Insert Headers and Footers**
2. Go to plugin settings
3. Paste this in the footer section:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

#### Option B: Edit Theme Footer

1. Go to **Appearance → Theme File Editor**
2. Find `footer.php`
3. Add before `</body>`:

```php
<script src="https://yourdomain.com/embed.js"></script>
```

---

### 3️⃣ **React/Next.js Application**

#### Using useEffect Hook

```typescript
// pages/index.tsx or any page component
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Dynamically load the embed script
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div>
      {/* Your page content */}
      <h1>Welcome</h1>
    </div>
  );
}
```

#### Using Custom Hook

```typescript
// hooks/useContactForm.ts
import { useEffect } from 'react';

export const useContactForm = (domain = 'https://yourdomain.com') => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `${domain}/embed.js`;
    script.async = true;
    document.body.appendChild(script);
  }, [domain]);
};

// Then use in any component
import { useContactForm } from '@/hooks/useContactForm';

export default function Page() {
  useContactForm();

  return <div>{/* Your content */}</div>;
}
```

---

### 4️⃣ **Vue.js Application**

```vue
<!-- pages/Home.vue -->
<template>
  <div class="home">
    <h1>Welcome to Our Site</h1>
    <p>Contact us using the floating button</p>
  </div>
</template>

<script>
export default {
  name: 'Home',
  mounted() {
    // Load embed script when component mounts
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  },
  beforeUnmount() {
    // Clean up if needed
    const script = document.querySelector('script[src*="embed.js"]');
    if (script) {
      script.remove();
    }
  }
}
</script>
```

---

### 5️⃣ **Angular Application**

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<div><!-- Your content --></div>`
})
export class AppComponent implements OnInit {
  ngOnInit() {
    this.loadContactForm();
  }

  loadContactForm() {
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }
}
```

---

### 6️⃣ **Shopify Store**

1. Go to **Settings → Checkout → Additional scripts**
2. Paste:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

Or in theme code:

1. Go to **Online Store → Themes → Edit Code**
2. Open `theme.liquid`
3. Add before `</body>`:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

---

### 7️⃣ **Wix Website**

1. Go to **Settings → Custom Code**
2. Click **Add Custom Code**
3. Paste:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

4. Choose placement: **Head** or **Body (end)**
5. Select all pages or specific pages

---

### 8️⃣ **Squarespace Website**

1. Go to **Settings → Advanced → Code Injection**
2. In the **Footer** section, paste:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

---

### 9️⃣ **Google Sites**

1. Click on a page in your site
2. Click **More options (⋮) → Embed code**
3. Paste:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

---

### 🔟 **Webflow**

1. Go to **Project Settings → Custom Code**
2. In **Footer Code**, paste:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

---

## 🎮 Programmatic Control

Once the embed script is loaded, you can control the form with JavaScript:

### Open Form Programmatically

```html
<button onclick="window.LADContact.open()">
  Contact Us
</button>
```

### Close Form

```javascript
window.LADContact.close();
```

### Full Example with Custom Button

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Site</title>
    <style>
        .contact-button {
            padding: 12px 24px;
            background: #0b1957;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        }
        .contact-button:hover {
            background: #0a1447;
        }
    </style>
</head>
<body>
    <h1>Welcome</h1>
    <p>Have questions? Click the button below.</p>

    <!-- Custom button that triggers the form -->
    <button class="contact-button" onclick="window.LADContact.open()">
        📧 Send us a Message
    </button>

    <!-- Or use the automatic floating button -->
    <script src="https://yourdomain.com/embed.js"></script>
</body>
</html>
```

---

## 🔧 Configuration for Different Domains

### Update embed.js for Your Domain

Edit `web/public/embed.js` (lines 4-5):

**For Development (local testing):**
```javascript
const EMBED_URL = 'http://localhost:3000';
```

**For Staging:**
```javascript
const EMBED_URL = 'https://staging.yourdomain.com';
```

**For Production:**
```javascript
const EMBED_URL = 'https://yourdomain.com';
```

**Auto-detect Domain (Recommended):**
```javascript
const EMBED_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://yourdomain.com';
```

---

## 🧪 Testing the Embed

### Local Testing (Development)

1. Create a test HTML file:

```html
<!-- test-embed.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Embed Test</title>
</head>
<body>
    <h1>Testing Contact Form Embed</h1>
    <p>The floating button should appear in 3-5 seconds.</p>
    <p>Check the browser console for any errors.</p>

    <script src="http://localhost:3000/embed.js"></script>
</body>
</html>
```

2. Open in browser: `file:///path/to/test-embed.html`
3. Check browser console (F12) for errors

### Test on Remote Website

Once deployed to production:

1. Visit your test website
2. Look for floating button (bottom-right)
3. Click button → form should open
4. Fill and submit form
5. Check `/admin/submissions?token=your-admin-token` for the submission

---

## 🔒 Security Considerations

### CORS Configuration

The embed script works because CORS headers are set in `next.config.mjs`:

```javascript
// CORS headers allow requests from any domain
{
  key: "Access-Control-Allow-Origin",
  value: "*",  // Allow all, or specify domains
}
```

### Restrict to Specific Domains (Recommended for Production)

Edit `web/next.config.mjs`:

```javascript
value: "https://yourdomain.com, https://trusted-site.com, https://another-site.com"
```

---

## 📊 Tracking Form Submissions

### View Submissions via Admin API

```bash
curl "https://yourdomain.com/api/contact?token=your-admin-token"
```

This shows:
- All submissions from all embedded instances
- Source URL (where form was submitted from)
- User agent information
- Timestamps

---

## 🎨 Customizing the Button

The embed script creates a floating button. To customize it, edit `web/public/embed.js`:

### Change Button Text

```javascript
button.innerHTML = '💬 Contact Us'; // Change this
```

### Change Button Position

```javascript
// Change from bottom-right:
button.style.cssText = `
    position: fixed;
    bottom: 24px;    // 24px from bottom
    right: 24px;     // 24px from right
    // ... rest of styles
`;

// To bottom-left:
button.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;      // Changed from right to left
    // ... rest of styles
`;
```

### Change Button Colors

```javascript
button.style.cssText = `
    background: linear-gradient(135deg, #0b1957 0%, #1a3a8f 100%);
    // Change to your colors:
    // background: #FF6B35;
`;
```

---

## ⚠️ Troubleshooting

### Issue: Floating button doesn't appear

**Solution 1:** Check if script loaded
```javascript
// Open browser console (F12) and run:
console.log(window.LADContact);
```

Should return: `{ open: function, close: function }`

**Solution 2:** Verify script URL
```html
<!-- Check the script source -->
<script src="https://yourdomain.com/embed.js"></script>
<!-- Make sure yourdomain.com is correct -->
```

**Solution 3:** Check CORS
```
If you see CORS error in console:
- Make sure CORS headers are set in next.config.mjs
- Verify domain is allowed
```

### Issue: Form submission fails

**Check:**
1. Network tab shows POST to `/api/contact`?
2. Response status: 201 (success) or 400/500 (error)?
3. Check browser console for error message

---

## 📱 Mobile Responsiveness

The embed automatically adapts to mobile:
- Floating button: Touch-friendly size (48px)
- Modal: Full-width on small screens
- Form: Optimized for mobile input

Test on:
- iPhone 12/13
- Android phones
- Tablets

---

## 🚀 Production Deployment Checklist

- [ ] Update `embed.js` with production domain
- [ ] Update CORS headers in `next.config.mjs` if restricting domains
- [ ] Test on staging environment first
- [ ] Deploy to production
- [ ] Test on live domain
- [ ] Verify submissions appear in admin panel
- [ ] Set up email notifications (optional)
- [ ] Monitor form submissions

---

## 📚 Quick Reference

| Task | Command/Code |
|------|-------------|
| **Basic embed** | `<script src="https://yourdomain.com/embed.js"></script>` |
| **Open form** | `window.LADContact.open()` |
| **Close form** | `window.LADContact.close()` |
| **View submissions** | `curl "https://yourdomain.com/api/contact?token=TOKEN"` |
| **Admin panel** | `https://yourdomain.com/admin/submissions?token=TOKEN` |

---

## 💡 Tips & Tricks

### Delay Loading Script
```html
<!-- Load after page is ready -->
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    document.body.appendChild(script);
  });
</script>
```

### Load Script Conditionally
```html
<!-- Only load on specific page -->
<script>
  if (window.location.pathname === '/contact') {
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    document.body.appendChild(script);
  }
</script>
```

### Track Form Submissions
```html
<script>
  // Log when form opens
  window.addEventListener('lad-contact-open', () => {
    console.log('Contact form opened');
    // Send to analytics
  });
</script>
<script src="https://yourdomain.com/embed.js"></script>
```

---

## 🤝 Need Help?

1. **Script not loading?** → Check domain URL
2. **Form not submitting?** → Check CORS headers
3. **Can't see button?** → Check browser console (F12)
4. **Other issues?** → Check `/admin/submissions` for error details

Happy embedding! 🚀
