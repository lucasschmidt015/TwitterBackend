import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
require('dotenv').config();

const ses = new SESClient({ region: 'us-east-1' });

function createSendEmailCommand(ToAddresses: string, fromAddress: string, message: string) {
    return new SendEmailCommand({
        Destination: {
            ToAddresses: [ToAddresses],
        },
        Source: fromAddress,
        Message: {
            Subject: {
                Charset: 'UTF-8',
                Data: 'Your one time password',
            },
            Body: {
                Text: {
                    Charset: 'UTF-8',
                    Data: message
                },
            },
            
        }
    })
}

export async function sendEmailToken(email: string, token: string) {

    const fromAddress = process.env.EMAIL_SENDER || '';
    const message = `Your one time password: ${token}`
    const command = createSendEmailCommand(email, fromAddress, message)

    try {
        return await ses.send(command)
    } catch (e) {
        console.log('Error: ', e);
        return e;
    }

}