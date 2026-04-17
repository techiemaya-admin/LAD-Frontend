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

  // Create floating button
  const button = document.createElement('button');
  button.id = 'lad-contact-trigger';
  button.innerHTML = '💬 Get in Touch';
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #0b1957 0%, #1a3a8f 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(11, 25, 87, 0.4);
    z-index: 9999;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  `;

  button.addEventListener('mouseover', () => {
    button.style.transform = 'translateY(-3px)';
    button.style.boxShadow = '0 8px 28px rgba(11, 25, 87, 0.5)';
  });

  button.addEventListener('mouseout', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 20px rgba(11, 25, 87, 0.4)';
  });

  document.body.appendChild(button);

  // Global functions for modal control
  window.LADContact = {
    open: function() {
      window.dispatchEvent(new CustomEvent('lad-contact-open'));
    },
    close: function() {
      window.dispatchEvent(new CustomEvent('lad-contact-close'));
    }
  };

  // Handle button click
  button.addEventListener('click', () => {
    window.LADContact.open();
  });

  console.log('LAD Contact Form embed loaded. Use window.LADContact.open() to trigger.');
})();
