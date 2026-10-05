
import { type Response, type NextFunction } from "express";
import { type AuthRequest } from "../types/Request";
import ProfessionalProfileModel from "../model/professional-profile-model";

class ProviderController {

  // ==========================================
  // COMPLETE PROVIDER PROFILE
  // POST /provider/details
  // Requires login, role: provider
  // ==========================================
  createProviderDetails = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const loggedInUser = req.loggedInUser;

      if (!loggedInUser) {
        return next({
          code: 401,
          message: "Login required",
        });
      }

      const {
        email,
        dob,
        service,
        experience,
        price,
      } = req.body;

      // Check required fields
      if (
        !email ||
        !dob ||
        !service ||
        experience === undefined ||
        price === undefined
      ) {
        return next({
          code: 400,
          message:
            "email, dob, service, experience and price are required",
        });
      }

      // Valid services
      const validServices = [
        "plumber",
        "electrician",
        "cleaner",
        "painter",
      ];

      if (!validServices.includes(service)) {
        return next({
          code: 400,
          message: `Unknown service "${service}". Expected one of: ${validServices.join(
            ", "
          )}`,
        });
      }

      // Prevent duplicate profile submission
      const existingProfile =
        await ProfessionalProfileModel.findOne({
          userId: loggedInUser.id,
        });

      if (existingProfile) {
        return next({
          code: 409,
          message: "You already have a provider profile.",
        });
      }

      // Handle profile image
      const profileImage = req.file
        ? {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            destination: req.file.destination,
          }
        : undefined;

      // Create professional profile
      const profile =
        await ProfessionalProfileModel.create({
          userId: loggedInUser.id,
          email,
          dob,
          service,
          experience: Number(experience),
          price: Number(price),
          profileImage,
        });

      return res.status(201).json({
        data: profile,
        message: "Provider profile saved successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };


  // ==========================================
  // GET LOGGED-IN PROVIDER PROFILE
  // GET /provider/details
  // Requires login, role: provider
  // ==========================================
  getProviderDetails = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const loggedInUser = req.loggedInUser;

      if (!loggedInUser) {
        return next({
          code: 401,
          message: "Login required",
        });
      }

      // Find profile belonging to logged-in provider
      const profile =
        await ProfessionalProfileModel.findOne({
          userId: loggedInUser.id,
        });

      // Profile does not exist
      if (!profile) {
        return next({
          code: 404,
          message: "Provider profile not found",
        });
      }

      // Profile exists
      return res.json({
        data: profile,
        message: "Provider profile found",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };


  // ==========================================
  // GET PROVIDERS BY SERVICE
  // GET /provider/service/:service
  // Public API
  // ==========================================

// ==========================================
// GET PROVIDERS BY SERVICE
// GET /provider/service/:service
// Public API
// ==========================================
getProvidersByService = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceParam = req.params.service;

    // Make sure service is a single string
    if (typeof serviceParam !== "string") {
      return next({
        code: 400,
        message: "Invalid service",
      });
    }

    // Valid services
    const validServices = [
      "plumber",
      "electrician",
      "cleaner",
      "painter",
    ] as const;

    // Check whether service is valid
    if (!validServices.includes(serviceParam as any)) {
      return next({
        code: 400,
        message: `Invalid service "${serviceParam}". Expected one of: ${validServices.join(
          ", "
        )}`,
      });
    }

    // Now TypeScript knows this is a valid service
    const service = serviceParam as
      | "plumber"
      | "electrician"
      | "cleaner"
      | "painter";

    // Find providers according to their professional service
    const providers =
      await ProfessionalProfileModel.find({
        service: service,
      })
        .populate("userId", "fullname phone")
        .sort({ createdAt: -1 });

    return res.json({
      data: providers,
      message: `${service} providers found successfully`,
      meta: {
        count: providers.length,
      },
    });
  } catch (exception) {
    next(exception);
  }
};

// ==========================================
// GET PROVIDER BY ID
// GET /provider/:providerId
// Public endpoint
// ==========================================

getProviderById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return next({
        code: 400,
        message: "Provider ID is required",
      });
    }

    const provider =
      await ProfessionalProfileModel.findById(
        providerId
      ).populate(
        "userId",
        "fullname phone"
      );

    if (!provider) {
      return next({
        code: 404,
        message: "Professional not found",
      });
    }

    return res.json({
      data: provider,
      message:
        "Professional details fetched successfully",
      meta: null,
    });
  } catch (exception) {
    next(exception);
  }
};



}



export default ProviderController;

