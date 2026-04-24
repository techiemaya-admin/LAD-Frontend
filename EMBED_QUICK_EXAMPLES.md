# Contact Form Embed - Copy & Paste Examples

## 🎯 Choose Your Platform and Copy the Code

---

## 1. **Static HTML Website**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
</head>
<body>
    <!-- Your website content -->
    <h1>Welcome to My Site</h1>
    <p>Contact us for more information</p>

    <!-- ADD THIS LINE BEFORE </body> -->
    <script src="https://yourdomain.com/embed.js"></script>
</body>
</html>
```

---

## 2. **WordPress (Using Functions.php)**

Add this to your theme's `functions.php`:

```php
<?php
// Add contact form embed script
add_action('wp_footer', 'add_contact_form_embed');

function add_contact_form_embed() {
    ?>
    <script src="https://yourdomain.com/embed.js"></script>
    <?php
}
```

---

## 3. **WordPress (Using Code Snippets Plugin)**

1. Install **Code Snippets** plugin
2. Click **Snippets → Add New**
3. Paste this code:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

4. Set to run everywhere
5. Save

---

## 4. **React - Simple Hook**

```jsx
// Hook: useContactForm.js
import { useEffect } from 'react';

export const useContactForm = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);
};

// Usage in any component:
import { useContactForm } from './hooks/useContactForm';

export default function MyPage() {
  useContactForm();

  return <h1>Welcome</h1>;
}
```

---

## 5. **React - With Custom Button**

```jsx
import { useRef } from 'react';

export default function ContactPage() {
  const handleContactClick = () => {
    // Open the contact form
    window.LADContact?.open();
  };

  return (
    <div>
      <h1>Get In Touch</h1>
      <button onClick={handleContactClick}>
        Contact Us
      </button>
      <script src="https://yourdomain.com/embed.js" async></script>
    </div>
  );
}
```

---

## 6. **Next.js - App Router**

```typescript
// app/page.tsx
'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div>
      <h1>Welcome</h1>
      <button onClick={() => window.LADContact?.open()}>
        Contact Form
      </button>
    </div>
  );
}
```

---

## 7. **Vue.js**

```vue
<template>
  <div class="container">
    <h1>Contact Us</h1>
    <button @click="openContactForm">Open Contact Form</button>
  </div>
</template>

<script>
export default {
  mounted() {
    // Load embed script
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  },
  methods: {
    openContactForm() {
      window.LADContact?.open();
    }
  }
}
</script>
```

---

## 8. **Angular**

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div>
      <h1>Contact Us</h1>
      <button (click)="openContactForm()">Open Form</button>
    </div>
  `
})
export class AppComponent implements OnInit {
  ngOnInit() {
    this.loadContactFormScript();
  }

  loadContactFormScript() {
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }

  openContactForm() {
    (window as any).LADContact?.open();
  }
}
```

---

## 9. **Shopify Theme**

Add to `theme.liquid` before closing `</body>` tag:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

Or in the code injection settings:
1. Settings → Checkout → Additional scripts
2. Paste the script tag

---

## 10. **Wix Website**

1. Go to **Settings → Custom Code**
2. Click **Add Custom Code**
3. Paste this:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

4. Choose **End of Page**
5. Apply to **All Pages**

---

## 11. **Squarespace**

1. **Settings → Advanced → Code Injection**
2. Footer Code:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

---

## 12. **Webflow**

1. **Project Settings → Custom Code**
2. Footer Code:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

---

## 13. **Gatsby**

```jsx
// gatsby-browser.js
export const onClientEntry = async () => {
  const script = document.createElement('script');
  script.src = 'https://yourdomain.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
};
```

---

## 14. **Svelte**

```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  });

  function openForm() {
    window.LADContact?.open();
  }
</script>

<h1>Contact Us</h1>
<button on:click={openForm}>Open Form</button>
```

---

## 15. **HTML with Custom Button**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Contact Form Test</title>
    <style>
        .contact-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 15px 30px;
            background: linear-gradient(135deg, #0b1957, #1a3a8f);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(11, 25, 87, 0.3);
            z-index: 9998;
        }
        .contact-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(11, 25, 87, 0.4);
        }
    </style>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>Click the button to contact us!</p>

    <!-- Custom contact button -->
    <button class="contact-btn" onclick="window.LADContact.open()">
        💬 Chat with us
    </button>

    <!-- Load the form -->
    <script src="https://yourdomain.com/embed.js"></script>
</body>
</html>
```

---

## 🎮 Advanced: Custom Event Listeners

```html
<script>
  // Listen for form open
  window.addEventListener('lad-contact-open', () => {
    console.log('User opened contact form');
    // Track in analytics
    gtag('event', 'contact_form_opened');
  });

  // Listen for form close
  window.addEventListener('lad-contact-close', () => {
    console.log('User closed contact form');
  });

  // Load the embed script
</script>
<script src="https://yourdomain.com/embed.js"></script>
```

---

## 🔐 Environment-Specific URLs

### Development (Local Testing)
```html
<script src="http://localhost:3000/embed.js"></script>
```

### Staging
```html
<script src="https://staging.yourdomain.com/embed.js"></script>
```

### Production
```html
<script src="https://yourdomain.com/embed.js"></script>
```

### Dynamic (Auto-detect)
```html
<script>
  const domain = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://yourdomain.com';

  const script = document.createElement('script');
  script.src = domain + '/embed.js';
  document.body.appendChild(script);
</script>
```

---

## ✅ Testing Checklist

After adding the embed script:

- [ ] Floating button appears (bottom-right)
- [ ] Button is styled correctly with brand colors
- [ ] Clicking button opens the form modal
- [ ] Form has fields: Name, Email, Company, Message
- [ ] Form validates input before submit
- [ ] Successful submission shows success message
- [ ] Can close form by clicking X or background
- [ ] No console errors (F12 → Console tab)
- [ ] Submission appears in admin panel

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Button doesn't appear | Check script URL is correct |
| Form doesn't submit | Check browser console for errors |
| CORS error | Verify CORS headers in next.config.mjs |
| Wrong domain loading | Update embed.js with correct domain |
| Button in wrong position | Customize CSS in embed.js |

---

## 📞 Support

- **Admin Panel:** `https://yourdomain.com/admin/submissions?token=TOKEN`
- **Check Submissions:** `curl "https://yourdomain.com/api/contact?token=TOKEN"`
- **Test Script:** `http://localhost:3000/embed.js`

---

**Choose your platform above and copy the code! 🚀**
