import {
  createSettlement,
  getSettlements,
  getSimplifiedDebtsForGroup
} from './settlements.service.js';
import ApiResponse from '../../utils/ApiResponse.js';

export const handleCreateSettlement = async (req, res, next) => {
  try {
    const result = await createSettlement(req.body, req.user.id);
    res.status(201).json(new ApiResponse(201, result, 'Settlement logged successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetSettlements = async (req, res, next) => {
  try {
    const result = await getSettlements(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Settlements retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetSimplifiedDebts = async (req, res, next) => {
  try {
    const result = await getSimplifiedDebtsForGroup(req.params.groupId, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Simplified group balances calculated successfully'));
  } catch (error) {
    next(error);
  }
};
