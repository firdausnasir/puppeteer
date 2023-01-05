/** source/routes/posts.ts */
import express from 'express';
import controller from '../controllers/puppet';
const router = express.Router();

router.post('/puppeteer/shopee', controller.puppeteerFn);

export = router;