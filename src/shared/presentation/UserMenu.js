/**
 * Organism: UserMenu
 * The account dropdown in the portal shell header: avatar trigger, catalog
 * shortcut for admins, password change and logout. Reuses the .user-menu /
 * .change-password-dialog styling the org screen established (restyled for the
 * light shell header in portal-shell.css), so both headers read as one system.
 */

import { createElement } from '../../core/utils/index.js';
import { authService } from '../../core/auth/index.js';

export class UserMenu {
  #element;
  #closeHandler = null;

  constructor() {
    this.#element = this.#render();
  }

  #render() {
    const user = authService.getCurrentUser();
    const isAdmin = authService.isAdmin();
    const displayName = user?.displayName || (user?.email || 'User').split('@')[0];

    const dropdownItems = [];

    if (isAdmin) {
      dropdownItems.push(
        createElement(
          'button',
          { className: 'user-menu-item', onclick: () => window.navigateToCatalog() },
          ['Katalog verwalten']
        )
      );
    }

    dropdownItems.push(
      createElement(
        'button',
        { className: 'user-menu-item', onclick: () => this.#showChangePasswordDialog() },
        ['Passwort ändern']
      ),
      createElement('div', { className: 'user-menu-divider' }),
      createElement(
        'button',
        { className: 'user-menu-item user-menu-logout', onclick: () => this.#handleLogout() },
        ['Abmelden']
      )
    );

    return createElement('div', { className: 'user-menu' }, [
      createElement(
        'button',
        { className: 'user-menu-trigger', onclick: (e) => this.#toggle(e) },
        [
          createElement('span', { className: 'user-avatar' }, [
            displayName.charAt(0).toUpperCase(),
          ]),
          createElement('span', { className: 'user-name' }, [displayName]),
          isAdmin ? createElement('span', { className: 'user-badge' }, ['Admin']) : null,
          createElement('span', { className: 'user-menu-arrow' }),
        ].filter(Boolean)
      ),
      createElement('div', { className: 'user-menu-dropdown' }, dropdownItems),
    ]);
  }

  #toggle(event) {
    event.stopPropagation();
    const isOpen = this.#element.classList.contains('open');

    if (isOpen) {
      this.#close();
      return;
    }

    this.#element.classList.add('open');
    this.#closeHandler = () => this.#close();
    setTimeout(() => document.addEventListener('click', this.#closeHandler), 0);
  }

  #close() {
    this.#element.classList.remove('open');

    if (this.#closeHandler) {
      document.removeEventListener('click', this.#closeHandler);
      this.#closeHandler = null;
    }
  }

  #showChangePasswordDialog() {
    this.#close();

    const overlay = createElement('div', { className: 'dialog-overlay' }, [
      createElement('div', { className: 'change-password-dialog' }, [
        createElement('div', { className: 'dialog-header' }, [
          createElement('h2', { className: 'dialog-title' }, ['Passwort ändern']),
          createElement('button', { className: 'dialog-close', onclick: () => overlay.remove() }, [
            '×',
          ]),
        ]),
        createElement(
          'form',
          {
            className: 'change-password-form',
            onsubmit: async (e) => {
              e.preventDefault();
              await this.#handlePasswordChange(e.target, overlay);
            },
          },
          [
            createElement('p', { className: 'dialog-description' }, [
              'Geben Sie Ihr aktuelles Passwort und das neue Passwort ein.',
            ]),
            this.#createPasswordField('Aktuelles Passwort', 'currentPassword', 'current-password'),
            this.#createPasswordField(
              'Neues Passwort',
              'newPassword',
              'new-password',
              'Mind. 8 Zeichen, Groß-/Kleinbuchstaben, Zahl, Sonderzeichen'
            ),
            this.#createPasswordField('Neues Passwort bestätigen', 'confirmPassword', 'new-password'),
            createElement('div', { className: 'form-error', style: 'display: none;' }),
            createElement('div', { className: 'form-success', style: 'display: none;' }),
            createElement('div', { className: 'dialog-actions' }, [
              createElement(
                'button',
                { className: 'btn btn-ghost', type: 'button', onclick: () => overlay.remove() },
                ['Abbrechen']
              ),
              createElement('button', { className: 'btn btn-primary', type: 'submit' }, [
                'Passwort ändern',
              ]),
            ]),
          ]
        ),
      ]),
    ]);

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('input')?.focus(), 100);
  }

  #createPasswordField(label, name, autocomplete, hint = null) {
    return createElement('div', { className: 'form-group' }, [
      createElement('label', { className: 'form-label' }, [label]),
      createElement('input', {
        className: 'form-input',
        type: 'password',
        name,
        required: true,
        autocomplete,
      }),
      hint ? createElement('small', { className: 'form-hint' }, [hint]) : null,
    ].filter(Boolean));
  }

  async #handlePasswordChange(form, overlay) {
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = form.querySelector('.form-error');
    const successDiv = form.querySelector('.form-success');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (newPassword !== confirmPassword) {
      errorDiv.textContent = 'Die neuen Passwörter stimmen nicht überein.';
      errorDiv.style.display = 'block';
      return;
    }

    const validation = this.#validatePasswordStrength(newPassword);
    if (!validation.valid) {
      errorDiv.textContent = validation.error;
      errorDiv.style.display = 'block';
      return;
    }

    if (currentPassword === newPassword) {
      errorDiv.textContent = 'Das neue Passwort muss sich vom aktuellen unterscheiden.';
      errorDiv.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird geändert...';

    try {
      const result = await authService.changePassword(currentPassword, newPassword);

      if (result.success) {
        successDiv.textContent = 'Passwort erfolgreich geändert!';
        successDiv.style.display = 'block';
        form.reset();
        setTimeout(() => overlay.remove(), 1500);
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Passwort ändern';
      }
    } catch {
      errorDiv.textContent = 'Ein Fehler ist aufgetreten.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Passwort ändern';
    }
  }

  #validatePasswordStrength(password) {
    const errors = [];
    if (password.length < 8) errors.push('• Mindestens 8 Zeichen');
    if (!/[A-Z]/.test(password)) errors.push('• Mindestens 1 Großbuchstabe');
    if (!/[a-z]/.test(password)) errors.push('• Mindestens 1 Kleinbuchstabe');
    if (!/[0-9]/.test(password)) errors.push('• Mindestens 1 Zahl');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('• Mindestens 1 Sonderzeichen');
    }

    if (errors.length > 0) {
      return { valid: false, error: `Anforderungen:\n${errors.join('\n')}` };
    }
    return { valid: true };
  }

  async #handleLogout() {
    this.#close();

    if (window.confirm('Möchten Sie sich wirklich abmelden?')) {
      await authService.logout();
      // Auth state change triggers the redirect to the login screen.
    }
  }

  destroy() {
    this.#close();
    this.#element?.remove();
  }

  get element() {
    return this.#element;
  }
}
