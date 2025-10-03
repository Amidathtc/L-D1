import { Request, Response, NextFunction } from "express";
import { CustomerService } from "../service/customer.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class CustomerController {
  static async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.createCustomer(
        req.body,
        req.user!.id
      );

      return ApiResponseUtil.success(
        res,
        customer,
        "Customer created successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        branchId: req.query.branchId as string,
        currentOfficerId: req.query.currentOfficerId as string,
        search: req.query.search as string,
      };

      const result = await CustomerService.getCustomers(
        filters,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.paginated(
        res,
        result.customers,
        result.page,
        result.limit,
        result.total,
        "Customers retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getCustomerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Customer ID is required", 400);
      }

      const customer = await CustomerService.getCustomerById(
        id,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(res, customer);
    } catch (error: any) {
      next(error);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Customer ID is required", 400);
      }

      const customer = await CustomerService.updateCustomer(
        id,
        req.body,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(
        res,
        customer,
        "Customer updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Customer ID is required", 400);
      }

      await CustomerService.deleteCustomer(
        id,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(
        res,
        null,
        "Customer deleted successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async reassignCustomer(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { newBranchId, newOfficerId, reason } = req.body;

      if (!id) {
        return ApiResponseUtil.error(res, "Customer ID is required", 400);
      }

      const customer = await CustomerService.reassignCustomer(
        id,
        newBranchId,
        newOfficerId,
        reason,
        req.user!.id
      );

      return ApiResponseUtil.success(
        res,
        customer,
        "Customer reassigned successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getCustomerLoans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Customer ID is required", 400);
      }

      const loans = await CustomerService.getCustomerLoans(
        id,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(res, loans);
    } catch (error: any) {
      next(error);
    }
  }
}
