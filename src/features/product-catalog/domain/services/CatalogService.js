/**
 * Domain Service: CatalogService
 * Orchestrates catalog management operations
 */

import { CategoryDefinition } from '../entities/CategoryDefinition.js';
import { ProductDefinition } from '../entities/ProductDefinition.js';
import { ProviderDefinition } from '../entities/ProviderDefinition.js';
import { ValidationError, NotFoundError } from '../../../../core/errors/index.js';
import { Logger } from './../../../../core/utils/logger.js';

export class CatalogService {
  #catalogRepository;
  #revenueService;

  constructor(catalogRepository, revenueService = null) {
    this.#catalogRepository = catalogRepository;
    this.#revenueService = revenueService;
  }

  /**
   * Set RevenueService dependency (for resolving circular dependency)
   */
  setRevenueService(revenueService) {
    this.#revenueService = revenueService;
  }

  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async createCategory(categoryData) {
    // Validate unique type
    const existing = await this.#catalogRepository.findCategoryByType(categoryData.type);
    if (existing) {
      throw new ValidationError(`Eine Kategorie mit dem Typ '${categoryData.type}' existiert bereits`, 'type');
    }

    const category = CategoryDefinition.create(
      categoryData.type,
      categoryData.displayName,
      categoryData.provisionType
    );

    if (categoryData.requiresPropertyAddress !== undefined) {
      category.updateRequiresPropertyAddress(categoryData.requiresPropertyAddress);
    }

    if (categoryData.order !== undefined) {
      category.updateOrder(categoryData.order);
    }

    await this.#catalogRepository.saveCategory(category);
    Logger.log(`✓ Category created: ${category.displayName} (${category.type})`);

    return category;
  }

  async updateCategory(categoryType, updates) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    if (updates.displayName !== undefined) {
      category.updateDisplayName(updates.displayName);
    }

    if (updates.provisionType !== undefined) {
      category.updateProvisionType(updates.provisionType);
    }

    if (updates.requiresPropertyAddress !== undefined) {
      category.updateRequiresPropertyAddress(updates.requiresPropertyAddress);
    }

    if (updates.order !== undefined) {
      category.updateOrder(updates.order);
    }

    await this.#catalogRepository.saveCategory(category);
    Logger.log(`✓ Category updated: ${category.displayName}`);

