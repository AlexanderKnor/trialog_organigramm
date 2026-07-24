/**
 * Repository Interface: IPromotionRepository
 * Persistence contract for campaigns and promo resources.
 */

export class IPromotionRepository {
  async findAllCampaigns() {
    throw new Error('IPromotionRepository.findAllCampaigns must be implemented');
  }

  async findCampaignById(_campaignId) {
    throw new Error('IPromotionRepository.findCampaignById must be implemented');
  }

  async saveCampaign(_campaign) {
    throw new Error('IPromotionRepository.saveCampaign must be implemented');
  }

  async deleteCampaign(_campaignId) {
    throw new Error('IPromotionRepository.deleteCampaign must be implemented');
  }

  async findAllResources() {
    throw new Error('IPromotionRepository.findAllResources must be implemented');
  }

  async findResourceById(_resourceId) {
    throw new Error('IPromotionRepository.findResourceById must be implemented');
  }

  async saveResource(_resource) {
    throw new Error('IPromotionRepository.saveResource must be implemented');
  }

  async deleteResource(_resourceId) {
    throw new Error('IPromotionRepository.deleteResource must be implemented');
  }
}
