import axios from 'axios';
import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { getBuildRecordFromS3, saveBuildRecordToS3 } from './helper/s3Helper';
import { lambdaResponse } from './helper/handlerHelper';
import { sendMessage, formatBuildMessage, formatPerformanceResults } from './helper/slackHelper';
import { startRun } from './helper/yellowLabHelper';
import { appendRow, findRowWithoutResults } from './helper/googleSheetsHelper';

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

    await appendRow({ 
      runId,
      url,
      resultsUrl: `https://yellowlab.tools/api/results/${runId}`,
      screenshotUrl: `https://yellowlab.tools/api/results/${runId}/screenshot.jpg`,
      date: new Date().toLocaleDateString("en-US")
    });

    console.log(`Got run id ${runId}`);

    return lambdaResponse(200, { url, runId })
  } catch(e) {
    console.error(e);
    return lambdaResponse(400, { message: e });
  }
}

export const updatePerformanceResults: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  try { 
    const row = Object(await findRowWithoutResults());
    if (!row) return lambdaResponse(200, { message: "No rows to update." });

    console.log('Found a row...');
    const { data } = await axios.get(row.resultsurl);
    if(!data.scoreProfiles) return lambdaResponse(200, { message: "No rows to update." });

    console.log('Found a valid score...');
    const score = data.scoreProfiles.generic.globalScore;
    const loadTime = data.javascriptExecutionTree.children.slice(-1)[0].data.timestamp;

    row.score = score;
    row.loadtime = loadTime;
    row.save();

    sendMessage(formatPerformanceResults({
      score,
      loadTime,
      date: row.date,
      url: row.url
    }));

    return lambdaResponse(200, { score })
  } catch(e) {
    return lambdaResponse(400, { message: e });
  }
}