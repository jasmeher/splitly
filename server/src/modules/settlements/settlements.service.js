import Settlement from '../../models/Settlement.js';

export const createSettlement = async (settlementData, creatorId) => {
  return Settlement.create({ ...settlementData, createdBy: creatorId });
};

export const getSettlements = async (query) => {
  return Settlement.find(query);
};
