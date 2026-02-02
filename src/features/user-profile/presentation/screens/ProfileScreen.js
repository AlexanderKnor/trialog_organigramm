/**
 * Screen: ProfileScreen
 * Complete user profile management with tabbed sections
 */

import { createElement, clearElement } from '../../../../core/utils/index.js';
import { Button } from '../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Logger } from './../../../../core/utils/logger.js';
import { authService } from '../../../../core/auth/index.js';

export class ProfileScreen {
  #element;
  #container;
  #profileService;
  #userId;
  #user;
  #activeSection = 'personal';
  #isEditing = false;

  constructor(container, profileService, userId) {
    this.#container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.#profileService = profileService;
    this.#userId = userId;
    this.#element = null;
  }

  async mount() {
    await this.#loadUserProfile();
    this.#element = this.#render();
    this.#container.innerHTML = '';
    this.#container.appendChild(this.#element);
  }

  async #loadUserProfile() {
    try {
      this.#user = await this.#profileService.getUserProfile(this.#userId);
      if (!this.#user) {
        Logger.warn('User profile not found, creating minimal profile');
        // User will need to complete profile
      }
    } catch (error) {
      Logger.error('Failed to load user profile:', error);
    }
  }

  #render() {
    const header = this.#renderHeader();
    const navigation = this.#renderNavigation();
    const content = this.#renderContent();

    return createElement('div', { className: 'profile-screen' }, [
      header,
      navigation,
      content,
    ]);
  }

  #renderHeader() {
    const profileCompletion = this.#user?.profileCompletionPercentage || 0;
    const isComplete = this.#user?.isProfileComplete || false;

    return createElement('div', { className: 'profile-header' }, [
      createElement('div', { className: 'profile-header-top' }, [
        createElement('h1', { className: 'profile-title' }, ['Mein Profil']),
        createElement('div', { className: 'profile-completion' }, [
          createElement('span', { className: 'completion-label' }, [
            `Profil zu ${profileCompletion}% vollständig`
          ]),
          createElement('div', { className: 'completion-bar' }, [
            createElement('div', {
              className: `completion-progress ${isComplete ? 'complete' : ''}`,
              style: `width: ${profileCompletion}%`
            }),
          ]),
        ]),
      ]),
      createElement('div', { className: 'profile-header-actions' }, [
        new Button({
          label: 'Zurück',
          variant: 'ghost',
          onClick: () => this.#navigateBack(),
        }).element,
      ]),
    ]);
  }

  #renderNavigation() {
    const sections = [
      { key: 'personal', label: 'Persönliche Daten', icon: '👤' },
      { key: 'address', label: 'Anschrift', icon: '🏠' },
      { key: 'tax', label: 'Steuer', icon: '💼' },
      { key: 'bank', label: 'Bankdaten', icon: '🏦' },
      { key: 'legal', label: 'Rechtliches', icon: '⚖️' },
      { key: 'qualifications', label: 'Qualifikationen', icon: '🎓' },
      { key: 'career', label: 'Karriere', icon: '📈' },
      { key: 'security', label: 'Sicherheit', icon: '🔒' },
    ];

    const tabs = sections.map(section =>
      createElement('button', {
        className: `profile-nav-tab ${this.#activeSection === section.key ? 'active' : ''}`,
        onclick: () => this.#switchSection(section.key),
      }, [
        createElement('span', { className: 'tab-icon' }, [section.icon]),
        createElement('span', { className: 'tab-label' }, [section.label]),
      ])
    );

    return createElement('nav', { className: 'profile-navigation' }, tabs);
  }

  #renderContent() {
    if (!this.#user) {
      return createElement('div', { className: 'profile-content' }, [
        createElement('div', { className: 'profile-loading' }, [
          createElement('p', {}, ['Profil wird geladen...']),
        ]),
      ]);
    }

    let sectionContent;

    switch (this.#activeSection) {
      case 'personal':
        sectionContent = this.#renderPersonalSection();
        break;
      case 'address':
        sectionContent = this.#renderAddressSection();
        break;
      case 'tax':
        sectionContent = this.#renderTaxSection();
        break;
      case 'bank':
        sectionContent = this.#renderBankSection();
        break;
      case 'legal':
        sectionContent = this.#renderLegalSection();
        break;
      case 'qualifications':
        sectionContent = this.#renderQualificationsSection();
        break;
      case 'career':
        sectionContent = this.#renderCareerSection();
        break;
      case 'security':
        sectionContent = this.#renderSecuritySection();
        break;
      default:
        sectionContent = createElement('div', {}, ['Section not found']);
    }

    return createElement('div', { className: 'profile-content' }, [sectionContent]);
  }

  #renderPersonalSection() {
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Persönliche Daten']),
      createElement('div', { className: 'section-content' }, [
        this.#renderField('Vorname', this.#user.firstName || '-'),
        this.#renderField('Nachname', this.#user.lastName || '-'),
        this.#renderField('Geburtsdatum', this.#user.birthDate ? new Date(this.#user.birthDate).toLocaleDateString('de-DE') : '-'),
        this.#renderField('Telefon', this.#user.phone || '-'),
        this.#renderField('Email', this.#user.email),
      ]),
      createElement('div', { className: 'section-actions' }, [
        new Button({
          label: 'Bearbeiten',
          variant: 'primary',
          onClick: () => this.#editSection('personal'),
        }).element,
      ]),
    ]);
  }

  #renderAddressSection() {
    const addr = this.#user.address;
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Anschrift']),
      createElement('div', { className: 'section-content' }, [
        this.#renderField('Straße', addr.street || '-'),
        this.#renderField('Hausnummer', addr.houseNumber || '-'),
        this.#renderField('PLZ', addr.postalCode || '-'),
        this.#renderField('Stadt', addr.city || '-'),
        this.#renderField('Land', addr.country || '-'),
      ]),
      createElement('div', { className: 'section-actions' }, [
        new Button({
          label: 'Bearbeiten',
          variant: 'primary',
          onClick: () => this.#editSection('address'),
        }).element,
      ]),
    ]);
  }

  #renderTaxSection() {
    const tax = this.#user.taxInfo;
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Steuerinformationen']),
      createElement('div', { className: 'section-content' }, [
        this.#renderField('Steuernummer', tax.taxNumber || '-'),
        this.#renderField('Ust-IdNr.', tax.vatNumber || '-'),
        this.#renderField('Finanzamt', tax.taxOffice || '-'),
        this.#renderField('Kleinunternehmer', tax.isSmallBusiness ? 'Ja' : 'Nein'),
        this.#renderField('Umsatzsteuerpflichtig', tax.isVatLiable ? 'Ja' : 'Nein'),
      ]),
      createElement('div', { className: 'section-actions' }, [
        new Button({
          label: 'Bearbeiten',
          variant: 'primary',
          onClick: () => this.#editSection('tax'),
        }).element,
      ]),
    ]);
  }

  #renderBankSection() {
    const bank = this.#user.bankInfo;
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Bankverbindung']),
      createElement('div', { className: 'section-content' }, [
        this.#renderField('IBAN', bank.ibanFormatted || '-'),
        this.#renderField('BIC', bank.bic || '-'),
        this.#renderField('Bankname', bank.bankName || '-'),
        this.#renderField('Kontoinhaber', bank.accountHolder || '-'),
      ]),
      createElement('div', { className: 'section-actions' }, [
        new Button({
          label: 'Bearbeiten',
          variant: 'primary',
          onClick: () => this.#editSection('bank'),
        }).element,
      ]),
    ]);
  }

  #renderLegalSection() {
    const legal = this.#user.legalInfo;
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Rechtliche Informationen']),
      createElement('div', { className: 'section-content' }, [
        this.#renderField('Rechtsform', legal.legalForm || '-'),
        this.#renderField('Amtsgericht', legal.registrationCourt || '-'),
        this.#renderField('Handelsregisternummer', legal.commercialRegisterNumber || '-'),
        this.#renderField('Gewerberegisternummer', legal.tradeRegisterNumber || '-'),
      ]),
      createElement('div', { className: 'section-actions' }, [
        new Button({
          label: 'Bearbeiten',
          variant: 'primary',
          onClick: () => this.#editSection('legal'),
        }).element,
      ]),
    ]);
  }

  #renderQualificationsSection() {
    const qual = this.#user.qualifications;
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Qualifikationen']),
      createElement('div', { className: 'section-content' }, [
        this.#renderField('IHK-Registrierungsnummer', qual.ihkRegistrationNumber || '-'),
        this.#renderList('IHK-Qualifikationen', qual.ihkQualifications),
        this.#renderList('Zertifikate', qual.certifications),
      ]),
      createElement('div', { className: 'section-actions' }, [
        new Button({
          label: 'Bearbeiten',
          variant: 'primary',
          onClick: () => this.#editSection('qualifications'),
        }).element,
      ]),
    ]);
  }

  #renderCareerSection() {
    const career = this.#user.careerLevel;
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Karrierestufe & Provisionen']),
      createElement('div', { className: 'section-content' }, [
        this.#renderField('Rang', career.rankName || '-'),
        this.#renderField('Level', career.level?.toString() || '-'),
        this.#renderField('Bank-Provision', `${career.bankProvisionRate}%`),
        this.#renderField('Versicherung-Provision', `${career.insuranceProvisionRate}%`),
        this.#renderField('Immobilien-Provision', `${career.realEstateProvisionRate}%`),
      ]),
      createElement('div', { className: 'section-actions' }, [
        new Button({
          label: 'Bearbeiten',
          variant: 'primary',
          onClick: () => this.#editSection('career'),
        }).element,
      ]),
    ]);
  }

  #renderSecuritySection() {
    return createElement('div', { className: 'profile-section' }, [
      createElement('h2', { className: 'section-title' }, ['Sicherheit']),
      createElement('div', { className: 'section-content security-section' }, [
        createElement('div', { className: 'security-info' }, [
          createElement('p', { className: 'security-description' }, [
            'Hier können Sie Ihr Passwort ändern. Aus Sicherheitsgründen müssen Sie Ihr aktuelles Passwort eingeben.',
          ]),
        ]),

        // Change password form
        createElement('form', {
          className: 'change-password-form',
          onsubmit: (e) => this.#handleChangePassword(e),
        }, [
          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label', for: 'current-password' }, ['Aktuelles Passwort']),
            createElement('input', {
              className: 'form-input',
              type: 'password',
              id: 'current-password',
              name: 'currentPassword',
              required: true,
              autocomplete: 'current-password',
              placeholder: 'Aktuelles Passwort eingeben',
            }),
          ]),

          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label', for: 'new-password' }, ['Neues Passwort']),
            createElement('input', {
              className: 'form-input',
              type: 'password',
              id: 'new-password',
              name: 'newPassword',
              required: true,
              autocomplete: 'new-password',
              placeholder: 'Neues Passwort eingeben',
            }),
            createElement('small', { className: 'form-hint' }, [
              'Mindestens 8 Zeichen, mit Groß- und Kleinbuchstaben, Zahl und Sonderzeichen',
            ]),
          ]),

          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label', for: 'confirm-password' }, ['Neues Passwort bestätigen']),
            createElement('input', {
              className: 'form-input',
              type: 'password',
              id: 'confirm-password',
              name: 'confirmPassword',
              required: true,
              autocomplete: 'new-password',
              placeholder: 'Neues Passwort wiederholen',
            }),
          ]),

          // Error/Success message
          createElement('div', { className: 'form-error', style: 'display: none;' }),
          createElement('div', { className: 'form-success', style: 'display: none;' }),

          createElement('div', { className: 'form-actions' }, [
            createElement('button', {
              className: 'btn btn-primary',
              type: 'submit',
            }, ['Passwort ändern']),
          ]),
        ]),
      ]),
    ]);
  }

  async #handleChangePassword(e) {
    e.preventDefault();

    const form = e.target;
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = form.querySelector('.form-error');
    const successDiv = form.querySelector('.form-success');

    // Clear previous messages
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    successDiv.style.display = 'none';
    successDiv.textContent = '';

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = 'Die neuen Passwörter stimmen nicht überein.';
      errorDiv.style.display = 'block';
      return;
    }

    // Validate password strength
    const passwordValidation = this.#validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      errorDiv.innerHTML = passwordValidation.error;
      errorDiv.style.display = 'block';
      errorDiv.style.whiteSpace = 'pre-line';
      return;
    }

    // Prevent using the same password
    if (currentPassword === newPassword) {
      errorDiv.textContent = 'Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.';
      errorDiv.style.display = 'block';
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird geändert...';

    try {
      const result = await authService.changePassword(currentPassword, newPassword);

      if (result.success) {
        // Show success message
        successDiv.textContent = 'Passwort erfolgreich geändert!';
        successDiv.style.display = 'block';

        // Clear form
        form.reset();

        Logger.log('Password changed successfully');
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      errorDiv.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      errorDiv.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Passwort ändern';
    }
  }

  #validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('• Mindestens 8 Zeichen');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('• Mindestens 1 Großbuchstabe (A-Z)');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('• Mindestens 1 Kleinbuchstabe (a-z)');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('• Mindestens 1 Zahl (0-9)');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('• Mindestens 1 Sonderzeichen (!@#$%^&*...)');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: `Passwort erfüllt nicht alle Anforderungen:\n\n${errors.join('\n')}`,
      };
    }

    return { valid: true };
  }

  #renderField(label, value) {
    return createElement('div', { className: 'profile-field' }, [
      createElement('span', { className: 'field-label' }, [label + ':']),
      createElement('span', { className: 'field-value' }, [value || '-']),
    ]);
  }

  #renderList(label, items) {
    const listContent = items.length > 0
      ? items.map(item => createElement('li', {}, [item]))
      : [createElement('li', { className: 'empty' }, ['-'])];

    return createElement('div', { className: 'profile-field-list' }, [
      createElement('span', { className: 'field-label' }, [label + ':']),
      createElement('ul', { className: 'field-list' }, listContent),
    ]);
  }

  #switchSection(section) {
    this.#activeSection = section;
    this.#container.innerHTML = '';
    this.#element = this.#render();
    this.#container.appendChild(this.#element);
  }

  #editSection(section) {
    Logger.log(`Editing section: ${section}`);
    // TODO: Show edit form dialog for this section
    alert(`Bearbeiten: ${section}\n\nFormular-Implementation folgt in nächster Phase.`);
  }

  #navigateBack() {
    window.location.hash = '';
  }

  unmount() {
    if (this.#element) {
      this.#element.remove();
    }
  }

  get element() {
    return this.#element;
  }
}
