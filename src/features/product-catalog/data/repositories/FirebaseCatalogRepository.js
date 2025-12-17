/**
 * Repository: FirebaseCatalogRepository
 * Implements ICatalogRepository using Firestore
 */

import { ICatalogRepository } from '../../domain/repositories/ICatalogRepository.js';
import { CategoryDefinition } from '../../domain/entities/CategoryDefinition.js';
import { ProductDefinition } from '../../domain/entities/ProductDefinition.js';
import { ProviderDefinition } from '../../domain/entities/ProviderDefinition.js';

export class FirebaseCatalogRepository extends ICatalogRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async findAllCategories(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType('category', includeInactive);
    return data.map((item) => CategoryDefinition.fromJSON(item));
  }

  async findCategoryByType(categoryType) {
    const docId = `category_${categoryType}`;
    const data = await this.#dataSource.findById(docId);
    return data ? CategoryDefinition.fromJSON(data) : null;
  }

  async saveCategory(category) {
    const data = category.toJSON();
    await this.#dataSource.save(data);
    return category;
  }

  async deleteCategory(categoryType) {
    const docId = `category_${categoryType}`;
    await this.#dataSource.delete(docId);
  }

  // ========================================
  // PRODUCT OPERATIONS
  // ========================================

  async findAllProducts(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType('product', includeInactive);
    return data.map((item) => ProductDefinition.fromJSON(item));
  }

  async findProductsByCategory(categoryType, includeInactive = false) {
    const data = await this.#dataSource.findByEntityTypeAndCategory(
      'product',
      categoryType,
      includeInactive
    );
    return data.map((item) => ProductDefinition.fromJSON(item));
  }

  async findProductById(productId) {
    const data = await this.#dataSource.findById(productId);
    return data ? ProductDefinition.fromJSON(data) : null;
  }

  async saveProduct(product) {
    const data = product.toJSON();
    await this.#dataSource.save(data);
    return product;
  }

  async deleteProduct(productId) {
    await this.#dataSource.delete(productId);
  }

  // ========================================
  // PROVIDER OPERATIONS
  // ========================================

  async findAllProviders(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType('provider', includeInactive);
    return data.map((item) => ProviderDefinition.fromJSON(item));
  }

  async findProvidersByCategory(categoryType, includeInactive = false) {
    const data = await this.#dataSource.findByEntityTypeAndCategory(
      'provider',
      categoryType,
      includeInactive
    );
    return data.map((item) => ProviderDefinition.fromJSON(item));
  }

  async findProviderById(providerId) {
    const data = await this.#dataSource.findById(providerId);
    return data ? ProviderDefinition.fromJSON(data) : null;
  }

  async saveProvider(provider) {
    const data = provider.toJSON();
    await this.#dataSource.save(data);
    return provider;
  }

  async deleteProvider(providerId) {
    await this.#dataSource.delete(providerId);
  }

  // ========================================
  // BATCH OPERATIONS (for migration)
  // ========================================

  async batchSaveEntities(entities) {
    const dataArray = entities.map((entity) => entity.toJSON());
    await this.#dataSource.batchSave(dataArray);
  }

  // ========================================
  // REAL-TIME SUBSCRIPTION
  // ========================================

  subscribeToCatalog(callback) {
    return this.#dataSource.subscribe((snapshot) => {
      // Parse all entities and group by type
      const categories = [];
      const products = [];
      const providers = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.entityType === 'category') {
          categories.push(CategoryDefinition.fromJSON(data));
        } else if (data.entityType === 'product') {
          products.push(ProductDefinition.fromJSON(data));
        } else if (data.entityType === 'provider') {
          providers.push(ProviderDefinition.fromJSON(data));
        }
      });

      callback({ categories, products, providers });
    });
  }
}
