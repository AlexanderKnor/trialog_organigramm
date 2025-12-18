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
  #revenueService;

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

  // Dynamic catalog data
  #categories;
  #currentCategoryData;

  constructor(props = {}) {
    this.#entry = props.entry || null;
    this.#isEditMode = !!this.#entry;
    this.#revenueService = props.revenueService || null;

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

    this.#categories = [];
    this.#currentCategoryData = null;

    this.#element = this.#render();

    // Load categories and initialize form
    this.#initializeForm();
  }

  async #initializeForm() {
    // Load categories from catalog
    await this.#loadCategories();

    // Populate form if editing
    if (this.#isEditMode) {
      await this.#populateForm();
    } else {
      // Initialize with first category
      if (this.#categories.length > 0) {
        const firstCategoryType = this.#categories[0].type || this.#categories[0];
        await this.#onCategoryChange(firstCategoryType);
      }
    }
  }

  async #populateForm() {
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
    await this.#onCategoryChange(categoryType);

    // Set product (after options are updated)
    if (this.#entry.product?.name) {
      this.#productSelect.value = this.#entry.product.name;
    }

    // Set provider
    if (this.#entry.productProvider?.name) {
      const requiresPropertyAddress = this.#currentCategoryData?.requiresPropertyAddress ||
        ProductProvider.requiresFreeTextProvider(categoryType);

      if (requiresPropertyAddress) {
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

    // Category select (will be populated dynamically)
    this.#categorySelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onCategoryChange(e.target.value),
    }, [createElement('option', {}, ['Kategorien werden geladen...'])]);

    // Product select (will be populated dynamically)
    this.#productSelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onProductChange(e.target.value),
    }, [createElement('option', {}, ['Produkte werden geladen...'])]);

    // Provider select (will be populated dynamically)
    this.#providerSelect = createElement('select', {
      className: 'input-field',
    }, [createElement('option', {}, ['Produktgeber werden geladen...'])]);

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

  async #loadCategories() {
    if (!this.#revenueService) {
      // Fallback to hardcoded categories
      this.#categories = RevenueCategory.allCategories;
      this.#populateCategorySelect();
      return;
    }

    try {
      this.#categories = await this.#revenueService.getAvailableCategories();
      this.#populateCategorySelect();
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to hardcoded
      this.#categories = RevenueCategory.allCategories;
      this.#populateCategorySelect();
    }
  }

  #populateCategorySelect() {
    this.#categorySelect.innerHTML = '';

    this.#categories.forEach((category) => {
      const displayName = category.displayName || category.toString();
      const type = category.type || category;
      const option = createElement('option', { value: type }, [displayName]);
      this.#categorySelect.appendChild(option);
    });
  }

  async #onCategoryChange(categoryType) {
    this.#formData.category = categoryType;

    // Load category data to check requiresPropertyAddress
    if (this.#revenueService) {
      try {
        this.#currentCategoryData = await this.#revenueService.getCategoryByType(categoryType);
      } catch (error) {
        console.warn('Failed to load category data:', error);
        this.#currentCategoryData = null;
      }
    }

    await this.#updateProductOptions(categoryType);
    // Providers are loaded automatically in #updateProductOptions() for first product

    // Toggle property address field visibility
    const providerWrapper = this.#element.querySelector('.provider-wrapper');
    const propertyAddressWrapper = this.#element.querySelector('.property-address-wrapper');

    const requiresPropertyAddress = this.#currentCategoryData?.requiresPropertyAddress ||
      ProductProvider.requiresFreeTextProvider(categoryType);

    if (requiresPropertyAddress) {
      providerWrapper.classList.add('hidden');
      propertyAddressWrapper.classList.remove('hidden');
    } else {
      providerWrapper.classList.remove('hidden');
      propertyAddressWrapper.classList.add('hidden');
    }
  }

  async #updateProductOptions(categoryType) {
    let products = [];

    // Try to load from catalog via RevenueService
    if (this.#revenueService) {
      try {
        products = await this.#revenueService.getProductsForCategory(categoryType);
      } catch (error) {
        console.warn('Failed to load products from catalog, using fallback:', error);
        products = Product.getProductsForCategory(categoryType);
      }
    } else {
      // Fallback to hardcoded
      products = Product.getProductsForCategory(categoryType);
    }

    this.#productSelect.innerHTML = '';

    products.forEach((product) => {
      const name = product.name || product;
      const productId = product.id || name;
      const option = createElement('option', { value: productId }, [name]);
      option.dataset.productName = name;
      option.dataset.productId = productId;
      this.#productSelect.appendChild(option);
    });

    if (products.length > 0) {
      this.#formData.product = products[0];
      // Update providers for first product
      if (products[0].id) {
        await this.#updateProviderOptionsForProduct(products[0].id);
      } else {
        await this.#updateProviderOptions(categoryType);
      }
    }
  }

  async #onProductChange(productValue) {
    // Find selected option
    const selectedOption = Array.from(this.#productSelect.options).find(opt => opt.value === productValue);
    const productId = selectedOption?.dataset.productId;
    const productName = selectedOption?.dataset.productName || productValue;

    this.#formData.product = { id: productId, name: productName };

    // Update providers for this specific product
    if (productId && productId !== productName) {
      await this.#updateProviderOptionsForProduct(productId);
    } else {
      await this.#updateProviderOptions(this.#formData.category);
    }
  }

  async #updateProviderOptionsForProduct(productId) {
    let providers = [];

    // Load providers for specific product
    if (this.#revenueService && this.#revenueService.getProvidersForProduct) {
      try {
        providers = await this.#revenueService.getProvidersForProduct(productId);
      } catch (error) {
        console.error('Failed to load providers for product:', error);
        await this.#updateProviderOptions(this.#formData.category);
        return;
      }
    } else {
      await this.#updateProviderOptions(this.#formData.category);
      return;
    }

    this.#providerSelect.innerHTML = '';

    providers.forEach((provider) => {
      const name = provider.name || provider;
      const option = createElement('option', { value: name }, [name]);
      this.#providerSelect.appendChild(option);
    });

    if (providers.length > 0) {
      this.#formData.provider = providers[0];
    }
  }

  async #updateProviderOptions(categoryType) {
    let providers = [];

    // Try to load from catalog via RevenueService
    if (this.#revenueService) {
      try {
        providers = await this.#revenueService.getProvidersForCategory(categoryType);
      } catch (error) {
        console.warn('Failed to load providers from catalog, using fallback:', error);
        providers = ProductProvider.getProvidersForCategory(categoryType);
      }
    } else {
      // Fallback to hardcoded
      providers = ProductProvider.getProvidersForCategory(categoryType);
    }

    this.#providerSelect.innerHTML = '';

    providers.forEach((provider) => {
      const name = provider.name || provider;
      const option = createElement('option', { value: name }, [name]);
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

    // Extract product ID and name from selected option
    const productValue = this.#productSelect.value;
    const selectedProductOption = this.#productSelect.querySelector('option:checked');
    const productId = selectedProductOption?.dataset.productId || productValue;
    const productName = selectedProductOption?.dataset.productName || productValue;

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
        id: productId,
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