    return category;
  }

  async deleteCategory(categoryType) {
    // CRITICAL: Check if used in revenue entries (CANNOT delete if in use)
    if (this.#revenueService) {
      const usageInfo = await this.#checkCategoryInUse(categoryType);
      if (usageInfo.inUse) {
        throw new ValidationError(
          `Kategorie kann nicht gelöscht werden: ${usageInfo.revenueCount} Umsatz-Einträge verwenden diese Kategorie`,
          'categoryType'
        );
      }
    }

    // CASCADE DELETE: Delete all products in this category
    // (Products will cascade-delete their providers automatically)
    const products = await this.#catalogRepository.findProductsByCategory(categoryType, true);
    Logger.log(`🔄 Cascading delete: Deleting ${products.length} product(s) in category '${categoryType}'`);

    let totalProvidersDeleted = 0;
    for (const product of products) {
      const providers = await this.#catalogRepository.findProvidersByProduct(product.id, true);
      totalProvidersDeleted += providers.length;
      await this.deleteProduct(product.id);  // Cascade deletes providers
    }

    // Delete the category itself
    await this.#catalogRepository.deleteCategory(categoryType);
    Logger.log(`✅ Category deleted with cascade: ${categoryType} (${products.length} products, ${totalProvidersDeleted} providers)`);
  }

  async deactivateCategory(categoryType) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    category.deactivate();
    await this.#catalogRepository.saveCategory(category);
    Logger.log(`✓ Category deactivated: ${category.displayName}`);

    return category;
  }

  async activateCategory(categoryType) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    category.activate();
    await this.#catalogRepository.saveCategory(category);
    Logger.log(`✓ Category activated: ${category.displayName}`);

    return category;
  }

  async getAllCategories(includeInactive = false) {
    return await this.#catalogRepository.findAllCategories(includeInactive);
  }

  async getCategoryByType(categoryType) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);
    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }
    return category;
  }

  // ========================================
  // PRODUCT OPERATIONS
  // ========================================

  async createProduct(categoryType, productData) {
    // Validate category exists
    const category = await this.#catalogRepository.findCategoryByType(categoryType);
    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    // Validate unique product name within category
    const existingProduct = await this.#catalogRepository.findProductByNameInCategory(
      categoryType,
      productData.name
    );
    if (existingProduct) {
      throw new ValidationError(
        `Ein Produkt mit dem Namen "${productData.name}" existiert bereits in dieser Kategorie`,
        'name'
      );
    }

    const product = ProductDefinition.create(categoryType, productData.name);

    if (productData.order !== undefined) {
      product.updateOrder(productData.order);
    }

    if (productData.isVatExempt !== undefined) {
      product.updateIsVatExempt(productData.isVatExempt);
    }

    await this.#catalogRepository.saveProduct(product);
    Logger.log(`✓ Product created: ${product.name} in category ${categoryType} (VAT exempt: ${product.isVatExempt})`);

    return product;
  }

  async updateProduct(productId, updates) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    // If name is being updated, validate uniqueness
    if (updates.name !== undefined && updates.name !== product.name) {
      const categoryType = updates.categoryType !== undefined ? updates.categoryType : product.categoryType;
      const existingProduct = await this.#catalogRepository.findProductByNameInCategory(
        categoryType,
        updates.name,
        productId // Exclude current product from check
      );
      if (existingProduct) {
        throw new ValidationError(
          `Ein Produkt mit dem Namen "${updates.name}" existiert bereits in dieser Kategorie`,
          'name'
        );
      }
      product.updateName(updates.name);
    }

    if (updates.categoryType !== undefined) {
      product.updateCategoryType(updates.categoryType);
    }

    if (updates.order !== undefined) {
      product.updateOrder(updates.order);
    }

    if (updates.isVatExempt !== undefined) {
      product.updateIsVatExempt(updates.isVatExempt);
    }

    await this.#catalogRepository.saveProduct(product);
    Logger.log(`✓ Product updated: ${product.name} (category: ${product.categoryType}, VAT exempt: ${product.isVatExempt})`);

    return product;
  }

  async deleteProduct(productId) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    // Check if used in revenue entries (if revenueService available)
    if (this.#revenueService) {
      const usageInfo = await this.#checkProductInUse(product.name, product.categoryType);
      if (usageInfo.inUse) {
        throw new ValidationError(
          `Produkt kann nicht gelöscht werden: ${usageInfo.revenueCount} Umsatz-Einträge verwenden dieses Produkt`,
          'productId'
        );
      }
    }

    // CASCADE DELETE: Delete all providers for this product
    const providers = await this.#catalogRepository.findProvidersByProduct(productId, true);
    Logger.log(`🔄 Cascading delete: Deleting ${providers.length} provider(s) for product '${product.name}'`);
    for (const provider of providers) {
      await this.deleteProvider(provider.id);
    }

    await this.#catalogRepository.deleteProduct(productId);
    Logger.log(`✅ Product deleted with cascade: ${product.name} (${providers.length} providers)`);
  }

  async deactivateProduct(productId) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    product.deactivate();
    await this.#catalogRepository.saveProduct(product);
    Logger.log(`✓ Product deactivated: ${product.name}`);

    return product;
  }

  async activateProduct(productId) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    product.activate();
    await this.#catalogRepository.saveProduct(product);
    Logger.log(`✓ Product activated: ${product.name}`);

    return product;
  }

  async getProductsByCategory(categoryType, includeInactive = false) {
    return await this.#catalogRepository.findProductsByCategory(categoryType, includeInactive);
  }

  async getAllProducts(includeInactive = false) {
    return await this.#catalogRepository.findAllProducts(includeInactive);
  }

  // ========================================
  // PROVIDER OPERATIONS
  // ========================================

  async createProvider(productId, providerData) {
    // Validate product exists
    const product = await this.#catalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    // Validate unique provider name within product
    const existingProvider = await this.#catalogRepository.findProviderByNameInProduct(
      productId,
      providerData.name
    );
    if (existingProvider) {
      throw new ValidationError(
        `Ein Produktgeber mit dem Namen "${providerData.name}" existiert bereits für dieses Produkt`,
        'name'
      );
    }

    const provider = ProviderDefinition.create(productId, providerData.name);

    if (providerData.order !== undefined) {
      provider.updateOrder(providerData.order);
    }

    await this.#catalogRepository.saveProvider(provider);
    Logger.log(`✓ Provider created: ${provider.name} for product ${product.name}`);

    return provider;
  }

  async updateProvider(providerId, updates) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    // If name is being updated, validate uniqueness
    if (updates.name !== undefined && updates.name !== provider.name) {
      const productId = updates.productId !== undefined ? updates.productId : provider.productId;
      const existingProvider = await this.#catalogRepository.findProviderByNameInProduct(
        productId,
        updates.name,
        providerId // Exclude current provider from check
      );
      if (existingProvider) {
        throw new ValidationError(
          `Ein Produktgeber mit dem Namen "${updates.name}" existiert bereits für dieses Produkt`,
          'name'
        );
      }
      provider.updateName(updates.name);
    }

    if (updates.productId !== undefined) {
      provider.updateProductId(updates.productId);
    }

    if (updates.order !== undefined) {
      provider.updateOrder(updates.order);
    }

    await this.#catalogRepository.saveProvider(provider);

    // Get product for logging
    const product = await this.#catalogRepository.findProductById(provider.productId);
    Logger.log(`✓ Provider updated: ${provider.name} (product: ${product?.name || provider.productId})`);

    return provider;
  }

  async deleteProvider(providerId) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    // Check if used in revenue entries (if revenueService available)
    if (this.#revenueService) {
      // Get product to find category for revenue check
      const product = await this.#catalogRepository.findProductById(provider.productId);
      if (product) {
        const usageInfo = await this.#checkProviderInUse(provider.name, product.categoryType);
        if (usageInfo.inUse) {
          throw new ValidationError(
            `Produktgeber kann nicht gelöscht werden: ${usageInfo.revenueCount} Umsatz-Einträge verwenden diesen Produktgeber`,
            'providerId'
          );
        }
      }
    }

    await this.#catalogRepository.deleteProvider(providerId);
    Logger.log(`✓ Provider deleted: ${provider.name}`);
  }

  async deactivateProvider(providerId) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    provider.deactivate();
    await this.#catalogRepository.saveProvider(provider);
    Logger.log(`✓ Provider deactivated: ${provider.name}`);

    return provider;
  }

  async activateProvider(providerId) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    provider.activate();
    await this.#catalogRepository.saveProvider(provider);
    Logger.log(`✓ Provider activated: ${provider.name}`);

    return provider;
  }

  async getProvidersByProduct(productId, includeInactive = false) {
    return await this.#catalogRepository.findProvidersByProduct(productId, includeInactive);
  }

  async getProvidersForCategory(categoryType, includeInactive = false) {
    // Helper method: Get all providers for all products in a category
    // Used for backward compatibility with revenue forms
    return await this.#catalogRepository.findProvidersByCategoryViaProducts(categoryType, includeInactive);
  }

  async getAllProviders(includeInactive = false) {
    return await this.#catalogRepository.findAllProviders(includeInactive);
  }

  // ========================================
  // VALIDATION HELPERS
  // ========================================

  async #checkCategoryInUse(categoryType) {
    if (!this.#revenueService) {
      return { inUse: false, revenueCount: 0 };
    }

    try {
      // Search all revenue entries for this category
      const allEntries = await this.#revenueService.searchEntries({ category: categoryType });
      return {
        inUse: allEntries.length > 0,
        revenueCount: allEntries.length,
      };
    } catch (error) {
      Logger.warn('Failed to check category usage:', error);
      return { inUse: false, revenueCount: 0 };
    }
  }

  async #checkProductInUse(productName, categoryType) {
    if (!this.#revenueService) {
      return { inUse: false, revenueCount: 0 };
    }

    try {
      // Search revenue entries with this product name and category
      const allEntries = await this.#revenueService.searchEntries({
        category: categoryType,
        product: productName,
      });
      return {
        inUse: allEntries.length > 0,
        revenueCount: allEntries.length,
      };
    } catch (error) {
      Logger.warn('Failed to check product usage:', error);
      return { inUse: false, revenueCount: 0 };
    }
  }

  async #checkProviderInUse(providerName, categoryType) {
    if (!this.#revenueService) {
      return { inUse: false, revenueCount: 0 };
    }

    try {
      // Search revenue entries with this provider name and category
      const allEntries = await this.#revenueService.searchEntries({
        category: categoryType,
        provider: providerName,
      });
      return {
        inUse: allEntries.length > 0,
        revenueCount: allEntries.length,
      };
    } catch (error) {
      Logger.warn('Failed to check provider usage:', error);
      return { inUse: false, revenueCount: 0 };
    }
  }

  // ========================================
  // REAL-TIME SUBSCRIPTION
  // ========================================

  subscribeToCatalogUpdates(callback) {
    return this.#catalogRepository.subscribeToCatalog(callback);
  }
}
