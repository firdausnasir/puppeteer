const moment = require("moment");
const AWS = require('aws-sdk');
require("dotenv").config();

let region: string = 'ap-southeast-1';
let secretName: string | undefined = process.env.AWS_SECRET_MANAGER_SECRET_NAME;
let secret: any;

// Create a Secrets Manager client
let client = new AWS.SecretsManager({
    region: region
});

const getSecrets = (secretName: string | undefined) => {
    if (!secretName) {
        throw Error('AWS Secret Name is undefined!');
    }

    return client.getSecretValue({SecretId: secretName}).promise();
}

const getProxyCredentials = async () => {
    let randomStr: string = moment().format('MMDDYYYYHHmmss');

    if (process.env.APP_ENV === 'local') {
        secret = {
            SecretString: {
                brightdataProxyUsername: process.env.BRIGHTDATA_USERNAME,
                brightdataProxyPassword: process.env.BRIGHTDATA_PASSWORD,
            }
        }

        return secret.SecretString;
    }

    try {
        if (secret) {
            return secret;
        }

        secret = await getSecrets(secretName);
        secret = JSON.parse(secret.SecretString);
    } catch (e) {
        console.error(e);

        secret = null;
    }

    return secret;
}

export {getProxyCredentials};