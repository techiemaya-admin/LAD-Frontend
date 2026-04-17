// LAD Frontend - Contact Form Embed Script
// Usage: <script src="https://yourdomain.com/embed.js"></script>

(function() {
  const EMBED_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://yourdomain.com'; // Update with your production domain

  // Create container
  const container = document.createElement('div');
  container.id = 'lad-contact-form-root';
  container.style.cssText = `
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  `;
  document.body.appendChild(container);

  // Create floating button with image
  const button = document.createElement('button');
  button.id = 'lad-contact-trigger';
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    z-index: 9999;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 4px 20px rgba(11, 25, 87, 0.4));
  `;

  // Create image element
  const img = document.createElement('img');
  img.src = EMBED_URL + '/lad.png';
  img.alt = 'Contact us';
  img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  button.appendChild(img);

  button.addEventListener('mouseover', () => {
    img.style.transform = 'scale(1.1) translateY(-5px)';
    button.style.filter = 'drop-shadow(0 8px 28px rgba(11, 25, 87, 0.5))';
  });

  button.addEventListener('mouseout', () => {
    img.style.transform = 'scale(1) translateY(0)';
    button.style.filter = 'drop-shadow(0 4px 20px rgba(11, 25, 87, 0.4))';
  });

  document.body.appendChild(button);

  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'lad-contact-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 16px;
    backdrop-filter: blur(4px);
  `;
  document.body.appendChild(backdrop);

  // Create modal content
  const modal = document.createElement('div');
  modal.id = 'lad-contact-modal';
  modal.style.cssText = `
    background-color: #fff;
    border-radius: 16px;
    padding: 40px;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(11, 25, 87, 0.15);
    position: relative;
    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  modal.innerHTML = `
    <button id="lad-close-btn" style="
      position: absolute;
      top: 24px;
      right: 24px;
      background: none;
      border: none;
      cursor: pointer;
      color: #9ca3af;
      font-size: 24px;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    ">✕</button>

    <h2 style="
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 800;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      color: #111827;
      letter-spacing: -0.02em;
    ">Get in Touch</h2>

    <p style="
      margin: 0 0 28px;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
      font-family: 'Inter', system-ui, sans-serif;
    ">Have a question or want to work together? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>

    <div id="lad-feedback" style="display: none; padding: 14px 16px; border-radius: 10px; margin-bottom: 24px; font-size: 14px; border: 1px solid; animation: fadeIn 0.3s ease;"></div>

    <form id="lad-contact-form" style="display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; flex-direction: column;">
        <label style="
          display: block;
          margin-bottom: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.01em;
        ">Full Name *</label>
        <input type="text" name="name" placeholder="John Doe" style="
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', system-ui, sans-serif;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f9fafb;
        "/>
        <span class="error" style="color: #dc2626; font-size: 12px; margin-top: 6px; display: none;"></span>
      </div>

      <div style="display: flex; flex-direction: column;">
        <label style="
          display: block;
          margin-bottom: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.01em;
        ">Email Address *</label>
        <input type="email" name="email" placeholder="john@example.com" style="
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', system-ui, sans-serif;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f9fafb;
        "/>
        <span class="error" style="color: #dc2626; font-size: 12px; margin-top: 6px; display: none;"></span>
      </div>

      <div style="display: flex; flex-direction: column;">
        <label style="
          display: block;
          margin-bottom: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.01em;
        ">Company (Optional)</label>
        <input type="text" name="company" placeholder="Your company name" style="
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', system-ui, sans-serif;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f9fafb;
        "/>
      </div>

      <div style="display: flex; flex-direction: column;">
        <label style="
          display: block;
          margin-bottom: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.01em;
        ">Message *</label>
        <textarea name="message" placeholder="Tell us how we can help..." style="
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', system-ui, sans-serif;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f9fafb;
          resize: vertical;
          min-height: 140px;
        "></textarea>
        <span class="error" style="color: #dc2626; font-size: 12px; margin-top: 6px; display: none;"></span>
      </div>

      <button type="submit" style="
        width: 100%;
        padding: 14px 20px;
        background: linear-gradient(135deg, #0b1957 0%, #1a3a8f 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'Inter', system-ui, sans-serif;
        box-shadow: 0 4px 12px rgba(11, 25, 87, 0.25);
      ">✓ Send Message</button>

      <p style="
        margin: 0;
        font-size: 12px;
        color: #9ca3af;
        text-align: center;
        font-family: 'Inter', system-ui, sans-serif;
      ">We typically respond within 24 hours</p>
    </form>
  `;

  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  modal.addEventListener('click', (e) => e.stopPropagation());

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    #lad-contact-backdrop input:focus,
    #lad-contact-backdrop textarea:focus {
      outline: none;
      border-color: #0b1957 !important;
      background: #fff !important;
      box-shadow: 0 0 0 4px rgba(11, 25, 87, 0.08), 0 2px 8px rgba(11, 25, 87, 0.1) !important;
    }
    #lad-contact-backdrop input::placeholder,
    #lad-contact-backdrop textarea::placeholder {
      color: #9ca3af;
    }
    #lad-close-btn:hover {
      color: #111827;
      background: #f3f4f6;
    }
    #lad-contact-form button[type="submit"]:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(11, 25, 87, 0.35) !important;
    }
    #lad-contact-form button[type="submit"]:active:not(:disabled) {
      transform: translateY(0);
    }
    #lad-contact-form button[type="submit"]:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    #lad-feedback.success {
      background: #dcfce7;
      color: #166534;
      border-color: #bbf7d0;
    }
    #lad-feedback.error {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fecaca;
    }
  `;
  document.head.appendChild(style);

  // Form handling functions
  function openModal() {
    backdrop.style.display = 'flex';
  }

  function closeModal() {
    backdrop.style.display = 'none';
    resetForm();
  }

  function resetForm() {
    document.getElementById('lad-contact-form').reset();
    const errors = document.querySelectorAll('#lad-contact-modal .error');
    errors.forEach(e => e.style.display = 'none');
    const feedback = document.getElementById('lad-feedback');
    feedback.style.display = 'none';
  }

  function showFeedback(type, message) {
    const feedback = document.getElementById('lad-feedback');
    feedback.textContent = message;
    feedback.className = type;
    feedback.style.display = 'block';
  }

  function validateForm() {
    const form = document.getElementById('lad-contact-form');
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    let isValid = true;
    const errors = {};

    if (!name) {
      errors.name = 'Name is required';
      isValid = false;
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (!email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!message) {
      errors.message = 'Message is required';
      isValid = false;
    } else if (message.length < 10) {
      errors.message = 'Message must be at least 10 characters';
      isValid = false;
    }

    // Display errors
    form.querySelectorAll('.error').forEach(e => e.style.display = 'none');
    Object.keys(errors).forEach(field => {
      const errorEl = form[field].parentElement.querySelector('.error');
      if (errorEl) {
        errorEl.textContent = '⚠️ ' + errors[field];
        errorEl.style.display = 'block';
      }
    });

    return isValid;
  }

  // Form submission
  document.getElementById('lad-contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const form = document.getElementById('lad-contact-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '✓ Sending...';

    const formData = {
      name: form.name.value,
      email: form.email.value,
      company: form.company.value || 'Not provided',
      message: form.message.value,
    };

    // Log form submission details
    console.log('📝 Contact Form Submitted:', {
      timestamp: new Date().toISOString(),
      source: 'Embed Script (External Website)',
      formData: formData,
      sourceUrl: window.location.href,
      userAgent: navigator.userAgent,
      embedUrl: EMBED_URL,
    });

    try {
      const response = await fetch(EMBED_URL + '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit form');
      }

      console.log('✅ Form submission successful:', {
        submissionId: data.data?.id,
        timestamp: data.data?.createdAt,
        response: data,
      });

      showFeedback('success', '✅ Thank you! We received your message and will get back to you shortly.');
      resetForm();

      setTimeout(() => {
        closeModal();
      }, 4000);
    } catch (error) {
      console.error('❌ Form submission error:', {
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
        formData: formData,
      });
      showFeedback('error', '⚠️ ' + (error.message || 'Failed to send message. Please try again.'));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '✓ Send Message';
    }
  });

  // Close button handler
  document.getElementById('lad-close-btn').addEventListener('click', closeModal);

  // Global functions for modal control
  window.LADContact = {
    open: openModal,
    close: closeModal
  };

  // Handle button click
  button.addEventListener('click', openModal);

  console.log('LAD Contact Form embed loaded. Use window.LADContact.open() to trigger.');
})();
