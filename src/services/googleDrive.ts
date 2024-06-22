import { google } from "googleapis";
import { PassThrough } from "stream";
import path from "path";
import process from "process";

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const KEYFILE = path.join(process.cwd(), 'googledrive.json');

const getAuthentication = () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEYFILE,
        scopes: SCOPES,
    })

    return auth
}

const createDriveDevice = () => {
    const auth = getAuthentication();

    const driveService = google.drive({
        version: 'v3',
        auth
    });

    return driveService;
}

export const uploadNewFile = async (file : Express.Multer.File) => {
    try {
        const driveService = createDriveDevice();

        const stream = new PassThrough();
        stream.end(file.buffer);

        const fileMetadata = {
            name: file.originalname,
            parents: [process.env.GOOGLE_API_FOLDER]
        }

        const media = {
            mimeType: file.mimetype,
            body: stream,
        }

        const response = await driveService.files.create({
            // @ts-ignore
            requestBody: fileMetadata,
            // @ts-ignore
            media,
            fields: 'id',
        })

        // @ts-ignore
        return response.data;

    } catch (err) {
        throw new Error("Error to save the new profile picture");
    }
}
