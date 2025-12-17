/**
 * Repository Interface: ICatalogRepository
 * Defines contract for catalog data persistence
 */

export class ICatalogRepository {
  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async findAllCategories(includeInactive = false) {
    throw new Error('Method not implemented: findAllCategories');
  }

  async findCategoryByType(categoryType) {
    throw new Error('Method not implemented: findCategoryByType');
  }

  async saveCategory(category) {
    throw new Error('Method not implemented: saveCategory');
  }

  async deleteCategory(categoryType) {
    throw new Error('Method not implemented: deleteCategory');
  }

  // ========================================
  // PRODUCT OPERATIONS
  // ========================================

  async findAllProducts(includeInactive = false) {
    throw new Error('Method not implemented: findAllProducts');
  }

  async findProductsByCategory(categoryType, includeInactive = false) {
    throw new Error('Method not implemented: findProductsByCategory');
  }

  async findProductById(productId) {
    throw new Error('Method not implemented: findProductById');
  }

  async saveProduct(product) {
    throw new Error('Method not implemented: saveProduct');
  }

  async deleteProduct(productId) {
    throw new Error('Method not implemented: deleteProduct');
  }

  // ========================================
  // PROVIDER OPERATIONS
  // ========================================

  async findAllProviders(includeInactive = false) {
    throw new Error('Method not implemented: findAllProviders');
  }

  async findProvidersByCategory(categoryType, includeInactive = false) {
    throw new Error('Method not implemented: findProvidersByCategory');
  }

  async findProviderById(providerId) {
    throw new Error('Method not implemented: findProviderById');
  }

  async saveProvider(provider) {
    throw new Error('Method not implemented: saveProvider');
  }

  async deleteProvider(providerId) {
    throw new Error('Method not implemented: deleteProvider');
  }

  // ========================================
  // BATCH OPERATIONS (for migration)
  // ========================================

  async batchSaveEntities(entities) {
    throw new Error('Method not implemented: batchSaveEntities');
  }

  // ========================================
  // REAL-TIME SUBSCRIPTION
  // ========================================

  subscribeToCatalog(callback) {
    throw new Error('Method not implemented: subscribeToCatalog');
  }
}
