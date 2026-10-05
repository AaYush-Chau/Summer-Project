import {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import PaintingModel from "../model/painting-model";

class PaintingController {
  // ==========================================
  // GET ALL PAINTERS
  // GET /painting
  // ==========================================

  getAllPainters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const painters = await PaintingModel.find();

      return res.json({
        data: painters,
        message: "Painters fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // GET SINGLE PAINTER
  // GET /painting/:id
  // ==========================================

  getPainterById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const painter = await PaintingModel.findById(id);

      if (!painter) {
        return res.status(404).json({
          data: null,
          message: "Painter not found",
          meta: null,
        });
      }

      return res.json({
        data: painter,
        message: "Painter fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // CREATE PAINTER
  // POST /painting
  // ==========================================

  createPainter = async (
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

      const painter = await PaintingModel.create({
        ...req.body,
        image,
      });

      return res.status(201).json({
        data: painter,
        message: "Painter created successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // UPDATE PAINTER
  // PUT /painting/:id
  // ==========================================

  updatePainter = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const updateData: any = {
        ...req.body,
      };

      if (req.file) {
        updateData.image = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }

      const painter = await PaintingModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!painter) {
        return res.status(404).json({
          data: null,
          message: "Painter not found",
          meta: null,
        });
      }

      return res.json({
        data: painter,
        message: "Painter updated successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // PATCH PAINTER
  // PATCH /painting/:id
  // ==========================================

  patchPainter = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const updateData: any = {
        ...req.body,
      };

      if (req.file) {
        updateData.image = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }

      const painter = await PaintingModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!painter) {
        return res.status(404).json({
          data: null,
          message: "Painter not found",
          meta: null,
        });
      }

      return res.json({
        data: painter,
        message: "Painter partially updated successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // DELETE PAINTER
  // DELETE /painting/:id
  // ==========================================

  deletePainter = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const painter = await PaintingModel.findByIdAndDelete(id);

      if (!painter) {
        return res.status(404).json({
          data: null,
          message: "Painter not found",
          meta: null,
        });
      }

      return res.json({
        data: painter,
        message: "Painter deleted successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };
}

export default PaintingController;

