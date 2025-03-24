document.addEventListener('DOMContentLoaded', function() {
  // Mobile navigation toggle
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger) {
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
  }

  // Theme toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;

  // Check for saved theme preference, default to light theme
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  } else {
    // If no saved preference, default to light theme
    const initialTheme = 'light';
    htmlElement.setAttribute('data-theme', initialTheme);
    localStorage.setItem('theme', initialTheme); // Save the default preference
    updateThemeIcon(initialTheme);
  }

  // Toggle theme on click
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const currentTheme = htmlElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      htmlElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }

  // Update theme icon based on current theme
  function updateThemeIcon(theme) {
    if (!themeToggle) return;

    if (theme === 'dark') {
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      themeToggle.setAttribute('aria-label', 'Switch to light theme');
      themeToggle.setAttribute('title', 'Switch to light theme');
    } else {
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      themeToggle.setAttribute('aria-label', 'Switch to dark theme');
      themeToggle.setAttribute('title', 'Switch to dark theme');
    }
  }

  // Tabs functionality
  const tabButtons = document.querySelectorAll('.tab-btn');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Get the tab to show
      const tabId = this.getAttribute('data-tab');

      // Hide all tabs
      const tabPanes = document.querySelectorAll('.tab-pane');
      tabPanes.forEach(tab => tab.classList.remove('active'));

      // Show the selected tab
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Accordion functionality
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const accordionItem = this.parentElement;
      accordionItem.classList.toggle('active');
    });
  });

  // Copy to clipboard functionality
  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const codeBlock = this.closest('.code-block').querySelector('code');

      // Create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = codeBlock.textContent;
      document.body.appendChild(textarea);

      // Select and copy
      textarea.select();
      document.execCommand('copy');

      // Remove the textarea
      document.body.removeChild(textarea);

      // Visual feedback
      this.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => {
        this.innerHTML = '<i class="fas fa-copy"></i>';
      }, 2000);
    });
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      if (this.getAttribute('href') !== '#') {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
          // Close mobile menu if open
          if (navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
          }

          // Scroll to the element
          window.scrollTo({
            top: targetElement.offsetTop - 80, // Account for header height
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Highlight active nav link based on scroll position
  const sections = document.querySelectorAll('section[id]');

  function highlightNavLink() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      const sectionId = section.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        document.querySelector(`.nav-links a[href="#${sectionId}"]`)?.classList.add('active');
      } else {
        document.querySelector(`.nav-links a[href="#${sectionId}"]`)?.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', highlightNavLink);

  // Add animations on scroll
  const animateElements = document.querySelectorAll('.feature-card, .step, .accordion-item');

  function checkIfInView() {
    animateElements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (elementTop < windowHeight - 100) {
        element.classList.add('animate');
      }
    });
  }

  // Initial check on page load
  checkIfInView();

  // Check on scroll
  window.addEventListener('scroll', checkIfInView);

  // Image gallery overlays
  const screenshotImages = document.querySelectorAll('.step-content img');

  screenshotImages.forEach(image => {
    image.addEventListener('click', function() {
      const overlay = document.createElement('div');
      overlay.className = 'image-overlay';

      const imgClone = this.cloneNode();
      overlay.appendChild(imgClone);

      document.body.appendChild(overlay);

      overlay.addEventListener('click', function() {
        document.body.removeChild(overlay);
      });
    });
  });
});