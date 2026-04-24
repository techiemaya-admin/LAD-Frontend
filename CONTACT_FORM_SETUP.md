# Contact Form Embed - Setup & Usage Guide

## 📋 Overview

A production-ready contact form system for LAD Frontend that:
- ✅ Works as an embedded script on third-party websites
- ✅ Validates form input (client-side & server-side)
- ✅ Stores submissions in memory (easily replace with MongoDB)
- ✅ CORS-enabled for cross-origin requests
- ✅ Styled with your brand colors and typography

## 📁 File Structure

```
web/
├── public/
│   └── embed.js                    # Embed script for third-party sites
├── components/
│   └── ContactFormModal.tsx        # React form component
├── src/
│   └── app/
│       ├── layout.tsx              # Updated with ContactFormModal
│       └── api/
│           └── contact/
│               └── route.ts        # API route for form submission
├── next.config.mjs                 # Updated with CORS headers
└── .env.local                      # Configuration file
```

## 🚀 How It Works

### 1. **Embed on External Website**

Add this single line to any website:

```html
<script src="https://yourdomain.com/embed.js"></script>
```

This automatically adds:
- 💬 Floating button (bottom-right)
- 📝 Contact form modal (when clicked)
- ✅ Form validation & submission

### 2. **Control the Form Programmatically**

```javascript
// Open form
window.LADContact.open();

// Close form
window.LADContact.close();
```

Example:

```html
<button onclick="window.LADContact.open()">Contact Sales</button>
```

### 3. **Form Flow**

```
User clicks button
    ↓
Modal appears with form fields
    ↓
User fills: Name, Email, Company (optional), Message
    ↓
Form validates on submit
    ↓
POST to /api/contact
    ↓
Server validates again
    ↓
Success/error feedback shown
    ↓
Auto-close after 4 seconds (success)
```

## 🔧 Configuration

### Environment Variables (`.env.local`)

```bash
# Enable/disable contact form
NEXT_PUBLIC_CONTACT_FORM_ENABLED=true

# Admin token for accessing submissions
ADMIN_TOKEN=your-secure-secret-token-here
```

### Update Embed Script Domain

Edit `public/embed.js` - line 4-5:

```javascript
const EMBED_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://yourdomain.com'; // ← Update this
```

## 📡 API Endpoints

### POST `/api/contact`

Submit a new contact form.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Inc",
  "message": "I'd like to discuss your service..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "data": {
    "id": "contact-1234567890",
    "createdAt": "2024-04-17T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Please enter a valid email",
    "message": "Message must be at least 10 characters"
  }
}
```

### GET `/api/contact`

Retrieve all submissions (requires admin token).

**Request:**
```
GET /api/contact?token=your-admin-token
```

**Response:**
```json
{
  "success": true,
  "message": "Contact form submissions",
  "count": 42,
  "data": [
    {
      "id": "contact-1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Inc",
      "message": "I'd like to discuss...",
      "createdAt": "2024-04-17T10:30:00Z",
      "source": "https://example.com",
      "userAgent": "Mozilla/5.0..."
    },
    ...
  ]
}
```

### DELETE `/api/contact`

Delete a submission (requires admin token).

**Request:**
```json
{
  "id": "contact-1234567890",
  "token": "your-admin-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Submission deleted"
}
```

## 🎨 Styling

The form is styled with your brand colors:

- **Primary Color:** `#0b1957` (Deep Navy)
- **Gradient:** `linear-gradient(135deg, #0b1957 0%, #1a3a8f 100%)`
- **Typography:**
  - Headings: 'Space Grotesk'
  - Body: 'Inter'
- **Border Radius:** 10px (consistent with your design)
- **Shadows:** Subtle, professional elevation

To customize, edit `web/components/ContactFormModal.tsx` CSS section.

## ✅ Form Validation

### Client-Side Validation

