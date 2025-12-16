/**
 * Molecule: AddRevenueDialog
 * Dialog for adding new revenue entries
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import {
  RevenueCategory,
  REVENUE_CATEGORY_TYPES,
} from '../../../domain/value-objects/RevenueCategory.js';
import { Product } from '../../../domain/value-objects/Product.js';
import { ProductProvider } from '../../../domain/value-objects/ProductProvider.js';

export class AddRevenueDialog {
  #element;
  #props;
  #formData;
  #entry; // Existing entry for edit mode
  #isEditMode;

  // Form inputs
  #dateInput;
  #customerNameInput;
  #streetInput;
  #houseNumberInput;
  #postalCodeInput;
  #cityInput;
  #categorySelect;
  #productSelect;
  #providerSelect;
  #propertyAddressInput;
  #contractNumberInput;
  #provisionAmountInput;
  #notesInput;

  constructor(props = {}) {
    this.#entry = props.entry || null;
    this.#isEditMode = !!this.#entry;

    this.#props = {
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
      className: props.className || '',
    };

    this.#formData = {
      category: this.#entry?.category?.type || REVENUE_CATEGORY_TYPES.BANK,
      product: null,
      provider: null,
    };

    this.#element = this.#render();

    // Populate form if editing
    if (this.#isEditMode) {
      this.#populateForm();
    }
  }

  #populateForm() {
    if (!this.#entry) return;

    // Set customer name
    this.#customerNameInput.setValue(this.#entry.customerName || '');

    // Set address
    const addr = this.#entry.customerAddress || {};
    this.#streetInput.setValue(addr.street || '');
    this.#houseNumberInput.setValue(addr.houseNumber || '');
    this.#postalCodeInput.setValue(addr.postalCode || '');
    this.#cityInput.setValue(addr.city || '');

    // Set category and update dependent selects
    const categoryType = this.#entry.category?.type || REVENUE_CATEGORY_TYPES.BANK;
    this.#categorySelect.value = categoryType;
    this.#onCategoryChange(categoryType);

    // Set product (after options are updated)
    if (this.#entry.product?.name) {
      this.#productSelect.value = this.#entry.product.name;
    }

    // Set provider
    if (this.#entry.productProvider?.name) {
      if (ProductProvider.requiresFreeTextProvider(categoryType)) {
        this.#propertyAddressInput.setValue(this.#entry.propertyAddress || this.#entry.productProvider.name || '');
      } else {
        this.#providerSelect.value = this.#entry.productProvider.name;
      }
    }

    // Set date
    if (this.#entry.entryDate) {
      const dateStr = new Date(this.#entry.entryDate).toISOString().split('T')[0];
      this.#dateInput.setValue(dateStr);
    }

    // Set other fields
    this.#contractNumberInput.setValue(this.#entry.contractNumber || '');
    this.#provisionAmountInput.setValue(this.#entry.provisionAmount?.toString() || '');
    this.#notesInput.setValue(this.#entry.notes || '');
  }

  #render() {
    const overlay = createElement('div', { className: 'dialog-overlay' });

    // Date field with today's date as default
    const today = new Date().toISOString().split('T')[0];
    this.#dateInput = new Input({
      label: 'Datum',
      type: 'date',
      value: today,
      required: true,
    });

    // Customer Name
    this.#customerNameInput = new Input({
      label: 'Kundenname',
      placeholder: 'Max Mustermann',
      required: true,
    });

    // Address fields
    this.#streetInput = new Input({
      label: 'Strasse',
      placeholder: 'Musterstrasse',
    });

    this.#houseNumberInput = new Input({
      label: 'Hausnr.',
      placeholder: '123',
    });

    this.#postalCodeInput = new Input({
      label: 'PLZ',
      placeholder: '12345',
    });

    this.#cityInput = new Input({
      label: 'Stadt',
      placeholder: 'Musterstadt',
    });

    // Category select
    const categoryOptions = RevenueCategory.allCategories.map((cat) =>
      createElement('option', { value: cat.type }, [cat.displayName]),
    );

    this.#categorySelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onCategoryChange(e.target.value),
    }, categoryOptions);

    // Product select
    this.#productSelect = createElement('select', {
      className: 'input-field',
    });
    this.#updateProductOptions(REVENUE_CATEGORY_TYPES.BANK);

    // Provider select (or property address input)
    this.#providerSelect = createElement('select', {
      className: 'input-field',
    });
    this.#updateProviderOptions(REVENUE_CATEGORY_TYPES.BANK);

    // Property address input (for real estate categories)
    this.#propertyAddressInput = new Input({
      label: 'Objektadresse',
      placeholder: 'Adresse des Objekts',
    });

    // Contract number
    this.#contractNumberInput = new Input({
      label: 'Vertragsnummer',
      placeholder: 'ABC-123456',
      required: true,
    });

    // Provision amount
    this.#provisionAmountInput = new Input({
      label: 'Umsatz (EUR)',
      placeholder: '0.00',
      type: 'number',
      required: true,
    });

    // Notes
    this.#notesInput = new Input({
      label: 'Notizen',
      placeholder: 'Optionale Notizen...',
    });

    // Form layout
    const addressRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-3' }, [
        this.#streetInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#houseNumberInput.element,
      ]),
    ]);

    const cityRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#postalCodeInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-2' }, [
        this.#cityInput.element,
      ]),
    ]);

    const categoryWrapper = createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Kategorie']),
      this.#categorySelect,
    ]);

    const productWrapper = createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Produkt']),
      this.#productSelect,
    ]);

    const providerWrapper = createElement('div', {
      className: 'input-wrapper provider-wrapper',
    }, [
      createElement('label', { className: 'input-label' }, ['Produktgeber']),
      this.#providerSelect,
    ]);

    const propertyAddressWrapper = createElement('div', {
      className: 'input-wrapper property-address-wrapper hidden',
    }, [
      this.#propertyAddressInput.element,
    ]);

    const selectionRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [categoryWrapper]),
      createElement('div', { className: 'dialog-form-col-1' }, [productWrapper]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        providerWrapper,
        propertyAddressWrapper,
      ]),
    ]);

    const dateAndContractRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#dateInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#contractNumberInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#provisionAmountInput.element,
      ]),
    ]);

    // Actions
    const cancelBtn = new Button({
      label: 'Abbrechen',
      variant: 'ghost',
      onClick: () => this.#handleCancel(),
    });

    const saveBtn = new Button({
      label: 'Speichern',
      variant: 'primary',
      onClick: () => this.#handleSave(),
    });

    const actions = createElement('div', { className: 'dialog-actions' }, [
      cancelBtn.element,
      saveBtn.element,
    ]);

    const dialogTitle = this.#isEditMode ? 'Umsatz bearbeiten' : 'Neuer Umsatz';
    const content = createElement('div', { className: 'dialog-content dialog-wide' }, [
      createElement('h2', { className: 'dialog-title' }, [dialogTitle]),
      createElement('div', { className: 'dialog-form' }, [
        this.#customerNameInput.element,
        addressRow,
        cityRow,
        selectionRow,
        dateAndContractRow,
        this.#notesInput.element,
      ]),
      actions,
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

  #onCategoryChange(categoryType) {
    this.#formData.category = categoryType;
    this.#updateProductOptions(categoryType);
    this.#updateProviderOptions(categoryType);

    // Toggle property address field visibility
    const providerWrapper = this.#element.querySelector('.provider-wrapper');
    const propertyAddressWrapper = this.#element.querySelector('.property-address-wrapper');

    if (ProductProvider.requiresFreeTextProvider(categoryType)) {
      providerWrapper.classList.add('hidden');
      propertyAddressWrapper.classList.remove('hidden');
    } else {
      providerWrapper.classList.remove('hidden');
      propertyAddressWrapper.classList.add('hidden');
    }
  }

  #updateProductOptions(categoryType) {
    const products = Product.getProductsForCategory(categoryType);
    this.#productSelect.innerHTML = '';

    products.forEach((product) => {
      const option = createElement('option', { value: product.name }, [product.name]);
      this.#productSelect.appendChild(option);
    });

    if (products.length > 0) {
      this.#formData.product = products[0];
    }
  }

  #updateProviderOptions(categoryType) {
    const providers = ProductProvider.getProvidersForCategory(categoryType);
    this.#providerSelect.innerHTML = '';

    providers.forEach((provider) => {
      const option = createElement('option', { value: provider.name }, [provider.name]);
      this.#providerSelect.appendChild(option);
    });

    if (providers.length > 0) {
      this.#formData.provider = providers[0];
    }
  }

  #handleSave() {
    const customerName = this.#customerNameInput.value.trim();
    const contractNumber = this.#contractNumberInput.value.trim();
    const provisionAmount = parseFloat(this.#provisionAmountInput.value) || 0;

    // Validation
    if (!customerName) {
      this.#customerNameInput.setError('Kundenname ist erforderlich');
      return;
    }

    if (!contractNumber) {
      this.#contractNumberInput.setError('Vertragsnummer ist erforderlich');
      return;
    }

    if (provisionAmount <= 0) {
      this.#provisionAmountInput.setError('Umsatz muss groesser als 0 sein');
      return;
    }

    const categoryType = this.#categorySelect.value;
    const productName = this.#productSelect.value;
    const providerName = this.#providerSelect.value;
    const propertyAddress = this.#propertyAddressInput.value.trim();
    const entryDate = this.#dateInput.value || new Date().toISOString().split('T')[0];

    const data = {
      customerName,
      entryDate: new Date(entryDate).toISOString(),
      customerAddress: {
        street: this.#streetInput.value.trim(),
        houseNumber: this.#houseNumberInput.value.trim(),
        postalCode: this.#postalCodeInput.value.trim(),
        city: this.#cityInput.value.trim(),
      },
      category: categoryType,
      product: {
        name: productName,
        category: categoryType,
      },
      productProvider: {
        name: ProductProvider.requiresFreeTextProvider(categoryType)
          ? propertyAddress || 'N/A'
          : providerName,
        category: categoryType,
      },
      propertyAddress: ProductProvider.requiresFreeTextProvider(categoryType)
        ? propertyAddress
        : null,
      contractNumber,
      provisionAmount,
      notes: this.#notesInput.value.trim(),
    };

    // Include entry ID if editing
    if (this.#isEditMode && this.#entry) {
      data.id = this.#entry.id;
    }

    this.#props.onSave?.(data);
  }

  #handleCancel() {
    this.#props.onCancel?.();
    this.remove();
  }

  get element() {
    return this.#element;
  }

  show() {
    document.body.appendChild(this.#element);
    this.#customerNameInput.focus();
  }

  remove() {
    this.#element.remove();
  }
}
