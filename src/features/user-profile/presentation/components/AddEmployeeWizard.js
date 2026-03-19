/**
 * Component: AddEmployeeWizard
 * Multi-step wizard for creating a new employee with complete profile
 */

import { createElement } from '../../../../core/utils/index.js';
import { Input } from '../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Button } from '../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Logger } from './../../../../core/utils/logger.js';
import { getGeschaeftsfuehrerConfig } from '../../../../core/config/geschaeftsfuehrer.config.js';
import { LEGAL_FORMS, LegalInfo } from '../../domain/value-objects/LegalInfo.js';
import { QUALIFICATIONS_REQUIRING_REGISTRATION } from '../../domain/value-objects/Qualifications.js';

const TOTAL_STEPS = 6;

const LEGAL_FORM_OPTIONS = [
  { value: LEGAL_FORMS.ANGESTELLTER, label: 'Angestellte/r' },
  { value: LEGAL_FORMS.EINZELUNTERNEHMEN, label: 'Einzelunternehmen' },
  { value: LEGAL_FORMS.GMBH, label: 'GmbH' },
  { value: LEGAL_FORMS.GMBH_CO_KG, label: 'GmbH & Co. KG' },
  { value: LEGAL_FORMS.UG, label: 'UG (haftungsbeschränkt)' },
  { value: LEGAL_FORMS.EK, label: 'e.K.' },
  { value: LEGAL_FORMS.GBR, label: 'GbR' },
  { value: LEGAL_FORMS.EGBR, label: 'eGbR' },
];

export class AddEmployeeWizard {
  #element;
  #currentStep = 1;
  #formData = {};
  #props;
  #isEditMode = false;
  #isGeschaeftsfuehrer = false;
  #existingUser = null;
  #isDeleting = false;

  // Form inputs (will be created per step)
  #inputs = {};

  get #firstStep() { return 1; }
  get #totalSteps() { return TOTAL_STEPS; }
  get #displayStep() { return this.#currentStep; }

  constructor(props = {}) {
    this.#props = {
      onComplete: props.onComplete || null,
      onCancel: props.onCancel || null,
      onDelete: props.onDelete || null,
      existingUser: props.existingUser || null,
      existingNode: props.existingNode || null,
    };

    this.#isGeschaeftsfuehrer = props.isGeschaeftsfuehrer || false;
    this.#isEditMode = !!props.existingUser || this.#isGeschaeftsfuehrer;
    this.#existingUser = props.existingUser;
    this.#currentStep = props.initialStep || this.#firstStep;

