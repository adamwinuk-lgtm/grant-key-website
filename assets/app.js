/* The Grant Key — site behaviour.
   Moved out of an inline <script> so the page can run a Content-Security-Policy
   with script-src 'self' (no 'unsafe-inline'). No inline event handlers remain
   in index.html; everything is wired up here via event delegation. */
(function () {
  'use strict';

  function goTo(pageName) {
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-page') === pageName);
    });
    document.querySelectorAll('.navbtn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-page') === pageName);
    });
    var navlinks = document.getElementById('navlinks');
    if (navlinks) { navlinks.classList.remove('open'); }
    window.scrollTo(0, 0);
    initReveal();
  }

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  function initReveal() {
    var selector = '.step-card, .grant-card, .ask-item, .fund-col, .catch-box, .alert-box, .contact-box, .local-note, .about-wrap, .trust-note';
    var active = document.querySelector('.page.active');
    if (!active) { return; }
    active.querySelectorAll(selector).forEach(function (el) {
      if (!el.classList.contains('reveal')) { el.classList.add('reveal'); }
      revealObserver.observe(el);
    });
  }

  function submitContactForm(event) {
    event.preventDefault();
    var form = document.getElementById('contactForm');
    var status = document.getElementById('cf-status');
    var submitBtn = document.getElementById('cf-submit');

    // Guard against submitting to the unconfigured placeholder endpoint.
    if (!form.action || form.action.indexOf('YOUR_FORM_ID') !== -1) {
      status.textContent = 'This form isn’t connected yet — please email hello@thegrantkey.com directly.';
      status.className = 'form-status error';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    status.textContent = '';
    status.className = 'form-status';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function (res) {
      if (res.ok) {
        status.textContent = "Thanks — I've got your info and will follow up within a few days.";
        status.className = 'form-status success';
        form.reset();
      } else {
        throw new Error('submission failed');
      }
    }).catch(function () {
      status.textContent = 'Something went wrong sending that — please email hello@thegrantkey.com directly instead.';
      status.className = 'form-status error';
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Unlock My Grant Matches';
    });
  }

  // --- wiring (replaces the old inline on* attributes) ---

  document.addEventListener('click', function (event) {
    var goer = event.target.closest('[data-goto]');
    if (goer) {
      event.preventDefault();
      goTo(goer.getAttribute('data-goto'));
      return;
    }

    var navbtn = event.target.closest('.navbtn');
    if (navbtn && navbtn.getAttribute('data-page')) {
      event.preventDefault();
      goTo(navbtn.getAttribute('data-page'));
      return;
    }

    if (event.target.closest('#menuBtn')) {
      var navlinks = document.getElementById('navlinks');
      if (navlinks) { navlinks.classList.toggle('open'); }
    }
  });

  var contactForm = document.getElementById('contactForm');
  if (contactForm) { contactForm.addEventListener('submit', submitContactForm); }

  initReveal();
})();
