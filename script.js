// ============================================
// Sally + Haley | Wedding Site
// ============================================

// Countdown Timer - March 20, 2027 4:00 PM EST
const weddingDate = new Date('2027-03-20T16:00:00-05:00');

function updateCountdown() {
  const now = new Date();
  const diff = weddingDate - now;

  if (diff <= 0) {
    document.getElementById('days').textContent = '0';
    document.getElementById('hours').textContent = '0';
    document.getElementById('minutes').textContent = '0';
    document.getElementById('seconds').textContent = '0';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = days;
  document.getElementById('hours').textContent = hours;
  document.getElementById('minutes').textContent = minutes;
  document.getElementById('seconds').textContent = seconds;
}

updateCountdown();
setInterval(updateCountdown, 1000);

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// Mobile menu toggle
const navToggle = document.querySelector('.nav-toggle');
const mobileMenu = document.getElementById('mobileMenu');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
    });
  });
}

// RSVP Form
const rsvpForm = document.getElementById('rsvpForm');
const guestCountGroup = document.getElementById('guestCountGroup');

// Show/hide guest count based on attendance
document.querySelectorAll('input[name="attending"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    guestCountGroup.style.display = e.target.value === 'yes' ? 'block' : 'none';
  });
});

if (rsvpForm) {
  rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(rsvpForm);
    const data = Object.fromEntries(formData);
    console.log('RSVP submitted:', data);

    // Show success message
    rsvpForm.style.display = 'none';
    document.getElementById('rsvpSuccess').style.display = 'block';
  });
}

// Scroll-triggered fade-in animations
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Apply to sections
document.querySelectorAll('.story, .song, .details, .greensboro, .rsvp, .countdown').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