    this.#initializeFormData();
    this.#element = this.#render();
  }

  #isCompanyForm() {
    return LegalInfo.isCompanyForm(this.#formData.legalForm);
  }

  #isEmployeeForm() {
    return LegalInfo.isEmployeeForm(this.#formData.legalForm);
  }

  #initializeFormData() {
    const user = this.#existingUser;
    const node = this.#props.existingNode;

    if (user) {
      // Edit mode with existing profile: pre-fill from user + node fallback
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

      let legalForm = user.legalInfo?.legalForm || LEGAL_FORMS.EINZELUNTERNEHMEN;
      // Backward compatibility
      if (legalForm === 'Einzelunternehmer') legalForm = LEGAL_FORMS.EINZELUNTERNEHMEN;

      this.#formData = {
        legalForm,
        firstName,
        lastName,
        companyName: user.companyName || '',
        birthDate: user.birthDate && user.birthDate !== 'Invalid Date'
          ? (typeof user.birthDate === 'string' ? user.birthDate.split('T')[0] : new Date(user.birthDate).toISOString().split('T')[0])
          : '',
        foundingDate: user.legalInfo?.foundingDate
          ? (typeof user.legalInfo.foundingDate === 'string'
            ? user.legalInfo.foundingDate.split('T')[0]
            : new Date(user.legalInfo.foundingDate).toISOString().split('T')[0])
          : '',
        email: user.email || node?.email || '',
        phone: user.phone || node?.phone || '',
        password: '',
        passwordConfirm: '',
        street: user.address?.street || '',
        houseNumber: user.address?.houseNumber || '',
        postalCode: user.address?.postalCode || '',
        city: user.address?.city || '',
        taxNumber: user.taxInfo?.taxNumber || '',
        taxId: user.taxInfo?.taxId || '',
        vatNumber: user.taxInfo?.vatNumber || '',
        taxOffice: user.taxInfo?.taxOffice || '',
        isSmallBusiness: user.taxInfo?.isSmallBusiness || false,
        isVatLiable: user.taxInfo?.isVatLiable !== false,
        registrationCourt: user.legalInfo?.registrationCourt || '',
        iban: user.bankInfo?.iban || '',
        bic: user.bankInfo?.bic || '',
        bankName: user.bankInfo?.bankName || '',
        accountHolder: user.bankInfo?.accountHolder || '',
        ihkQualifications: user.qualifications?.ihkQualifications || [],
        registrationNumbers: user.qualifications?.registrationNumbers
          ? { ...user.qualifications.registrationNumbers }
          : {},
        rankName: user.careerLevel?.rankName || (this.#isGeschaeftsfuehrer ? 'Geschäftsführer' : 'Berater'),
        bankProvision: node?.bankProvision || user.careerLevel?.bankProvisionRate
          || (this.#isGeschaeftsfuehrer ? this.#getGfDefaultProvision('bank') : 0),
        insuranceProvision: node?.insuranceProvision || user.careerLevel?.insuranceProvisionRate
          || (this.#isGeschaeftsfuehrer ? this.#getGfDefaultProvision('insurance') : 0),
        realEstateProvision: node?.realEstateProvision || user.careerLevel?.realEstateProvisionRate
          || (this.#isGeschaeftsfuehrer ? this.#getGfDefaultProvision('realEstate') : 0),
      };
    } else if (this.#isGeschaeftsfuehrer && node) {
      // GF without profile: pre-fill from node data and config defaults
      let firstName = '';
      let lastName = '';
      if (node.name) {
        const nameParts = node.name.trim().split(' ');
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          firstName = nameParts[0];
        }
      }

      this.#formData = {
        legalForm: LEGAL_FORMS.EINZELUNTERNEHMEN,
        firstName,
        lastName,
        companyName: '',
        birthDate: '',
        foundingDate: '',
        email: node.email || '',
        phone: node.phone || '',
        password: '',
        passwordConfirm: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        taxNumber: '',
        taxId: '',
        vatNumber: '',
        taxOffice: '',
        isSmallBusiness: false,
        isVatLiable: true,
        registrationCourt: '',
        iban: '',
        bic: '',
        bankName: '',
        accountHolder: '',
        ihkQualifications: [],
        registrationNumbers: {},
        rankName: 'Geschäftsführer',
        bankProvision: node.bankProvision || this.#getGfDefaultProvision('bank'),
        insuranceProvision: node.insuranceProvision || this.#getGfDefaultProvision('insurance'),
        realEstateProvision: node.realEstateProvision || this.#getGfDefaultProvision('realEstate'),
      };
    } else {
      // Create mode: empty form for new employee
      this.#formData = {
        legalForm: '',
        firstName: '',
        lastName: '',
        companyName: '',
        birthDate: '',
        foundingDate: '',
        email: '',
        phone: '',
        password: '',
        passwordConfirm: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        taxNumber: '',
        taxId: '',
        vatNumber: '',
        taxOffice: '',
        isSmallBusiness: false,
        isVatLiable: true,
        registrationCourt: '',
        iban: '',
        bic: '',
        bankName: '',
        accountHolder: '',
        ihkQualifications: [],
        registrationNumbers: {},
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

    const dialogTitle = this.#isGeschaeftsfuehrer
      ? 'Profil bearbeiten'
      : (this.#isEditMode ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter');
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
    for (let i = 1; i <= this.#totalSteps; i++) {
      const stepClass = i === this.#displayStep ? 'active' : i < this.#displayStep ? 'completed' : '';
      steps.push(
        createElement('div', { className: `wizard-step ${stepClass}` }, [
          createElement('span', { className: 'step-number' }, [i.toString()]),
        ])
      );
    }

    return createElement('div', { className: 'wizard-progress' }, [
      createElement('div', { className: 'wizard-steps' }, steps),
      createElement('div', { className: 'wizard-step-label' }, [
        `Schritt ${this.#displayStep} von ${this.#totalSteps}: ${this.#getStepTitle()}`
      ]),
    ]);
  }

  #getStepTitle() {
    const titles = {
      1: 'Rechtsform & Identifikation',
      2: 'Anschrift',
      3: 'Steuerliche Informationen',
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
        stepContainer.appendChild(this.#renderStep1LegalFormAndIdentity());
        break;
      case 2:
        stepContainer.appendChild(this.#renderStep2Address());
        break;
      case 3:
        stepContainer.appendChild(this.#renderStep3Tax());
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

  // ========================================
  // STEP 1: Rechtsform & Identifikation
  // ========================================
  #renderStep1LegalFormAndIdentity() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Rechtsform & Identifikation']),
      createElement('p', { className: 'section-description' }, [
        'Wählen Sie die Rechtsform und geben Sie die grundlegenden Identifikationsdaten ein'
      ]),
    ]);

    // Legal form select
    const legalFormOptions = LEGAL_FORM_OPTIONS.map(opt =>
      createElement('option', {
        value: opt.value,
        selected: this.#formData.legalForm === opt.value,
      }, [opt.label])
    );

    // Placeholder option for create mode
    if (!this.#formData.legalForm) {
      legalFormOptions.unshift(
        createElement('option', { value: '', disabled: true, selected: true }, ['Bitte wählen...'])
      );
    }

    const identityContainer = createElement('div', { className: 'identity-fields-container' });

    const legalFormSelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => {
        this.#formData.legalForm = e.target.value;
        // Auto-set rankName for employees
        if (LegalInfo.isEmployeeForm(e.target.value)) {
          this.#formData.rankName = 'Angestellter';
        } else if (this.#formData.rankName === 'Angestellter') {
          this.#formData.rankName = 'Berater';
        }
        // Re-render identity fields based on new legal form
        identityContainer.replaceChildren(this.#renderIdentityFields());
      },
    }, legalFormOptions);

    this.#inputs.legalForm = legalFormSelect;

    // Render identity fields for current legal form
    if (this.#formData.legalForm) {
      identityContainer.appendChild(this.#renderIdentityFields());
    }

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        // Legal form dropdown (full width, prominent)
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [
            createElement('div', { className: 'input-wrapper' }, [
              createElement('label', { className: 'input-label' }, ['Rechtsform *']),
              legalFormSelect,
            ]),
          ]),
        ]),
        // Dynamic identity fields based on legal form
        identityContainer,
      ]),
    ]);
  }

  #renderIdentityFields() {
    const isCompany = this.#isCompanyForm();
    const fragment = createElement('div', { className: 'identity-fields' });

    if (isCompany) {
      // Company form: Firmenname + Gründungsdatum
      this.#inputs.companyName = new Input({
        id: 'wizard-companyName',
        label: 'Firmenname *',
        placeholder: 'Muster GmbH',
        value: this.#formData.companyName,
        required: true,
        onChange: (val) => this.#formData.companyName = val,
      });

      this.#inputs.foundingDate = new Input({
        id: 'wizard-foundingDate',
        label: 'Gründungsdatum',
        type: 'date',
        value: this.#formData.foundingDate,
        required: false,
        onChange: (val) => this.#formData.foundingDate = val,
      });

      fragment.appendChild(
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.companyName.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.foundingDate.element]),
        ])
      );
    } else {
      // Natural person: Vorname + Nachname + Geburtsdatum
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
        label: 'Geburtsdatum',
        type: 'date',
        value: this.#formData.birthDate,
        required: false,
        onChange: (val) => this.#formData.birthDate = val,
      });

      fragment.appendChild(
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.firstName.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.lastName.element]),
        ])
      );

      fragment.appendChild(
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.birthDate.element]),
          createElement('div', { className: 'form-col-2' }), // empty spacer
        ])
      );
    }

    // Shared fields: Email + Phone
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
      label: 'Telefon',
      type: 'tel',
      placeholder: '+49 123 456789',
      value: this.#formData.phone,
      required: false,
      onChange: (val) => this.#formData.phone = val,
    });

    fragment.appendChild(
      createElement('div', { className: 'form-row' }, [
        createElement('div', { className: 'form-col-2' }, [(() => {
          const emailEl = this.#inputs.email.element;
          if (this.#isEditMode) {
            const input = emailEl.querySelector('input');
            if (input) {
              input.readOnly = true;
              input.style.opacity = '0.6';
              input.style.cursor = 'not-allowed';
            }
          }
          return emailEl;
        })()]),
        createElement('div', { className: 'form-col-2' }, [this.#inputs.phone.element]),
      ])
    );

    // Password fields only in create mode
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

      fragment.appendChild(
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.password.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.passwordConfirm.element]),
        ])
      );
    }

    return fragment;
  }

  // ========================================
  // STEP 2: Anschrift
  // ========================================
  #renderStep2Address() {
    const addressLabel = this.#isCompanyForm() ? 'Firmenanschrift' : 'Wohnadresse';
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Anschrift']),
      createElement('p', { className: 'section-description' }, [
        `${addressLabel} (optional, kann später ergänzt werden)`
      ]),
    ]);
    this.#inputs.street = new Input({
      label: 'Straße',
      placeholder: 'Musterstraße',
      value: this.#formData.street,
      required: false,
      onChange: (val) => this.#formData.street = val,
    });

    this.#inputs.houseNumber = new Input({
      label: 'Hausnummer',
      placeholder: '123',
      value: this.#formData.houseNumber,
      required: false,
      onChange: (val) => this.#formData.houseNumber = val,
    });

    this.#inputs.postalCode = new Input({
      label: 'PLZ',
      placeholder: '12345',
      value: this.#formData.postalCode,
      required: false,
      onChange: (val) => {
        this.#formData.postalCode = val;
        if (val) this.#validatePostalCode(val);
      },
    });

    this.#inputs.city = new Input({
      label: 'Stadt',
      placeholder: 'Berlin',
      value: this.#formData.city,
      required: false,
      onChange: (val) => this.#formData.city = val,
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-3' }, [this.#inputs.street.element]),
          createElement('div', { className: 'form-col-1-quarter' }, [this.#inputs.houseNumber.element]),
        ]),
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1-quarter' }, [this.#inputs.postalCode.element]),
          createElement('div', { className: 'form-col-3' }, [this.#inputs.city.element]),
        ]),
      ]),
    ]);
  }

  // ========================================
  // STEP 3: Steuerliche Informationen
  // ========================================
  #renderStep3Tax() {
    const isEmployee = this.#isEmployeeForm();

    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Steuerliche Informationen']),
      createElement('p', { className: 'section-description' }, [
        isEmployee
          ? 'Steuer-Identifikationsnummer (optional, kann später ergänzt werden)'
          : 'Steuerliche Daten (optional, kann später ergänzt werden)',
      ]),
    ]);

    // Employee: only tax ID
    if (isEmployee) {
      this.#inputs.taxId = new Input({
        label: 'Steuer-ID',
        placeholder: '12345678901',
        value: this.#formData.taxId,
        required: false,
        onChange: (val) => {
          this.#formData.taxId = val;
          if (val) this.#validateTaxId(val);
        },
      });

      return createElement('div', { className: 'wizard-step-wrapper' }, [
        sectionHeader,
        createElement('div', { className: 'wizard-form' }, [
          this.#inputs.taxId.element,
        ]),
      ]);
    }

    // Self-employed / Company: full tax fields
    this.#inputs.taxNumber = new Input({
      label: 'Steuernummer',
      placeholder: '12/345/67890',
      value: this.#formData.taxNumber,
      required: false,
      onChange: (val) => {
        this.#formData.taxNumber = val;
        if (val) this.#validateTaxNumber(val);
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
      label: 'Finanzamt',
      placeholder: 'Finanzamt Berlin',
      value: this.#formData.taxOffice,
      required: false,
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

    this.#inputs.registrationCourt = new Input({
      label: 'Amtsgericht',
      placeholder: 'Amtsgericht Berlin',
      value: this.#formData.registrationCourt,
      required: false,
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
        this.#inputs.registrationCourt.element,
      ]),
    ]);
  }

  // ========================================
  // STEP 4: Bankdaten
  // ========================================
  #renderStep4Bank() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Bankverbindung']),
      createElement('p', { className: 'section-description' }, [
        'Bankdaten für Provisionsauszahlungen (optional, kann später ergänzt werden)'
      ]),
    ]);
    this.#inputs.iban = new Input({
      label: 'IBAN',
      placeholder: 'DE89370400440532013000',
      value: this.#formData.iban,
      required: false,
      onChange: (val) => {
        this.#formData.iban = val;
        if (val) this.#validateIBAN(val);
      },
    });

    this.#inputs.bic = new Input({
      label: 'BIC',
      placeholder: 'COBADEFFXXX',
      value: this.#formData.bic,
      required: false,
      onChange: (val) => {
        this.#formData.bic = val;
        if (val) this.#validateBIC(val);
      },
    });

    this.#inputs.bankName = new Input({
      label: 'Bankname',
      placeholder: 'Commerzbank',
      value: this.#formData.bankName,
      required: false,
      onChange: (val) => this.#formData.bankName = val,
    });

    this.#inputs.accountHolder = new Input({
      label: 'Kontoinhaber',
      placeholder: this.#isCompanyForm() ? 'Muster GmbH' : 'Max Mustermann',
      value: this.#formData.accountHolder,
      required: false,
      onChange: (val) => this.#formData.accountHolder = val,
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [this.#inputs.iban.element]),
        ]),
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-2' }, [this.#inputs.bic.element]),
          createElement('div', { className: 'form-col-2' }, [this.#inputs.bankName.element]),
        ]),
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [this.#inputs.accountHolder.element]),
        ]),
      ]),
    ]);
  }

  // ========================================
  // STEP 5: Qualifikationen
  // ========================================
  #renderStep5Qualifications() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Qualifikationen']),
      createElement('p', { className: 'section-description' }, [
        'Berufliche Qualifikationen und Zertifizierungen (optional, kann später ergänzt werden)'
      ]),
    ]);

    const qualifications = [
      { value: 'insurance_broker', label: 'Versicherungsmakler (§34d GewO)' },
      { value: 'insurance_agent', label: 'Versicherungsvertreter (§34d GewO)' },
      { value: 'financial_broker', label: 'Finanzanlagenvermittler (§34f GewO)' },
      { value: 'real_estate_loan_broker', label: 'Immobiliardarlehensvermittler (§34i GewO)' },
    ];

    const qualRows = qualifications.map(qual => {
      const isChecked = this.#formData.ihkQualifications.includes(qual.label);
      const needsRegistration = QUALIFICATIONS_REQUIRING_REGISTRATION.has(qual.label);

      // Container for registration number input (shown/hidden dynamically)
      const regNumberContainer = createElement('div', {
        className: 'qual-registration-container',
        style: (!needsRegistration || !isChecked) ? 'display: none;' : '',
      });

      if (needsRegistration) {
        const regInput = new Input({
          id: `wizard-reg-${qual.value}`,
          label: 'Vermittlernummer',
          placeholder: 'D-XXXX-XXXXX-XX',
          value: this.#formData.registrationNumbers[qual.label] || '',
          required: false,
          onChange: (val) => {
            if (val) {
              this.#formData.registrationNumbers[qual.label] = val;
            } else {
              delete this.#formData.registrationNumbers[qual.label];
            }
          },
        });
        regNumberContainer.appendChild(regInput.element);
      }

      const checkbox = createElement('input', {
        type: 'checkbox',
        value: qual.value,
        checked: isChecked,
        onchange: (e) => {
          if (e.target.checked) {
            this.#formData.ihkQualifications.push(qual.label);
            if (needsRegistration) regNumberContainer.style.display = '';
          } else {
            this.#formData.ihkQualifications = this.#formData.ihkQualifications.filter(q => q !== qual.label);
            if (needsRegistration) {
              regNumberContainer.style.display = 'none';
              delete this.#formData.registrationNumbers[qual.label];
            }
          }
        },
      });

      return createElement('div', { className: 'qual-row' }, [
        createElement('div', { className: 'qual-checkbox-row' }, [
          createElement('label', { className: 'checkbox-label' }, [
            checkbox,
            createElement('span', {}, [qual.label]),
          ]),
        ]),
        regNumberContainer,
      ]);
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form wizard-form-single-column' }, [
        createElement('div', { className: 'input-wrapper' }, [
          createElement('label', { className: 'input-label' }, ['IHK-Qualifikationen']),
          ...qualRows,
        ]),
      ]),
    ]);
  }

  // ========================================
  // STEP 6: Provisionen & Karriere
  // ========================================
  #renderStep6Provisions() {
    const sectionHeader = createElement('div', { className: 'wizard-section-header' }, [
      createElement('h3', { className: 'section-title' }, ['Karriere & Provisionen']),
      createElement('p', { className: 'section-description' }, [
        'Rangname und Provisions-Sätze (optional, Standardwerte werden verwendet)'
      ]),
    ]);
    this.#inputs.rankName = new Input({
      label: 'Rang/Karrierestufe',
      placeholder: 'Berater (Standard)',
      value: this.#formData.rankName,
      required: false,
      onChange: (val) => this.#formData.rankName = val,
    });

    this.#inputs.bankProvision = new Input({
      label: 'Bank-Provision (%)',
      type: 'number',
      placeholder: '0',
      min: '0',
      max: '100',
      step: '0.1',
      value: this.#formData.bankProvision,
      required: false,
      onChange: (val) => this.#formData.bankProvision = val,
    });

    this.#inputs.insuranceProvision = new Input({
      label: 'Versicherung-Provision (%)',
      type: 'number',
      placeholder: '0',
      min: '0',
      max: '100',
      step: '0.1',
      value: this.#formData.insuranceProvision,
      required: false,
      onChange: (val) => this.#formData.insuranceProvision = val,
    });

    this.#inputs.realEstateProvision = new Input({
      label: 'Immobilien-Provision (%)',
      type: 'number',
      placeholder: '0',
      min: '0',
      max: '100',
      step: '0.1',
      value: this.#formData.realEstateProvision,
      required: false,
      onChange: (val) => this.#formData.realEstateProvision = val,
    });

    return createElement('div', { className: 'wizard-step-wrapper' }, [
      sectionHeader,
      createElement('div', { className: 'wizard-form-manual' }, [
        createElement('div', { className: 'form-row' }, [
          createElement('div', { className: 'form-col-1' }, [this.#inputs.rankName.element]),
        ]),
        createElement('div', { className: 'form-row-3-cols' }, [
          this.#inputs.bankProvision.element,
          this.#inputs.insuranceProvision.element,
          this.#inputs.realEstateProvision.element,
        ]),
      ]),
    ]);
  }

  // ========================================
  // NAVIGATION
  // ========================================
  #renderNavigation() {
    const buttons = [];

    Logger.log('Navigation render - Edit Mode:', this.#isEditMode, 'Step:', this.#currentStep);

    // Delete button (visible in edit mode, but NOT for Geschäftsführer)
    if (this.#isEditMode && !this.#isGeschaeftsfuehrer) {
      Logger.log('Showing delete button');
      const deleteBtn = new Button({
        label: 'Account löschen',
        variant: 'secondary',
        onClick: () => this.#handleDelete(),
      }).element;

      deleteBtn.classList.add('btn-danger');
      deleteBtn.style.cssText = `
        background: white;
        color: #dc2626;
        border: 2px solid #dc2626;
        font-weight: 600;
      `;

      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = '#dc2626';
        deleteBtn.style.color = 'white';
      });
      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'white';
        deleteBtn.style.color = '#dc2626';
      });

      buttons.push(deleteBtn);
    }

    // Cancel button (always visible)
    buttons.push(
      new Button({
        label: 'Abbrechen',
        variant: 'ghost',
        onClick: () => this.#handleCancel(),
      }).element
    );

    // Back button (visible from second step onwards)
    if (this.#currentStep > this.#firstStep) {
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
    Logger.log('Delete button clicked');

    if (this.#isDeleting) {
      Logger.log('Delete already in progress, ignoring click');
      return;
    }

    this.#isDeleting = true;

    const confirmed = confirm(
      'WARNUNG: Account komplett löschen?\n\n' +
      'Dies löscht ALLE Daten:\n' +
      '- Mitarbeiter-Profil\n' +
      '- Alle Umsatz-Einträge\n' +
      '- Login-Account\n' +
      '- Position im Organigramm\n\n' +
      'Diese Aktion kann NICHT rückgängig gemacht werden!'
    );

    if (!confirmed) {
      this.#isDeleting = false;
      return;
    }

    const doubleConfirmed = confirm(
      'LETZTE BESTÄTIGUNG:\n\n' +
      `Account "${this.#formData.email}" wird unwiderruflich gelöscht.\n\n` +
      'Fortfahren?'
    );

    if (!doubleConfirmed) {
      this.#isDeleting = false;
      return;
    }

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
      Logger.error('onDelete callback not provided');
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
    if (this.#currentStep > this.#firstStep) {
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

    const exitClass = direction === 'forward' ? 'step-exit-right' : 'step-exit-left';
    stepContent.classList.add(exitClass);

    setTimeout(() => {
      callback();

      requestAnimationFrame(() => {
        const newStepContent = this.#element.querySelector('.wizard-step-content');
        if (newStepContent) {
          const enterClass = direction === 'forward' ? 'step-enter-right' : 'step-enter-left';
          newStepContent.classList.add(enterClass);

          setTimeout(() => {
            newStepContent.classList.remove(enterClass);
          }, 400);
        }
      });
    }, 300);
  }

  #validateCurrentStep() {
    switch (this.#currentStep) {
      case 1: {
        if (!this.#formData.legalForm) {
          alert('Bitte wählen Sie eine Rechtsform');
          return false;
        }

        if (this.#isCompanyForm()) {
          if (!this.#formData.companyName?.trim()) {
            alert('Firmenname ist ein Pflichtfeld');
            return false;
          }
        } else {
          if (!this.#formData.firstName?.trim() || !this.#formData.lastName?.trim()) {
            alert('Vor- und Nachname sind Pflichtfelder');
            return false;
          }
        }

        if (!this.#formData.email?.trim()) {
          alert('E-Mail-Adresse ist ein Pflichtfeld');
          return false;
        }

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
      }
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
        break;
    }
    return true;
  }

  #refresh() {
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
    setTimeout(() => {
      const firstInput = this.#element.querySelector('select, input[type="text"], input[type="email"]');
      firstInput?.focus();
    }, 100);
  }

  remove() {
    this.#element.remove();
  }

  get element() {
    return this.#element;
  }

  #getGfDefaultProvision(type) {
    const node = this.#props.existingNode;
    if (node?.id) {
      const gfConfig = getGeschaeftsfuehrerConfig(node.id);
      if (gfConfig) return gfConfig.defaultProvisions[type] || 90;
    }
    return 90;
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

  #validateTaxId(taxId) {
    if (!taxId) return;

    const cleaned = taxId.replace(/[\s\-]/g, '');
    if (cleaned.length !== 11 || !/^\d+$/.test(cleaned)) {
      this.#inputs.taxId?.setError('Steuer-ID: Genau 11 Ziffern');
      return false;
    }

    this.#inputs.taxId?.setError(null);
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

    const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());

    try {
      const checksum = BigInt(numeric) % 97n;
      if (checksum !== 1n) {
        this.#inputs.iban?.setError('IBAN Prüfsumme ungültig');
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
