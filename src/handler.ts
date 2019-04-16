import axios from 'axios';

import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { getBuildRecordFromS3, saveBuildRecordToS3 } from './helper/s3Helper';
import { lambdaResponse } from './helper/handlerHelper';
import { sendMessage, formatBuildMessage } from './helper/slackHelper';
import { startRun } from './helper/yellowLabHelper';
import { appendRow } from './helper/googleSheetsHelper';

export const updateBuildRecord: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  try {
    const { BUCKET: bucket, RECORD_KEY: key, URL, STAGE} = process.env;
    const { buildId: nextBuildId } = Object(await axios.get(URL)).data;
    const { buildId, timestamp } =  Object(await getBuildRecordFromS3(bucket, key));

    if(nextBuildId === buildId) {
      return lambdaResponse(200, {});
    }

    sendMessage(formatBuildMessage({buildId: nextBuildId, stage: STAGE}));
    saveBuildRecordToS3(bucket, key, { buildId: nextBuildId, timestamp: Number(new Date()) });
    return lambdaResponse(200, { buildId, timestamp });
  } catch(e) {
    return lambdaResponse(400, { message: e });
  }
}

export const getBuildRecord: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  try {
    const { BUCKET: bucket, RECORD_KEY: key} = process.env;
    const { buildId, timestamp } = Object(await getBuildRecordFromS3(bucket, key));
    return lambdaResponse(200, { buildId, timestamp, key});
  } catch(e) {
    return lambdaResponse(400, { message: e });
  }
}

export const startPerformanceTest: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  try {
    const { URL: url } = process.env;
    const { runId } = await startRun({
      url,
      device: 'desktop',
      screenshot: true,
      waitForResponse: false
    });
    
    appendRow({ 
      runId,
      url,
      resultsUrl: `https://yellowlab.tools/api/results/${runId}`,
      screenshotUrl: `https://yellowlab.tools/api/results/${runId}/screenshot.jpg`
    });

    return lambdaResponse(200, { url, runId })
  } catch(e) {
    return lambdaResponse(400, { message: e });
  }
}

export const getPerformanceResults: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  
}