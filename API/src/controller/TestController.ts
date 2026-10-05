import { type Request, type Response, type NextFunction } from "express";


export const healthCheck = (req: Request, res: Response, next: NextFunction) => {
    res.json({
        data: "Health Ok",
        messsage: "Success",
        meta: null
    })
};