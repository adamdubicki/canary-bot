import axios from 'axios';

import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { getBuildRecordFromS3, saveBuildRecordToS3 } from './helper/s3Helper';
import { lambdaResponse } from './helper/handlerHelper';
import { sendMessage, formatBuildMessage } from './helper/slackHelper';

export const updateBuildRecord: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  try {
    const { buildId: nextBuildId } = Object(await axios.get(process.env.STAGE_URL)).data;
    const { buildId, timestamp } =  Object(await getBuildRecordFromS3());

    if(nextBuildId === buildId) {
      sendMessage(formatBuildMessage({buildId}));
      return lambdaResponse(200, {});
    }

    sendMessage(formatBuildMessage({buildId}));
    saveBuildRecordToS3({ buildId: nextBuildId, timestamp: Number(new Date()) });
    return lambdaResponse(200, { buildId, timestamp });
  } catch(e) {
    return lambdaResponse(400, { message: e });
  }
}

export const getCurrentBuildRecord: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  try {
    const { buildId, timestamp } = Object(await getBuildRecordFromS3());
    return lambdaResponse(200, { buildId, timestamp });
  } catch(e) {
    return lambdaResponse(400, { message: e });
  }
}