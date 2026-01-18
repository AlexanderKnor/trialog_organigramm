/**
 * Component: AddEmployeeWizard
 * Multi-step wizard for creating a new employee with complete profile
 */

import { createElement } from '../../../../core/utils/index.js';
import { Input } from '../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Button } from '../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Logger } from './../../../../core/utils/logger.js';

const TOTAL_STEPS = 6;

export class AddEmployeeWizard {
  #element;
  #currentStep = 1;
  #formData = {};
  #props;
  #isEditMode = false;
  #existingUser = null;
  #isDeleting = false;

  // Form inputs (will be created per step)
  #inputs = {};

  constructor(props = {}) {
    this.#props = {
      onComplete: props.onComplete || null,
      onCancel: props.onCancel || null,
      onDelete: props.onDelete || null,
      existingUser: props.existingUser || null,
      existingNode: props.existingNode || null,
    };

    this.#isEditMode = !!props.existingUser;
    this.#existingUser = props.existingUser;

    this.#initializeFormData();
    this.#element = this.#render();
  }

  #initializeFormData() {
    if (this.#isEditMode && this.#existingUser) {
      // Edit mode: Pre-fill with existing data
      const user = this.#existingUser;
      const node = this.#props.existingNode;

      // Extract firstName and lastName from node name if user profile is incomplete
      // This handles migrated users who don't have full profile data
      let firstName = user.firstName || '';
      let lastName = user.lastName || '';

      if ((!firstName || !lastName) && node?.name) {
        const nameParts = node.name.trim().split(' ');
        if (nameParts.length >= 2) {
          firstName = firstName || nameParts[0];
          lastName = lastName || nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          firstName = firstName || nameParts[0];
        }
      }

      this.#formData = {
        // Step 1: Personal - Use node data as fallback for incomplete profiles
        firstName,
        lastName,
        birthDate: user.birthDate && user.birthDate !== 'Invalid Date'
          ? (typeof user.birthDate === 'string' ? user.birthDate.split('T')[0] : new Date(user.birthDate).toISOString().split('T')[0])
          : '',
        email: user.email || node?.email || '',
        phone: user.phone || node?.phone || '',
        password: '', // Never pre-fill password
        passwordConfirm: '',

        // Step 2: Address
        street: user.address?.street || '',
        houseNumber: user.address?.houseNumber || '',
        postalCode: user.address?.postalCode || '',
        city: user.address?.city || '',

        // Step 3: Tax & Legal
        taxNumber: user.taxInfo?.taxNumber || '',
        vatNumber: user.taxInfo?.vatNumber || '',
        taxOffice: user.taxInfo?.taxOffice || '',
        isSmallBusiness: user.taxInfo?.isSmallBusiness || false,
        isVatLiable: user.taxInfo?.isVatLiable !== false,
        legalForm: user.legalInfo?.legalForm || 'Einzelunternehmer',
        registrationCourt: user.legalInfo?.registrationCourt || '',

        // Step 4: Bank
        iban: user.bankInfo?.iban || '',
        bic: user.bankInfo?.bic || '',
        bankName: user.bankInfo?.bankName || '',
        accountHolder: user.bankInfo?.accountHolder || '',

        // Step 5: Qualifications
        ihkQualifications: user.qualifications?.ihkQualifications || [],
        ihkRegistrationNumber: user.qualifications?.ihkRegistrationNumber || '',

        // Step 6: Provisions & Career (from node or user)
        rankName: user.careerLevel?.rankName || 'Berater',
        bankProvision: node?.bankProvision || user.careerLevel?.bankProvisionRate || 0,
        insuranceProvision: node?.insuranceProvision || user.careerLevel?.insuranceProvisionRate || 0,
        realEstateProvision: node?.realEstateProvision || user.careerLevel?.realEstateProvisionRate || 0,
      };
    } else {
      // Create mode: Empty form
      this.#formData = {
        // Step 1: Personal
        firstName: '',
        lastName: '',
        birthDate: '',
        email: '',
        phone: '',
        password: '',
        passwordConfirm: '',

        // Step 2: Address
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',

        // Step 3: Tax & Legal
        taxNumber: '',
        vatNumber: '',
        taxOffice: '',
        isSmallBusiness: false,
        isVatLiable: true,
        legalForm: 'Einzelunternehmer',
        registrationCourt: '',

        // Step 4: Bank
        iban: '',
        bic: '',
        bankName: '',
        accountHolder: '',

        // Step 5: Qualifications
        ihkQualifications: [],
        ihkRegistrationNumber: '',

        // Step 6: Provisions & Career
        rankName: 'Berater',
        bankProvision: 0,
        insuranceProvision: 0,
        realEstateProvision: 0,
      };
    }
  }

  #render() {
    const overlay = createElement('div', { className: 'dialog-overlay wizard-overlay' });

    const progress = this.#renderProgress();
    const stepContent = this.#renderCurrentStep();
    const navigation = this.#renderNavigation();

    const dialogTitle = this.#isEditMode ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter';
    const content = createElement('div', { className: 'dialog-content dialog-wizard' }, [
      createElement('h2', { className: 'dialog-title' }, [dialogTitle]),
      progress,
      stepContent,
      navigation,
    ]);

    overlay.appendChild(content);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.#handleCancel();
      }
    });

    return overlay;
  }

  #renderProgress() {
    const steps = [];
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const stepClass = i === this.#currentStep ? 'active' : i < this.#currentStep ? 'completed' : '';
      steps.push(
        createElement('div', { className: `wizard-step ${stepClass}` }, [
          createElement('span', { className: 'step-number' }, [i.toString()]),
        ])
      );
    }

    return createElement('div', { className: 'wizard-progress' }, [
      createElement('div', { className: 'wizard-steps' }, steps),
      createElement('div', { className: 'wizard-step-label' }, [
        `Schritt ${this.#currentStep} von ${TOTAL_STEPS}: ${this.#getStepTitle()}`
      ]),
    ]);
  }

  #getStepTitle() {
    const titles = {
      1: 'Persönliche Daten',
      2: 'Anschrift',
      3: 'Steuer & Rechtliches',
      4: 'Bankdaten',
      5: 'Qualifikationen',
      6: 'Provisionen & Karriere',
    };
    return titles[this.#currentStep] || '';
  }

  #renderCurrentStep() {
    const stepContainer = createElement('div', { className: 'wizard-step-content' });

    switch (this.#currentStep) {
      case 1:
        stepContainer.appendChild(this.#renderStep1Personal());
        break;
      case 2:
        stepContainer.appendChild(this.#renderStep2Address());
        break;
      case 3:
        stepContainer.appendChild(this.#renderStep3TaxLegal());
        break;
      case 4:
        stepContainer.appendChild(this.#renderStep4Bank());
        break;
      case 5:
        stepContainer.appendChild(this.#renderStep5Qualifications());
        break;
      case 6:
        stepContainer.appendChild(this.#renderStep6Provisions());
        break;
    }

    return stepContainer;
  }

  #renderStep1Personal() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Persönliche Informationen']),
      createElement('p', { className: 'section-description' }, [
        'Grundlegende Informationen für den Mitarbeiter-Account'
      ]),
    ]);

    this.#inputs.firstName = new Input({
      id: 'wizard-firstName',
      label: 'Vorname *',
      placeholder: 'Max',
      value: this.#formData.firstName,
      required: true,
      onChange: (val) => this.#formData.firstName = val,
    });

    this.#inputs.lastName = new Input({
      id: 'wizard-lastName',
      label: 'Nachname *',
      placeholder: 'Mustermann',
      value: this.#formData.lastName,
      required: true,
      onChange: (val) => this.#formData.lastName = val,
    });

    this.#inputs.birthDate = new Input({
      id: 'wizard-birthDate',
      label: 'Geburtsdatum *',
      type: 'date',
      value: this.#formData.birthDate,
      required: true,
      onChange: (val) => this.#formData.birthDate = val,
    });

    this.#inputs.email = new Input({
      id: 'wizard-email',
      label: 'E-Mail *',
      type: 'email',
      placeholder: 'email@example.com',
      value: this.#formData.email,
      required: true,
      onChange: (val) => this.#formData.email = val,
    });

    this.#inputs.phone = new Input({
      id: 'wizard-phone',
      label: 'Telefon *',
      type: 'tel',
      placeholder: '+49 123 456789',
      value: this.#formData.phone,
      required: true,
      onChange: (val) => this.#formData.phone = val,
    });

    const passwordFields = [];

    // Password fields only in create mode (not edit mode)
    if (!this.#isEditMode) {
      this.#inputs.password = new Input({
        id: 'wizard-password',
        label: 'Passwort (für Login) *',
        type: 'password',
        placeholder: 'Mindestens 6 Zeichen',
        value: this.#formData.password,
        required: true,
        onChange: (val) => this.#formData.password = val,
      });

      this.#inputs.passwordConfirm = new Input({
        id: 'wizard-passwordConfirm',
        label: 'Passwort wiederholen *',
        type: 'password',
        placeholder: 'Passwort bestätigen',
        value: this.#formData.passwordConfirm,
        required: true,
        onChange: (val) => this.#formData.passwordConfirm = val,
      });

      passwordFields.push(
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.password.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.passwordConfirm.element]),
        ])
      );
    }

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        // Row 1: Name
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.firstName.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.lastName.element]),
        ]),
        // Row 2: Birth Date & Phone
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.birthDate.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.phone.element]),
        ]),
        // Row 3: Email (full width, disabled in edit mode)
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [this.#inputs.email.element]),
        ]),
        // Row 4: Passwords (only in create mode!)
        ...passwordFields,
      ]),
    ]);
  }

  #renderStep2Address() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Anschrift']),
      createElement('p', { className: 'section-description' }, [
        'Wohnadresse des Mitarbeiters'
      ]),
    ]);
    this.#inputs.street = new Input({
      label: 'Straße *',
      placeholder: 'Musterstraße',
      value: this.#formData.street,
      required: true,
      onChange: (val) => this.#formData.street = val,
    });

    this.#inputs.houseNumber = new Input({
      label: 'Hausnummer *',
      placeholder: '123',
      value: this.#formData.houseNumber,
      required: true,
      onChange: (val) => this.#formData.houseNumber = val,
    });

    this.#inputs.postalCode = new Input({
      label: 'PLZ *',
      placeholder: '12345 (5 Ziffern)',
      value: this.#formData.postalCode,
      required: true,
      onChange: (val) => {
        this.#formData.postalCode = val;
        this.#validatePostalCode(val);
      },
    });

    this.#inputs.city = new Input({
      label: 'Stadt *',
      placeholder: 'Berlin',
      value: this.#formData.city,
      required: true,
      onChange: (val) => this.#formData.city = val,
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        // Row 1: Street + House Number (3:1 ratio)
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-3' }, [this.#inputs.street.element]),
          createElement('div', { className: 'form-col-1-quarter' }, [this.#inputs.houseNumber.element]),
        ]),
        // Row 2: Postal Code + City (1:3 ratio)
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1-quarter' }, [this.#inputs.postalCode.element]),
          createElement('div', { className: 'form-col-3' }, [this.#inputs.city.element]),
        ]),
      ]),
    ]);
  }

  #renderStep3TaxLegal() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Steuer & Rechtliches']),
      createElement('p', { className: 'section-description' }, [
        'Steuerliche und rechtliche Informationen'
      ]),
    ]);
    this.#inputs.taxNumber = new Input({
      label: 'Steuernummer *',
      placeholder: '12/345/67890 (10-13 Ziffern)',
      value: this.#formData.taxNumber,
      required: true,
      onChange: (val) => {
        this.#formData.taxNumber = val;
        this.#validateTaxNumber(val);
      },
    });

    this.#inputs.vatNumber = new Input({
      label: 'Ust-IdNr. (optional)',
      placeholder: 'DE123456789',
      value: this.#formData.vatNumber,
      onChange: (val) => {
        this.#formData.vatNumber = val;
        if (val) this.#validateVatNumber(val);
      },
    });

    this.#inputs.taxOffice = new Input({
      label: 'Finanzamt *',
      placeholder: 'Finanzamt Berlin',
      value: this.#formData.taxOffice,
      required: true,
      onChange: (val) => this.#formData.taxOffice = val,
    });

    const isSmallBusinessCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'isSmallBusiness',
      checked: this.#formData.isSmallBusiness,
      onchange: (e) => this.#formData.isSmallBusiness = e.target.checked,
    });

    const isVatLiableCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'isVatLiable',
      checked: this.#formData.isVatLiable,
      onchange: (e) => this.#formData.isVatLiable = e.target.checked,
    });

    this.#inputs.legalForm = createElement('select', {
      className: 'input-field',
      value: this.#formData.legalForm,
      onchange: (e) => this.#formData.legalForm = e.target.value,
    }, [
      createElement('option', { value: 'Einzelunternehmer' }, ['Einzelunternehmer']),
      createElement('option', { value: 'GmbH' }, ['GmbH']),
      createElement('option', { value: 'UG (haftungsbeschränkt)' }, ['UG (haftungsbeschränkt)']),
      createElement('option', { value: 'GbR' }, ['GbR']),
      createElement('option', { value: 'e.K.' }, ['e.K.']),
    ]);

    this.#inputs.registrationCourt = new Input({
      label: 'Amtsgericht *',
      placeholder: 'Amtsgericht Berlin',
      value: this.#formData.registrationCourt,
      required: true,
      onChange: (val) => this.#formData.registrationCourt = val,
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form' }, [
        this.#inputs.taxNumber.element,
        this.#inputs.vatNumber.element,
        this.#inputs.taxOffice.element,
        createElement('div', { className: 'input-wrapper checkbox-wrapper' }, [
          createElement('label', { className: 'checkbox-label' }, [
            isSmallBusinessCheckbox,
            createElement('span', {}, ['Kleinunternehmer (§19 UStG)']),
          ]),
        ]),
        createElement('div', { className: 'input-wrapper checkbox-wrapper' }, [
          createElement('label', { className: 'checkbox-label' }, [
            isVatLiableCheckbox,
            createElement('span', {}, ['Umsatzsteuerpflichtig']),
          ]),
        ]),
        createElement('div', { className: 'input-wrapper' }, [
          createElement('label', { className: 'input-label' }, ['Rechtsform *']),
          this.#inputs.legalForm,
        ]),
        this.#inputs.registrationCourt.element,
      ]),
    ]);
  }

  #renderStep4Bank() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Bankverbindung']),
      createElement('p', { className: 'section-description' }, [
        'Bankdaten für Provisionsauszahlungen'
      ]),
    ]);
    this.#inputs.iban = new Input({
      label: 'IBAN *',
      placeholder: 'DE89370400440532013000 (DE + 20 Ziffern)',
      value: this.#formData.iban,
      required: true,
      onChange: (val) => {
        this.#formData.iban = val;
        this.#validateIBAN(val);
      },
    });

    this.#inputs.bic = new Input({
      label: 'BIC *',
      placeholder: 'COBADEFFXXX (8 oder 11 Zeichen)',
      value: this.#formData.bic,
      required: true,
      onChange: (val) => {
        this.#formData.bic = val;
        this.#validateBIC(val);
      },
    });

    this.#inputs.bankName = new Input({
      label: 'Bankname *',
      placeholder: 'Commerzbank',
      value: this.#formData.bankName,
      required: true,
      onChange: (val) => this.#formData.bankName = val,
    });

    this.#inputs.accountHolder = new Input({
      label: 'Kontoinhaber *',
      placeholder: 'Max Mustermann',
      value: this.#formData.accountHolder,
      required: true,
      onChange: (val) => this.#formData.accountHolder = val,
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        // Row 1: IBAN (full width for better readability)
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [this.#inputs.iban.element]),
        ]),
        // Row 2: BIC + Bank Name
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.bic.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.bankName.element]),
        ]),
        // Row 3: Account Holder
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [this.#inputs.accountHolder.element]),
        ]),
      ]),
    ]);
  }

  #renderStep5Qualifications() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Qualifikationen']),
      createElement('p', { className: 'section-description' }, [
        'Berufliche Qualifikationen und Zertifizierungen'
      ]),
    ]);
    this.#inputs.ihkRegistrationNumber = new Input({
      label: 'IHK Vermittlerregister-Nr. *',
      placeholder: 'D-ABCD-12345-2024',
      value: this.#formData.ihkRegistrationNumber,
      required: true,
      onChange: (val) => this.#formData.ihkRegistrationNumber = val,
    });

    // IHK Qualifications checkboxes (simplified - can be enhanced)
    const qualifications = [
      { value: 'insurance_broker', label: 'Versicherungsmakler (§34d GewO)' },
      { value: 'insurance_agent', label: 'Versicherungsvertreter (§34d GewO)' },
      { value: 'financial_broker', label: 'Finanzanlagenvermittler (§34f GewO)' },
      { value: 'real_estate_broker', label: 'Immobilienmakler (§34c GewO)' },
      { value: 'mortgage_broker', label: 'Darlehensvermittler (§34c GewO)' },
    ];

    const qualCheckboxes = qualifications.map(qual =>
      createElement('div', { className: 'checkbox-wrapper' }, [
        createElement('label', { className: 'checkbox-label' }, [
          createElement('input', {
            type: 'checkbox',
            value: qual.value,
            checked: this.#formData.ihkQualifications.includes(qual.label),
            onchange: (e) => {
              if (e.target.checked) {
                this.#formData.ihkQualifications.push(qual.label);
              } else {
                this.#formData.ihkQualifications = this.#formData.ihkQualifications.filter(q => q !== qual.label);
              }
            },
          }),
          createElement('span', {}, [qual.label]),
        ]),
      ])
    );

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form wizard-form-single-column' }, [
        this.#inputs.ihkRegistrationNumber.element,
        createElement('div', { className: 'input-wrapper' }, [
          createElement('label', { className: 'input-label' }, ['IHK-Qualifikationen']),
          ...qualCheckboxes,
        ]),
      ]),
    ]);
  }

  #renderStep6Provisions() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Karriere & Provisionen']),
      createElement('p', { className: 'section-description' }, [
        'Rangname und Provisions-Sätze für verschiedene Produktkategorien'
      ]),
    ]);
    this.#inputs.rankName = new Input({
      label: 'Rang/Karrierestufe *',
      placeholder: 'Senior Berater',
      value: this.#formData.rankName,
      required: true,
      onChange: (val) => this.#formData.rankName = val,
    });

    this.#inputs.bankProvision = new Input({
      label: 'Bank-Provision (%) *',
      type: 'number',
      placeholder: '0',
      min: '0',
      max: '100',
      step: '0.1',
      value: this.#formData.bankProvision,
      required: true,
      onChange: (val) => this.#formData.bankProvision = val,
    });

    this.#inputs.insuranceProvision = new Input({
      label: 'Versicherung-Provision (%) *',
      type: 'number',
      placeholder: '0',
      min: '0',
      max: '100',
      step: '0.1',
      value: this.#formData.insuranceProvision,
      required: true,
      onChange: (val) => this.#formData.insuranceProvision = val,
    });

    this.#inputs.realEstateProvision = new Input({
      label: 'Immobilien-Provision (%) *',
      type: 'number',
      placeholder: '0',
      min: '0',
      max: '100',
      step: '0.1',
      value: this.#formData.realEstateProvision,
      required: true,
      onChange: (val) => this.#formData.realEstateProvision = val,
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        // Row 1: Rank Name (full width)
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [this.#inputs.rankName.element]),
        ]),
        // Row 2: All provisions together (3 equal columns)
        createElement('div', { className: 'form-row-3-cols' }, [
          this.#inputs.bankProvision.element,
          this.#inputs.insuranceProvision.element,
          this.#inputs.realEstateProvision.element,
        ]),
      ]),
    ]);
  }

  #renderNavigation() {
    const buttons = [];

    Logger.log('Navigation render - Edit Mode:', this.#isEditMode, 'Step:', this.#currentStep);

    // Delete button (always visible in edit mode)
    if (this.#isEditMode) {
      Logger.log('✓ Showing delete button');
      const deleteBtn = new Button({
        label: 'Account löschen',
        variant: 'secondary',
        onClick: () => this.#handleDelete(),
      }).element;

      // Style as danger button (red)
      deleteBtn.classList.add('btn-danger');
      deleteBtn.style.cssText = `
        background: white;
        color: #dc2626;
        border: 2px solid #dc2626;
        font-weight: 600;
      `;

      // Hover effect
      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = '#dc2626';
        deleteBtn.style.color = 'white';
      });
      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'white';
        deleteBtn.style.color = '#dc2626';
      });

      buttons.push(deleteBtn);
    } else {
      Logger.log('Delete button hidden - not in edit mode');
    }

    // Cancel button (always visible)
    buttons.push(
      new Button({
        label: 'Abbrechen',
        variant: 'ghost',
        onClick: () => this.#handleCancel(),
      }).element
    );

    // Back button (visible from step 2 onwards)
    if (this.#currentStep > 1) {
      buttons.push(
        new Button({
          label: 'Zurück',
          variant: 'secondary',
          onClick: () => this.#goToPreviousStep(),
        }).element
      );
    }

    // Next/Complete button
    if (this.#currentStep < TOTAL_STEPS) {
      buttons.push(
        new Button({
          label: 'Weiter',
          variant: 'primary',
          onClick: () => this.#goToNextStep(),
        }).element
      );
    } else {
      buttons.push(
        new Button({
          label: this.#isEditMode ? 'Änderungen speichern' : 'Mitarbeiter anlegen',
          variant: 'primary',
          onClick: () => this.#handleComplete(),
        }).element
      );
    }

    return createElement('div', { className: 'wizard-navigation' }, buttons);
  }

  #handleDelete() {
    Logger.log('🗑️ Delete button clicked!');

    // Prevent multiple delete operations
    if (this.#isDeleting) {
      Logger.log('⚠️ Delete already in progress, ignoring click');
      return;
    }

    this.#isDeleting = true;

    const confirmed = confirm(
      '⚠️ WARNUNG: Account komplett löschen?\n\n' +
      'Dies löscht ALLE Daten:\n' +
      '- Mitarbeiter-Profil\n' +
      '- Alle Umsatz-Einträge\n' +
      '- Login-Account\n' +
      '- Position im Organigramm\n\n' +
      'Diese Aktion kann NICHT rückgängig gemacht werden!'
    );

    Logger.log('First confirmation:', confirmed);
    if (!confirmed) {
      Logger.log('Delete cancelled by user (first confirm)');
      this.#isDeleting = false;
      return;
    }

    // Double confirmation for safety
    const doubleConfirmed = confirm(
      'LETZTE BESTÄTIGUNG:\n\n' +
      `Account "${this.#formData.email}" wird unwiderruflich gelöscht.\n\n` +
      'Fortfahren?'
    );

    Logger.log('Second confirmation:', doubleConfirmed);
    if (!doubleConfirmed) {
      Logger.log('Delete cancelled by user (second confirm)');
      this.#isDeleting = false;
      return;
    }

    // Call onDelete handler (will be handled by Sidebar/HierarchyScreen)
    Logger.log('Calling onDelete with data:', {
      uid: this.#existingUser?.uid,
      email: this.#formData.email,
      nodeId: this.#props.existingNode?.id,
    });

    if (this.#props.onDelete) {
      this.#props.onDelete({
        uid: this.#existingUser?.uid,
        email: this.#formData.email,
        nodeId: this.#props.existingNode?.id,
      });
    } else {
      Logger.error('❌ onDelete callback not provided!');
    }

    this.remove();
  }

  #goToNextStep() {
    if (!this.#validateCurrentStep()) {
      return;
    }

    if (this.#currentStep < TOTAL_STEPS) {
      this.#animateStepTransition('forward', () => {
        this.#currentStep++;
        this.#refresh();
      });
    }
  }

  #goToPreviousStep() {
    if (this.#currentStep > 1) {
      this.#animateStepTransition('backward', () => {
        this.#currentStep--;
        this.#refresh();
      });
    }
  }

  #animateStepTransition(direction, callback) {
    const stepContent = this.#element.querySelector('.wizard-step-content');
    if (!stepContent) {
      callback();
      return;
    }

    // Exit animation
    const exitClass = direction === 'forward' ? 'step-exit-right' : 'step-exit-left';
    stepContent.classList.add(exitClass);

    setTimeout(() => {
      // Update step number
      callback();

      // Enter animation on NEW content
      requestAnimationFrame(() => {
        const newStepContent = this.#element.querySelector('.wizard-step-content');
        if (newStepContent) {
          const enterClass = direction === 'forward' ? 'step-enter-right' : 'step-enter-left';
          newStepContent.classList.add(enterClass);

          // Remove animation class after completion
          setTimeout(() => {
            newStepContent.classList.remove(enterClass);
          }, 400);
        }
      });
    }, 300);
  }

  #validateCurrentStep() {
    // Simple validation - check required fields are filled
    // Detailed validation happens on complete
    switch (this.#currentStep) {
      case 1:
        if (!this.#formData.firstName || !this.#formData.lastName || !this.#formData.email) {
          alert('Bitte alle Pflichtfelder ausfüllen');
          return false;
        }
        // Password validation only in create mode
        if (!this.#isEditMode) {
          if (!this.#formData.password || this.#formData.password.length < 6) {
            alert('Passwort muss mindestens 6 Zeichen haben');
            return false;
          }
          if (this.#formData.password !== this.#formData.passwordConfirm) {
            alert('Passwörter stimmen nicht überein');
            return false;
          }
        }
        break;
      case 2:
        if (!this.#formData.street || !this.#formData.houseNumber || !this.#formData.postalCode || !this.#formData.city) {
          alert('Bitte alle Adressfelder ausfüllen');
          return false;
        }
        break;
      case 3:
        if (!this.#formData.taxNumber || !this.#formData.taxOffice || !this.#formData.registrationCourt) {
          alert('Bitte alle Pflichtfelder ausfüllen');
          return false;
        }
        break;
      case 4:
        if (!this.#formData.iban || !this.#formData.bic || !this.#formData.bankName || !this.#formData.accountHolder) {
          alert('Bitte alle Bankdaten ausfüllen');
          return false;
        }
        break;
      case 5:
        if (!this.#formData.ihkRegistrationNumber) {
          alert('Bitte IHK-Registrierungsnummer eingeben');
          return false;
        }
        break;
      case 6:
        if (!this.#formData.rankName) {
          alert('Bitte Rang eingeben');
          return false;
        }
        break;
    }
    return true;
  }

  #refresh() {
    // Update only the step content and navigation, not the entire dialog
    const progressContainer = this.#element.querySelector('.wizard-progress');
    const stepContainer = this.#element.querySelector('.wizard-step-content');
    const navContainer = this.#element.querySelector('.wizard-navigation');

    if (progressContainer) {
      const newProgress = this.#renderProgress();
      progressContainer.replaceWith(newProgress);
    }

    if (stepContainer) {
      const newStepContent = this.#renderCurrentStep();
      stepContainer.replaceWith(newStepContent);
    }

    if (navContainer) {
      const newNav = this.#renderNavigation();
      navContainer.replaceWith(newNav);
    }
  }

  async #handleComplete() {
    if (!this.#validateCurrentStep()) {
      return;
    }

    // All validation passed - return complete data
    this.#props.onComplete?.(this.#formData);
  }

  #handleCancel() {
    const confirmed = confirm('Möchten Sie den Vorgang wirklich abbrechen? Alle Eingaben gehen verloren.');
    if (confirmed) {
      this.#props.onCancel?.();
      this.remove();
    }
  }

  show() {
    document.body.appendChild(this.#element);
    // Focus first input of first step
    setTimeout(() => {
      const firstInput = this.#element.querySelector('input[type="text"], input[type="email"]');
      firstInput?.focus();
    }, 100);
  }

  remove() {
    this.#element.remove();
  }

  get element() {
    return this.#element;
  }

  // ========================================
  // VALIDATION METHODS (Real-time feedback)
  // ========================================

  #validateTaxNumber(taxNumber) {
    if (!taxNumber) return;

    const cleaned = taxNumber.replace(/[\s\-\/]/g, '');
    if (cleaned.length < 10 || cleaned.length > 13 || !/^\d+$/.test(cleaned)) {
      this.#inputs.taxNumber?.setError('Steuernummer: 10-13 Ziffern (z.B. 12345678901)');
      return false;
    }

    this.#inputs.taxNumber?.setError(null);
    return true;
  }

  #validateVatNumber(vatNumber) {
    if (!vatNumber) {
      this.#inputs.vatNumber?.setError(null);
      return true;
    }

    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
    if (!/^DE\d{9}$/.test(cleaned)) {
      this.#inputs.vatNumber?.setError('Format: DE + 9 Ziffern (z.B. DE123456789)');
      return false;
    }

    this.#inputs.vatNumber?.setError(null);
    return true;
  }

  #validateIBAN(iban) {
    if (!iban) return;

    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (!/^DE\d{20}$/.test(cleaned)) {
      this.#inputs.iban?.setError('Format: DE + 20 Ziffern (z.B. DE89370400440532013000)');
      return false;
    }

    // IBAN Prüfsummen-Validation (Mod 97)
    const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());

    try {
      const checksum = BigInt(numeric) % 97n;
      if (checksum !== 1n) {
        this.#inputs.iban?.setError('IBAN Prüfsumme ungültig. Verwenden Sie: DE89370400440532013000');
        return false;
      }
    } catch (error) {
      this.#inputs.iban?.setError('IBAN ungültig');
      return false;
    }

    this.#inputs.iban?.setError(null);
    return true;
  }

  #validateBIC(bic) {
    if (!bic) return;

    const cleaned = bic.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
      this.#inputs.bic?.setError('Format: 8 oder 11 Zeichen (z.B. COBADEFF)');
      return false;
    }

    this.#inputs.bic?.setError(null);
    return true;
  }

  #validatePostalCode(postalCode) {
    if (!postalCode) return;

    const cleaned = postalCode.replace(/\s/g, '');
    if (!/^\d{5}$/.test(cleaned)) {
      this.#inputs.postalCode?.setError('PLZ: Genau 5 Ziffern (z.B. 12345)');
      return false;
    }

    this.#inputs.postalCode?.setError(null);
    return true;
  }
}
