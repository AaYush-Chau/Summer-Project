import {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import PlumberModel from "../model/plumber-model";

class PlumbController {
  // ==========================================
  // GET ALL PLUMBERS
  // GET /plumber
  // ==========================================

  getAllPlumbers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const plumbers = await PlumberModel.find();

      return res.json({
        data: plumbers,
        message: "Plumbers fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // GET SINGLE PLUMBER
  // GET /plumber/:id
  // ==========================================

  getPlumberById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const plumber = await PlumberModel.findById(id);

      if (!plumber) {
        return res.status(404).json({
          data: null,
          message: "Plumber not found",
          meta: null,
        });
      }

      return res.json({
        data: plumber,
        message: "Plumber fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // CREATE PLUMBER
  // POST /plumber
  // ==========================================

  createPlumber = async (
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

      const plumber = await PlumberModel.create({
        ...req.body,
        image,
      });

      return res.status(201).json({
        data: plumber,
        message: "Plumber created successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // UPDATE PLUMBER
  // PUT /plumber/:id
  // ==========================================

  updatePlumber = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const updateData: any = {
        ...req.body,
      };

      // If a new image was uploaded
      if (req.file) {
        updateData.image = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }

      const plumber = await PlumberModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!plumber) {
        return res.status(404).json({
          data: null,
          message: "Plumber not found",
          meta: null,
        });
      }

      return res.json({
        data: plumber,
        message: "Plumber updated successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // PATCH PLUMBER
  // PATCH /plumber/:id
  // ==========================================

  patchPlumber = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const updateData: any = {
        ...req.body,
      };

      // If a new image was uploaded
      if (req.file) {
        updateData.image = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }

      const plumber = await PlumberModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!plumber) {
        return res.status(404).json({
          data: null,
          message: "Plumber not found",
          meta: null,
        });
      }

      return res.json({
        data: plumber,
        message: "Plumber partially updated successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // DELETE PLUMBER
  // DELETE /plumber/:id
  // ==========================================

  deletePlumber = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const plumber = await PlumberModel.findByIdAndDelete(id);

      if (!plumber) {
        return res.status(404).json({
          data: null,
          message: "Plumber not found",
          meta: null,
        });
      }

      return res.json({
        data: plumber,
        message: "Plumber deleted successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };
}

export default PlumbController;
