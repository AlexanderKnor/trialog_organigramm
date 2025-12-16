/**
 * Screen: LoginScreen
 * Authentication screen for user login
 */

import { createElement, clearElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';

// Authorized admin emails for self-registration
const AUTHORIZED_ADMIN_EMAILS = [
  'alexander-knor@outlook.de',
  'info@trialog-makler.de',
  'buchhaltung@trialog-makler.de',
  'liebetrau@trialog-makler.de',
  'lippa@trialog-makler.de',
];

export class LoginScreen {
  #element;
  #container;
  #onLoginSuccess;

  constructor(container, onLoginSuccess) {
    this.#container = typeof container === 'string' ? document.querySelector(container) : container;
    this.#onLoginSuccess = onLoginSuccess;
    this.#element = this.#render();
  }

  #render() {
    const loginCard = createElement('div', { className: 'login-card' }, [
      // Logo
      createElement('div', { className: 'login-logo' }, [
        createElement('div', { className: 'logo-company' }, [
          createElement('span', { className: 'logo-text' }, ['Trialog']),
          createElement('span', { className: 'logo-company-type' }, ['Makler Gruppe']),
        ]),
      ]),

      // Form
      createElement('form', {
        className: 'login-form',
        onsubmit: (e) => this.#handleSubmit(e),
      }, [
        // Email input
        createElement('div', { className: 'form-group' }, [
          createElement('label', { className: 'form-label', for: 'email' }, ['E-Mail']),
          createElement('input', {
            className: 'form-input',
            type: 'email',
            id: 'email',
            name: 'email',
            required: true,
            autocomplete: 'email',
            placeholder: 'ihre.email@trialog.de',
          }),
        ]),

        // Password input
        createElement('div', { className: 'form-group' }, [
          createElement('label', { className: 'form-label', for: 'password' }, ['Passwort']),
          createElement('input', {
            className: 'form-input',
            type: 'password',
            id: 'password',
            name: 'password',
            required: true,
            autocomplete: 'current-password',
            placeholder: '••••••••',
          }),
        ]),

        // Error message
        createElement('div', { className: 'form-error', style: 'display: none;' }),

        // Submit button
        createElement('button', {
          className: 'btn btn-primary btn-block',
          type: 'submit',
        }, ['Anmelden']),
      ]),

      // Footer
      createElement('div', { className: 'login-footer' }, [
        createElement('p', { className: 'login-footer-text' }, [
          'Noch kein Account? ',
          createElement('a', {
            href: '#',
            className: 'login-link',
            onclick: (e) => {
              e.preventDefault();
              this.#showRegisterForm();
            },
          }, ['Registrieren']),
        ]),
      ]),
    ]);

    return createElement('div', { className: 'login-screen' }, [loginCard]);
  }

  async #handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = form.querySelector('.form-error');

    // Clear previous error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Anmelden...';

    try {
      const result = await authService.login(email, password);

      if (result.success) {
        // Success - onLoginSuccess callback will be triggered by auth state change
        console.log('Login successful');
      } else {
        // Show error
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Anmelden';
      }
    } catch (error) {
      errorDiv.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Anmelden';
    }
  }

