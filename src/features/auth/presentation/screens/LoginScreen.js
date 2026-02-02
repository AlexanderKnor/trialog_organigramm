/**
 * Screen: LoginScreen
 * Authentication screen for user login
 */

import { createElement, clearElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';
import { Logger } from './../../../../core/utils/logger.js';

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
            title: '',
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
            title: '',
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

      // Footer with links
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
        createElement('p', { className: 'login-footer-text login-footer-secondary' }, [
          createElement('a', {
            href: '#',
            className: 'login-link',
            onclick: (e) => {
              e.preventDefault();
              this.#showForgotPasswordForm();
            },
          }, ['Passwort vergessen?']),
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
        Logger.log('Login successful');
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
                title: '',
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
                placeholder: 'Passwort wählen',
                title: '',
              }),
            ]),

            // Password confirmation input
            createElement('div', { className: 'form-group' }, [
              createElement('label', { className: 'form-label', for: 'reg-password-confirm' }, ['Passwort wiederholen']),
              createElement('input', {
                className: 'form-input',
                type: 'password',
                id: 'reg-password-confirm',
                name: 'passwordConfirm',
                required: true,
                autocomplete: 'new-password',
                placeholder: 'Passwort bestätigen',
                title: '',
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
      const newLoginCard = this.#element.querySelector('.login-card');

      // Disable default animation
      newLoginCard.style.animation = 'none';

      requestAnimationFrame(() => {
        newLoginCard.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        newLoginCard.style.opacity = '0';
        newLoginCard.style.transform = 'translateX(20px)';

        requestAnimationFrame(() => {
          newLoginCard.style.opacity = '1';
          newLoginCard.style.transform = 'translateX(0)';
        });
      });
    }, 250);
  }

  #showForgotPasswordForm() {
    // Smooth transition to forgot password form
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
            createElement('div', { className: 'logo-action-label' }, ['Passwort zurücksetzen']),
          ]),

          // Info text
          createElement('p', { className: 'login-info-text' }, [
            'Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen Ihres Passworts.',
          ]),

          // Form
          createElement('form', {
            className: 'login-form',
            onsubmit: (e) => this.#handleForgotPassword(e),
          }, [
            // Email input
            createElement('div', { className: 'form-group' }, [
              createElement('label', { className: 'form-label', for: 'reset-email' }, ['E-Mail']),
              createElement('input', {
                className: 'form-input',
                type: 'email',
                id: 'reset-email',
                name: 'email',
                required: true,
                autocomplete: 'email',
                placeholder: 'ihre.email@trialog.de',
                title: '',
              }),
            ]),

            // Success/Error message
            createElement('div', { className: 'form-error', style: 'display: none;' }),
            createElement('div', { className: 'form-success', style: 'display: none;' }),

            // Submit button
            createElement('button', {
              className: 'btn btn-primary btn-block',
              type: 'submit',
            }, ['Link anfordern']),
          ]),

          // Footer
          createElement('div', { className: 'login-footer' }, [
            createElement('p', { className: 'login-footer-text' }, [
              createElement('a', {
                href: '#',
                className: 'login-link',
                onclick: (e) => {
                  e.preventDefault();
                  this.#showLoginForm();
                },
              }, ['Zurück zur Anmeldung']),
            ]),
          ]),
        ])
      );

      // Fade-in new content
      const newLoginCard = this.#element.querySelector('.login-card');
      newLoginCard.style.animation = 'none';

      requestAnimationFrame(() => {
        newLoginCard.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        newLoginCard.style.opacity = '0';
        newLoginCard.style.transform = 'translateX(20px)';

        requestAnimationFrame(() => {
          newLoginCard.style.opacity = '1';
          newLoginCard.style.transform = 'translateX(0)';
        });
      });
    }, 250);
  }

  async #handleForgotPassword(e) {
    e.preventDefault();

    const form = e.target;
    const email = form.email.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = form.querySelector('.form-error');
    const successDiv = form.querySelector('.form-success');

    // Clear previous messages
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    successDiv.style.display = 'none';
    successDiv.textContent = '';

    // Validate email
    if (!email) {
      errorDiv.textContent = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
      errorDiv.style.display = 'block';
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet...';

    try {
      const result = await authService.requestPasswordReset(email);

      if (result.success) {
        // Show success message
        successDiv.innerHTML = `
          <strong>E-Mail gesendet!</strong><br><br>
          Falls ein Account mit dieser E-Mail existiert, erhalten Sie in Kürze eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.<br><br>
          <em>Bitte prüfen Sie auch Ihren Spam-Ordner.</em>
        `;
        successDiv.style.display = 'block';
        successDiv.style.whiteSpace = 'normal';

        // Hide form elements
        form.email.disabled = true;
        submitBtn.style.display = 'none';

        Logger.log('Password reset email requested for:', email);
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Link anfordern';
      }
    } catch (error) {
      errorDiv.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Link anfordern';
    }
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

      const newLoginCard = this.#element.querySelector('.login-card');

      // Disable default animation
      newLoginCard.style.animation = 'none';

      // Fade-in new content
      requestAnimationFrame(() => {
        newLoginCard.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        newLoginCard.style.opacity = '0';
        newLoginCard.style.transform = 'translateX(-20px)';

        requestAnimationFrame(() => {
          newLoginCard.style.opacity = '1';
          newLoginCard.style.transform = 'translateX(0)';
        });
      });
    }, 250);
  }

  async #handleRegister(e) {
    e.preventDefault();

    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const passwordConfirm = form.passwordConfirm.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = form.querySelector('.form-error');

    // Clear previous error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Validate passwords match
    if (password !== passwordConfirm) {
      errorDiv.textContent = '⚠️ Passwörter stimmen nicht überein.\n\nBitte stellen Sie sicher, dass beide Passwort-Felder identisch sind.';
      errorDiv.style.display = 'block';
      errorDiv.style.whiteSpace = 'pre-line';
      return;
    }

    // Validate password strength
    const passwordValidation = this.#validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      errorDiv.textContent = passwordValidation.error;
      errorDiv.style.display = 'block';
      errorDiv.style.whiteSpace = 'pre-line';
      return;
    }

    // SECURITY: Validate that email is authorized admin email
    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some(
      adminEmail => adminEmail.toLowerCase() === normalizedEmail
    );

    if (!isAuthorized) {
      errorDiv.textContent = '⚠️ Unbefugter Zugriff verweigert.\n\nNur autorisierte Administrator-E-Mail-Adressen dürfen sich registrieren.\n\nMitarbeiter-Accounts werden ausschließlich durch Administratoren im Organigramm angelegt.';
      errorDiv.style.display = 'block';
      errorDiv.style.whiteSpace = 'pre-line';
      Logger.warn(`🚫 Unauthorized registration attempt: ${email}`);
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrierung läuft...';

    try {
      const result = await authService.register(email, password);

      if (result.success) {
        // Success - will be logged in automatically
        Logger.log('✓ Admin registration successful:', email);
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

  #validatePasswordStrength(password) {
    const errors = [];

    // Minimum length
    if (password.length < 8) {
      errors.push('• Mindestens 8 Zeichen');
    }

    // Uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('• Mindestens 1 Großbuchstabe (A-Z)');
    }

    // Lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('• Mindestens 1 Kleinbuchstabe (a-z)');
    }

    // Number
    if (!/[0-9]/.test(password)) {
      errors.push('• Mindestens 1 Zahl (0-9)');
    }

    // Special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('• Mindestens 1 Sonderzeichen (!@#$%^&*...)');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: `⚠️ Passwort erfüllt nicht alle Sicherheitsanforderungen:\n\n${errors.join('\n')}\n\nBitte wählen Sie ein sicheres Passwort.`,
      };
    }

    return { valid: true };
  }

  unmount() {
    if (this.#element && this.#element.parentNode) {
      this.#element.parentNode.removeChild(this.#element);
    }
  }
}
