# Puppeteer

## Running locally

1. Install dependencies

```shell
npm install
```

2. Copy .env.example to .env.local and update the variables.

```shell
cp .env.example .env
```

3. Change `xxx` in `BRIGHTDATA_USERNAME="xxx-session-s"` to Brightdata username

4. Start the development server:

```shell
npm run dev
```

## Puppeteer API

`POST` => `localhost:6060/puppeteer/shopee`

| Body     | Required |
|----------|----------|
| url      | yes      |