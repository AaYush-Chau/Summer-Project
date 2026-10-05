import {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import CleaningModel from "../model/cleaning-model";

class CleaningController {

  // GET ALL CLEANERS
  getAllCleaners = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const cleaners = await CleaningModel.find();

      return res.json({
        data: cleaners,
        message: "Cleaners fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };


  // GET CLEANER BY ID
  getCleanerById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const cleaner = await CleaningModel.findById(id);

      if (!cleaner) {
        return res.status(404).json({
          data: null,
          message: "Cleaner not found",
          meta: null,
        });
      }

      return res.json({
        data: cleaner,
        message: "Cleaner fetched successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };


  // CREATE CLEANER
  createCleaner = async (
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

      const cleaner = await CleaningModel.create({
        ...req.body,
        image,
      });

      return res.status(201).json({
        data: cleaner,
        message: "Cleaner created successfully",
        meta: null,
      });

    } catch (exception) {
      next(exception);
    }
  };


  // UPDATE CLEANER
  updateCleaner = async (
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

      const cleaner = await CleaningModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!cleaner) {
        return res.status(404).json({
          data: null,
          message: "Cleaner not found",
          meta: null,
        });
      }

      return res.json({
        data: cleaner,
        message: "Cleaner updated successfully",
        meta: null,
      });

    } catch (exception) {
      next(exception);
    }
  };


  // PATCH CLEANER
  patchCleaner = async (
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

      const cleaner = await CleaningModel.findByIdAndUpdate(
        id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!cleaner) {
        return res.status(404).json({
          data: null,
          message: "Cleaner not found",
          meta: null,
        });
      }

      return res.json({
        data: cleaner,
        message: "Cleaner partially updated successfully",
        meta: null,
      });

    } catch (exception) {
      next(exception);
    }
  };


  // DELETE CLEANER
  deleteCleaner = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {

      const { id } = req.params;

      const cleaner = await CleaningModel.findByIdAndDelete(id);

      if (!cleaner) {
        return res.status(404).json({
          data: null,
          message: "Cleaner not found",
          meta: null,
        });
      }

      return res.json({
        data: cleaner,
        message: "Cleaner deleted successfully",
        meta: null,
      });

    } catch (exception) {
      next(exception);
    }
  };
}

export default CleaningController;
