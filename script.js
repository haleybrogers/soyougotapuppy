// ============================================
// Sally + Haley | Wedding Site
// ============================================

// Scroll to top on page load (prevents mobile refresh landing mid-page)
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

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

    const submitBtn = rsvpForm.querySelector('.btn-submit');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    const formData = new FormData(rsvpForm);

    // Send to Formspree — replace YOUR_FORM_ID with your Formspree form ID
    fetch('https://formspree.io/f/xgopnjlq', {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
    .then(response => {
      if (response.ok) {
        rsvpForm.style.display = 'none';
        document.getElementById('rsvpSuccess').style.display = 'block';
      } else {
        throw new Error('Form submission failed');
      }
    })
    .catch(() => {
      submitBtn.textContent = 'Send your reply';
      submitBtn.disabled = false;
      alert('Something went wrong — please try again!');
    });
  });
}

// Desktop: no fade-in animations — content is always visible
// Mobile gets its own scroll-snap animations below

// Mobile slide-in animations
if (window.innerWidth <= 768) {
  const mobileSlides = document.querySelectorAll(
    '.scroll-visual-intro, .scroll-visual, .quiz-cta-section, .details .container, .countdown .container, .greensboro .container, .rsvp .container'
  );

  // Add m-slide class to each slide's children for staggered animation
  mobileSlides.forEach(slide => {
    const children = slide.querySelectorAll(
      '.scroll-visual-inner, .mobile-text, .intro-sticky, .section-title, .section-subtitle, .details-grid, .countdown-timer, .countdown-label, .places-grid, .rsvp-form, .scroll-footer-headline, .scroll-footer-sub, .quiz-cta-mini, .pickle-egg'
    );
    children.forEach((child, i) => {
      child.classList.add('m-slide');
      if (i > 0) child.classList.add('m-slide-delay-' + Math.min(i, 3));
    });
    // If no children matched, animate the slide itself
    if (children.length === 0) {
      slide.classList.add('m-slide');
    }
  });

  const mobileObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Animate all m-slide elements within this section
        entry.target.querySelectorAll('.m-slide').forEach(el => {
          el.classList.add('m-visible');
        });
        if (entry.target.classList.contains('m-slide')) {
          entry.target.classList.add('m-visible');
        }
      }
    });
  }, { threshold: 0.05 });

  mobileSlides.forEach(slide => mobileObserver.observe(slide));
}

// Scrollytelling — Us section (split screen)
const scrollTextFrames = document.querySelectorAll('.scroll-text-frame');
const scrollVisuals = document.querySelectorAll('.scroll-visual');
const introPanel = document.querySelector('.scroll-visual-intro');
const labelHaley = document.getElementById('labelHaley');
const labelSally = document.getElementById('labelSally');

function updateScrollStory() {
  if (!introPanel) return;

  const viewMid = window.innerHeight / 2;
  let activeFrame = '0';

  // Check intro panel first (3 phases: 0, 1, 1b)
  const introRect = introPanel.getBoundingClientRect();
  let inIntro = false;

  if (introRect.bottom > viewMid) {
    inIntro = true;
    const scrolled = Math.max(0, -introRect.top);
    const scrollable = introRect.height - window.innerHeight;
    const progress = scrollable > 0 ? Math.max(0, Math.min(1, scrolled / scrollable)) : 0;
    if (progress < 0.35) {
      activeFrame = '0';
    } else if (progress < 0.65) {
      activeFrame = '1';
    } else {
      activeFrame = '1b';
    }
  }

  // Regular visual panels (only if past intro)
  if (!inIntro) {
    scrollVisuals.forEach(v => {
      const rect = v.getBoundingClientRect();
      if (rect.top < viewMid && rect.bottom > 0) {
        activeFrame = v.dataset.frame;
      }
    });
  }

  // Update text
  scrollTextFrames.forEach(f => f.classList.remove('active'));
  const activeText = document.querySelector(`.scroll-text-frame[data-frame="${activeFrame}"]`);
  if (activeText) activeText.classList.add('active');

  // Show/hide name labels + animate arrows
  if (labelHaley && labelSally) {
    if (activeFrame === '1' || activeFrame === '1b') {
      labelHaley.classList.add('show');
      labelSally.classList.add('show');
    } else {
      labelHaley.classList.remove('show');
      labelSally.classList.remove('show');
    }
  }
}

window.addEventListener('scroll', updateScrollStory);
updateScrollStory();

// U-Haul drives across footer when it comes into view
const uhaul = document.getElementById('uhaul');
if (uhaul) {
  const uhaulObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        uhaul.style.animation = 'driveAcross 6s ease-in-out forwards';
        uhaulObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  uhaulObserver.observe(document.querySelector('.footer'));
}

// Card overlay expand
const cardOverlay = document.getElementById('cardOverlay');
const cardOverlayContent = document.getElementById('cardOverlayContent');
const cardOverlayClose = document.getElementById('cardOverlayClose');

document.querySelectorAll('.detail-card, .place-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') return;
    const clone = card.cloneNode(true);
    cardOverlayContent.innerHTML = '';
    cardOverlayContent.appendChild(clone);
    cardOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
});

if (cardOverlayClose) {
  cardOverlayClose.addEventListener('click', () => {
    cardOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
}

if (cardOverlay) {
  cardOverlay.addEventListener('click', (e) => {
    if (e.target === cardOverlay) {
      cardOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cardOverlay.classList.contains('active')) {
      cardOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

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
