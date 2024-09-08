import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { updateProfilePictureRequest } from "../../types";
import { uploader } from "../utils";

export const uploadFileMiddleware = (err: any, req: updateProfilePictureRequest, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 15MB.' });
        }
        return res.status(500).json({ error: 'Multer error: ' + err.message });
      } else if (err) {
        return res.status(500).json({ error: 'An unknown error occurred during file upload.' });
      }
      next();
  };