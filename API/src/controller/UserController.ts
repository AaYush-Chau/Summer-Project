import type { NextFunction, Response, Request } from "express";
import UserModel from "../model/user-model";

class UserController{
    async getAllUserList(req: Request, res: Response, next: NextFunction){
        try {
            const  userList = await UserModel.find({}, {pasword: 0, __v:0})
            res.json({
                data: userList,
                message: "Your user list",
                meta: {
                    pagination: {}
                }
            })
        } catch(exception) {
            next(exception)
        }
    } 
}

export default UserController