- **Name:** 2+ characters
- **Email:** Valid email format
- **Company:** Optional (no validation)
- **Message:** 10+ characters

### Server-Side Validation

Same rules applied on the API route for security.

## 📊 View Submissions

### Option 1: Using Admin API

```bash
curl "http://localhost:3000/api/contact?token=your-admin-token"
```

### Option 2: Create Admin Dashboard

Create `web/src/app/admin/submissions/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      const res = await fetch(`/api/contact?token=${token}`);
      const data = await res.json();
      setSubmissions(data.data || []);
      setLoading(false);
    };
    fetchSubmissions();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Contact Form Submissions ({submissions.length})</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Company</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Message</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub: any) => (
            <tr key={sub.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}>{sub.name}</td>
              <td style={{ padding: '12px' }}>{sub.email}</td>
              <td style={{ padding: '12px' }}>{sub.company || '-'}</td>
              <td style={{ padding: '12px' }}>{sub.message.substring(0, 50)}...</td>
              <td style={{ padding: '12px' }}>
                {new Date(sub.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Access at: `http://localhost:3000/admin/submissions?token=your-admin-token`

## 🔒 Security Considerations

1. **CORS:** Currently allows all origins (`*`). Restrict in production:

   Edit `next.config.mjs`:
   ```javascript
   value: "https://yourdomain.com, https://trusted-partner.com"
   ```

2. **Admin Token:** Change from default. Store in `.env.local`:
   ```bash
   ADMIN_TOKEN=use-a-strong-random-token-here
   ```

3. **Rate Limiting:** Consider adding rate limiting to `/api/contact`

4. **Spam Protection:** Add reCAPTCHA or similar

## 🗄️ Database Integration

Currently uses in-memory storage. To use MongoDB:

1. **Install Mongoose:**
   ```bash
   npm install mongoose
   ```

2. **Create Model** (`web/src/lib/models/Contact.ts`):
   ```typescript
   import mongoose from 'mongoose';

   const contactSchema = new mongoose.Schema({
     name: String,
     email: String,
     company: String,
     message: String,
     createdAt: { type: Date, default: Date.now },
     source: String,
   });

   export const Contact = mongoose.model('Contact', contactSchema);
   ```

3. **Update API Route** (`web/src/app/api/contact/route.ts`):
   ```typescript
   import { Contact } from '@/lib/models/Contact';
   import mongoose from 'mongoose';

   export async function POST(request: NextRequest) {
     // ... validation code ...

     await mongoose.connect(process.env.MONGODB_URI!);
     const submission = await Contact.create({...});

     return NextResponse.json(...);
   }
   ```

## 📧 Email Notifications

To send email on new submissions, add this to `route.ts`:

```typescript
// After form submission
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: 'admin@yourdomain.com',
  subject: `New Contact: ${formData.name}`,
  html: `<p>${formData.message}</p><p>From: ${formData.email}</p>`,
});
```

## 🧪 Testing Locally

1. **Start dev server:**
   ```bash
   cd web && npm run dev
   ```

2. **Test the form in your app:**
   - Visit `http://localhost:3000`
   - Click the floating button
   - Fill & submit the form

3. **Test as embedded script:**
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <h1>Test Site</h1>
     <script src="http://localhost:3000/embed.js"></script>
   </body>
   </html>
   ```

4. **Check submissions:**
   ```bash
   curl "http://localhost:3000/api/contact?token=your-admin-token" | jq
   ```

## 📝 Changelog

- **v1.0** (Current)
  - ✅ Initial implementation
  - ✅ CORS-enabled embed script
  - ✅ Form validation (client + server)
  - ✅ In-memory storage
  - ✅ Admin API for submissions

## 🤝 Support

For issues or questions:
1. Check the console for error messages
2. Verify `embed.js` is accessible at `/embed.js`
3. Ensure CORS headers are set in `next.config.mjs`
4. Check `.env.local` for required variables

---

**Happy form building! 🚀**
