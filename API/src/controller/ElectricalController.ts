
import {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import ElectricalModel from "../model/electrical-model";

class ElectricalController {
  // ==========================================
  // GET ALL ELECTRICIANS
  // GET /electrical
  // ==========================================

  getAllElectricians = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const electricians = await ElectricalModel.find();

      return res.json({
        data: electricians,
        message: "Electricians fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // GET SINGLE ELECTRICIAN
  // GET /electrical/:id
  // ==========================================

  getElectricianById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const electrician =
        await ElectricalModel.findById(id);

      if (!electrician) {
        return res.status(404).json({
          data: null,
          message: "Electrician not found",
          meta: null,
        });
      }

      return res.json({
        data: electrician,
        message: "Electrician fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // CREATE ELECTRICIAN
  // POST /electrical
  // ==========================================

  createElectrician = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const image = req.file
        ? {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            destination: req.file.destination,
          }
        : undefined;

      const electrician =
        await ElectricalModel.create({
          ...req.body,
          image,
        });

      return res.status(201).json({
        data: electrician,
        message: "Electrician created successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // UPDATE ELECTRICIAN
  // PUT /electrical/:id
  // ==========================================

  updateElectrician = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const updateData: any = {
        ...req.body,
      };

      // Add new image if uploaded
      if (req.file) {
        updateData.image = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }

      const electrician =
        await ElectricalModel.findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!electrician) {
        return res.status(404).json({
          data: null,
          message: "Electrician not found",
          meta: null,
        });
      }

      return res.json({
        data: electrician,
        message: "Electrician updated successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // PATCH ELECTRICIAN
  // PATCH /electrical/:id
  // ==========================================

  patchElectrician = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const updateData: any = {
        ...req.body,
      };

      // Add new image if uploaded
      if (req.file) {
        updateData.image = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }

      const electrician =
        await ElectricalModel.findByIdAndUpdate(
          id,
          { $set: updateData },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!electrician) {
        return res.status(404).json({
          data: null,
          message: "Electrician not found",
          meta: null,
        });
      }

      return res.json({
        data: electrician,
        message: "Electrician partially updated successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // DELETE ELECTRICIAN
  // DELETE /electrical/:id
  // ==========================================

  deleteElectrician = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const electrician =
        await ElectricalModel.findByIdAndDelete(id);

      if (!electrician) {
        return res.status(404).json({
          data: null,
          message: "Electrician not found",
          meta: null,
        });
      }

      return res.json({
        data: electrician,
        message: "Electrician deleted successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };
}

export default ElectricalController;
