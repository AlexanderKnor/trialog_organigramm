/**
 * Molecule: NodeEditor
 * Form for editing node properties
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Input } from '../atoms/Input.js';
import { Button } from '../atoms/Button.js';
import { Icon } from '../atoms/Icon.js';

export class NodeEditor {
  #element;
  #node;
  #props;
  #nameInput;
  #descriptionInput;
  #emailInput;
  #phoneInput;
  #passwordInput;
  #passwordConfirmInput;
  #bankProvisionInput;
  #realEstateProvisionInput;
  #insuranceProvisionInput;

  constructor(node, props = {}) {
    this.#node = node;
    this.#props = {
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
      onDelete: props.onDelete || null,
      className: props.className || '',
    };

    this.#element = this.#render();
  }

  #render() {
    // Form fields - Basic info
    this.#nameInput = new Input({
      label: 'Name',
      value: this.#node?.name || '',
      placeholder: 'Name eingeben...',
      required: true,
    });

    this.#descriptionInput = new Input({
      label: 'Beschreibung',
      value: this.#node?.description || '',
      placeholder: 'Optionale Beschreibung...',
    });

    // Contact info fields
    this.#emailInput = new Input({
      label: 'E-Mail',
      value: this.#node?.email || '',
      placeholder: 'email@example.com',
      type: 'email',
    });

    this.#phoneInput = new Input({
      label: 'Telefon',
      value: this.#node?.phone || '',
      placeholder: '+49 123 456789',
      type: 'tel',
    });

    // Password fields (only for new nodes with email)
    const isNewNode = !this.#node;
    if (isNewNode) {
      this.#passwordInput = new Input({
        label: 'Passwort (für Login-Account)',
        value: '',
        placeholder: 'Mindestens 6 Zeichen',
        type: 'password',
      });

      this.#passwordConfirmInput = new Input({
        label: 'Passwort wiederholen',
        value: '',
        placeholder: 'Passwort bestätigen',
        type: 'password',
      });
    }

    // Provision fields
    this.#bankProvisionInput = new Input({
      label: 'Bank',
      value: this.#node?.bankProvision?.toString() || '0',
      placeholder: '0',
      type: 'number',
    });

    this.#realEstateProvisionInput = new Input({
      label: 'Immobilien',
      value: this.#node?.realEstateProvision?.toString() || '0',
      placeholder: '0',
      type: 'number',
    });

    this.#insuranceProvisionInput = new Input({
      label: 'Versicherung',
      value: this.#node?.insuranceProvision?.toString() || '0',
      placeholder: '0',
      type: 'number',
    });

    // Basic info section
    const basicSection = createElement('div', { className: 'editor-section-group' }, [
      this.#nameInput.element,
      this.#descriptionInput.element,
    ]);

    // Contact section
    const contactFields = [
      createElement('div', { className: 'editor-row-2' }, [
        this.#emailInput.element,
        this.#phoneInput.element,
      ]),
    ];

    // Add password fields for new nodes
    if (isNewNode && this.#passwordInput) {
      contactFields.push(
        createElement('div', { className: 'editor-row-2' }, [
          this.#passwordInput.element,
          this.#passwordConfirmInput.element,
        ])
      );
    }

    const contactSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Kontakt & Account']),
      ...contactFields,
    ]);

    // Provision section
    const provisionSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Provisionen (%)']),
      createElement('div', { className: 'editor-row-3' }, [
        this.#bankProvisionInput.element,
        this.#realEstateProvisionInput.element,
        this.#insuranceProvisionInput.element,
      ]),
    ]);

    // Unified action bar
    const deleteButton = this.#node && !this.#node.isRoot
      ? new Button({
          label: 'Löschen',
          variant: 'ghost',
          size: 'sm',
          className: 'btn-delete',
          onClick: () => {
            if (this.#props.onDelete) {
              this.#props.onDelete(this.#node.id);
            }
          },
        }).element
      : null;

    const actionsBar = createElement('div', { className: 'editor-actions-bar' }, [
      // Left side: Delete button (if available)
      createElement('div', { className: 'editor-actions-left' }, [
        deleteButton,
      ].filter(Boolean)),
      // Right side: Cancel and Save
      createElement('div', { className: 'editor-actions-right' }, [
        new Button({
          label: 'Abbrechen',
          variant: 'ghost',
          size: 'sm',
          onClick: () => {
            if (this.#props.onCancel) {
              this.#props.onCancel();
            }
          },
        }).element,
        new Button({
          label: 'Speichern',
          variant: 'primary',
          size: 'sm',
          icon: new Icon({ name: 'check', size: 14 }),
          onClick: () => this.#handleSave(),
        }).element,
      ]),
    ]);

    return createElement('div', {
      className: `node-editor ${this.#props.className}`,
    }, [
      basicSection,
      contactSection,
      provisionSection,
      actionsBar,
    ]);
  }

  #handleSave() {
    const name = this.#nameInput.value.trim();
    const email = this.#emailInput.value.trim();

    if (!name) {
      this.#nameInput.setError('Name ist erforderlich');
      return;
    }

    // For new nodes with email, require password
    const isNewNode = !this.#node;
    if (isNewNode && email && this.#passwordInput) {
      const password = this.#passwordInput.value;
      const passwordConfirm = this.#passwordConfirmInput.value;

      // Clear previous errors
      this.#passwordInput.setError(null);
      this.#passwordConfirmInput.setError(null);

      // Check if password is provided
      if (!password || password.length < 6) {
        this.#passwordInput.setError('Passwort muss mindestens 6 Zeichen lang sein');
        return;
      }

      // Check if passwords match
      if (password !== passwordConfirm) {
        this.#passwordConfirmInput.setError('Passwörter stimmen nicht überein');
        return;
      }
    }

    const data = {
      name,
      description: this.#descriptionInput.value.trim(),
      email,
      phone: this.#phoneInput.value.trim(),
      bankProvision: parseFloat(this.#bankProvisionInput.value) || 0,
      realEstateProvision: parseFloat(this.#realEstateProvisionInput.value) || 0,
      insuranceProvision: parseFloat(this.#insuranceProvisionInput.value) || 0,
    };

    // Add password for new nodes
    if (isNewNode && this.#passwordInput) {
      data.password = this.#passwordInput.value;
    }

    if (this.#props.onSave) {
      this.#props.onSave(data);
    }
  }

  get element() {
    return this.#element;
  }

  focus() {
    this.#nameInput.focus();
  }

  reset() {
    this.#nameInput.value = this.#node?.name || '';
    this.#descriptionInput.value = this.#node?.description || '';
    this.#emailInput.value = this.#node?.email || '';
    this.#phoneInput.value = this.#node?.phone || '';
    this.#bankProvisionInput.value = this.#node?.bankProvision?.toString() || '0';
    this.#realEstateProvisionInput.value = this.#node?.realEstateProvision?.toString() || '0';
    this.#insuranceProvisionInput.value = this.#node?.insuranceProvision?.toString() || '0';
    this.#nameInput.setError(null);
  }
}
