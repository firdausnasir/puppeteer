import {Request, Response, NextFunction} from 'express';
import {getProxyCredentials} from '../config';

const moment = require("moment");
const localPuppeteer = require("puppeteer");

const puppeteerFn = async (req: Request, res: Response, next: NextFunction) => {
    let url: string | null = req.body.url;

    if (!url) {
        return res.status(400).json({
            response: 'Missing required parameter: url'
        });
    }

    let tries: number = 0;
    let isShopee: boolean = url.includes('shopee');

    try {
        while (true) {
            let duration = Math.floor(Math.random() * 3000) + 1000; // b/w 1 and 3

            // delay random seconds to avoid rate limiting problem
            await new Promise(r => setTimeout(r, duration));

            // get shopee data
            let result: any = await runCrawler(url, isShopee);

            // only retry if url is from shopee
            if (isShopee) {
                // no error, can get data
                console.log(result)
                if (result.error === null) {
                    return res.status(200).json({
                        response: result
                    });
                }

                // retry is already done 3 times
                if (tries >= 2) {
                    return res.status(408).json({
                        response: "Could not get the data from the url: " + url
                    });
                }

                tries++;
                continue;
            }

            return res.status(200).json({
                response: result
            });
        }
    } catch (e: any) {
        return res.status(500).json({
            response: {
                message: e
            }
        })
    }
}

const runCrawler = async (productUrl: string, isShopee: boolean) => {
    return new Promise(async (resolve, reject) => {
        try {
            const args = [
                '--proxy-server=zproxy.lum-superproxy.io:22225', //brightdata
                '--enable-features=NetworkService',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
            ];

            const options = {
                args,
                headless: true,
                ignoreHTTPSErrors: true,
            };

            console.log('launching browser...');

            let browser = await localPuppeteer.launch(options);

            console.log('browser launched');

            const page = await browser.newPage();

            await page.setRequestInterception(true);

            await page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36'
            );

            console.log('getting proxy credentials from AWS Secrets Manager...');

            let proxyCredentials: any = await getProxyCredentials();
            let randomStr: string = moment().format('MMDDYYYYHHmmss');

            if (proxyCredentials === null) {
                console.error('oops, something went wrong. cannot get proxy credentials...');

                throw Error('Cannot get proxy credentials from AWS Secrets Manager');
            }

            console.log('finished getting proxy credentials');

            let proxyUsername: string = proxyCredentials.brightdataProxyUsername + randomStr;
            let proxyPassword: string = proxyCredentials.brightdataProxyPassword;

            console.log('username:', proxyUsername);
            console.log('password:', proxyPassword);

            await page.authenticate({
                username: proxyUsername,
                password: proxyPassword
            });

            let result: any;

            console.log('getting information from url...');

            page.on('request', (req: any) => {
                if (['stylesheet', 'font', 'image', 'other', 'ping'].includes(req.resourceType())) {
                    req.abort()
                } else {
                    req.continue()
                }
            });

            if (isShopee) {
                page.on("response", async (response: any) => {
                    if (response.url().includes('/api/v4/item/get')) {
                        result = await response.json();
                    }
                });

                await page.goto(productUrl, {waitUntil: "networkidle0", timeout: 0});
            } else {
                await page.goto(productUrl, {waitUntil: "domcontentloaded"});

                result = await page.content();
            }

            console.log('finished getting information from browser');

            await browser.close();

            return resolve(result);
        } catch (e) {
            throw reject(e);
        }
    });
}

export default {puppeteerFn};