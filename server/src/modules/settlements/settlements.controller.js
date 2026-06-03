import { createSettlement, getSettlements } from './settlements.service.js';

export const handleCreateSettlement = async (req, res, next) => {
  try {
    const result = await createSettlement(req.body, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleGetSettlements = async (req, res, next) => {
  try {
    const result = await getSettlements(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