#showRegisterForm() {
    // Smooth transition to registration form
    const loginCard = this.#element.querySelector('.login-card');

    // Fade-out current content
    loginCard.style.opacity = '0';
    loginCard.style.transform = 'translateX(-20px)';
    loginCard.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

    setTimeout(() => {
      clearElement(loginCard);

    loginCard.appendChild(
      createElement('div', {}, [
        // Logo
        createElement('div', { className: 'login-logo' }, [
          createElement('div', { className: 'logo-company' }, [
            createElement('span', { className: 'logo-text' }, ['Trialog']),
            createElement('span', { className: 'logo-company-type' }, ['Makler Gruppe']),
          ]),
          createElement('div', { className: 'logo-action-label' }, ['Registrierung']),
        ]),

        // Form
        createElement('form', {
          className: 'login-form',
          onsubmit: (e) => this.#handleRegister(e),
        }, [
          // Email input
          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label', for: 'reg-email' }, ['E-Mail']),
            createElement('input', {
              className: 'form-input',
              type: 'email',
              id: 'reg-email',
              name: 'email',
              required: true,
              autocomplete: 'email',
              placeholder: 'ihre.email@trialog.de',
            }),
          ]),

          // Password input
          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label', for: 'reg-password' }, ['Passwort']),
            createElement('input', {
              className: 'form-input',
              type: 'password',
              id: 'reg-password',
              name: 'password',
              required: true,
              autocomplete: 'new-password',
              placeholder: 'Mindestens 6 Zeichen',
            }),
          ]),

          // Error message
          createElement('div', { className: 'form-error', style: 'display: none;' }),

          // Submit button
          createElement('button', {
            className: 'btn btn-primary btn-block',
            type: 'submit',
          }, ['Registrieren']),
        ]),

        // Footer
        createElement('div', { className: 'login-footer' }, [
          createElement('p', { className: 'login-footer-text' }, [
            'Bereits registriert? ',
            createElement('a', {
              href: '#',
              className: 'login-link',
              onclick: (e) => {
                e.preventDefault();
                this.#showLoginForm();
              },
            }, ['Anmelden']),
          ]),
        ]),
      ])
    );

      // Fade-in new content
      requestAnimationFrame(() => {
        loginCard.style.opacity = '0';
        loginCard.style.transform = 'translateX(20px)';
        requestAnimationFrame(() => {
          loginCard.style.opacity = '1';
          loginCard.style.transform = 'translateX(0)';
        });
      });
    }, 250);
  }

  #showLoginForm() {
    // Smooth transition to login form
    const loginCard = this.#element.querySelector('.login-card');

    // Fade-out current content
    loginCard.style.opacity = '0';
    loginCard.style.transform = 'translateX(20px)';
    loginCard.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

    setTimeout(() => {
      this.mount(); // Re-render to show login form

      // Fade-in new content
      requestAnimationFrame(() => {
        loginCard.style.opacity = '0';
        loginCard.style.transform = 'translateX(-20px)';
        requestAnimationFrame(() => {
          loginCard.style.opacity = '1';
          loginCard.style.transform = 'translateX(0)';
        });
      });
    }, 250);
  }

async #handleRegister(e) {
    e.preventDefault();

    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = form.querySelector('.form-error');

    // Clear previous error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // SECURITY: Validate that email is authorized admin email
    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some(
      adminEmail => adminEmail.toLowerCase() === normalizedEmail
    );

    if (!isAuthorized) {
      errorDiv.textContent = '⚠️ Unbefugter Zugriff verweigert.\n\nNur autorisierte Administrator-E-Mail-Adressen dürfen sich registrieren.\n\nMitarbeiter-Accounts werden ausschließlich durch Administratoren im Organigramm angelegt.';
      errorDiv.style.display = 'block';
      errorDiv.style.whiteSpace = 'pre-line';
      console.warn(`🚫 Unauthorized registration attempt: ${email}`);
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrierung läuft...';

    try {
      const result = await authService.register(email, password);

      if (result.success) {
        // Success - will be logged in automatically
        console.log('✓ Admin registration successful:', email);
      } else {
        // Show error
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrieren';
      }
    } catch (error) {
      errorDiv.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Registrieren';
    }
  }

  mount() {
    clearElement(this.#container);
    this.#element = this.#render();
    this.#container.appendChild(this.#element);

    // Focus email input
    setTimeout(() => {
      const emailInput = this.#element.querySelector('#email');
      if (emailInput) emailInput.focus();
    }, 100);
  }

  unmount() {
    if (this.#element && this.#element.parentNode) {
      this.#element.parentNode.removeChild(this.#element);
    }
  }
}
