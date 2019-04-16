# canary-bot
A bot that checks if a page has been updated.

## Getting started

1. You will need the serverless cli and aws login credentials
```
npm install -g serverless
# Login to the serverless platform (optional)
serverless login
```

```
serverless config credentials --provider aws --key YOUR_ACCESS_KEY --secret YOUR_SECRET_KEY
```

2. Install dependencies

```npm install```


## Running locally
```npm run dev```
You will need a secrets-local.yml to hold the environment variables for the environment. Base it off the example environment variables.

## Deploying 
```npm run deploy:<stage you want to deploy>```
You will need a secrets-#stage.yml to hold the environment variables for the environment.