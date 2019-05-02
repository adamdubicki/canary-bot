import axios from 'axios';
import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { getBuildRecordFromS3, saveBuildRecordToS3 } from './helper/s3Helper';
import { lambdaResponse } from './helper/handlerHelper';
import { sendMessage, formatBuildMessage, formatPerformanceResults, formatReport } from './helper/slackHelper';
import { startRun } from './helper/yellowLabHelper';
import { appendRow, findRowWithoutResults, instantiateDoc } from './helper/googleSheetsHelper';

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

    return lambdaResponse(200, { score })
  } catch(e) {
    return lambdaResponse(400, { message: e });
  }
}

export const sendReport = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  await sendMessage(formatReport({url: `${process.env.URL}/report`, env: process.env.STAGE }));
  return lambdaResponse(200, {});
}

export const getReport: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  
  const doc = await instantiateDoc(process.env.SHEET_ID);
  const reportData = await new Promise((resolve, reject) => {
    doc.getRows(1, { offset: 0 }, (err, data) => {
      if(err) reject();
      resolve(data);
    });
  });

  
  const randomRGBValue = () => Math.floor(Math.random() * 255) + 1;
  const randomColor = () => `rgb(${randomRGBValue()}, ${randomRGBValue()}, ${randomRGBValue()})`;

  const color = randomColor();
  const loadTimeColumnData = {
    label: reportData[0].url,
    backgroundColor: color,
    borderColor: color,
    data: `[${(reportData as any).map((report) => report.loadtime)}]`
  }
  const scoreColumnData = {
    label: reportData[0].url,
    backgroundColor: color,
    borderColor: color,
    data: `[${(reportData as any).map((report) => `"${report.score}"`)}]`
  }

  const rowData = (reportData as any).map((report) => `"${report.date}"`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: `
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.1.4/Chart.min.js"></script>
        <style>
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 80%;
          }
        </style
      </head>
      <body>
        <div class="container">
          <h1>${process.env.ENV}</h1>
          <h2>Date x Load Time (ms)</h2>
          </canvas><canvas id="loadtime"></canvas>
          <h2>Date x Yellow Lab Score</h2>
          </canvas><canvas id="score"></canvas>
        </div>
        <script>

          var ctx = document.getElementById('loadtime').getContext('2d');
          var chart = new Chart(ctx, {
            // The type of chart we want to create
            type: 'line',
            scaleStartValue : 0 ,
        
            // The data for our dataset
            data: {
                labels: [${rowData}],
                datasets: [{
                    label: '${loadTimeColumnData.label}',
                    backgroundColor: '${loadTimeColumnData.backgroundColor}',
                    borderColor: '${loadTimeColumnData.borderColor}',
                    data: ${loadTimeColumnData.data}
                }]
            },
        
            // Configuration options go here
            options: {
              scales: {
                yAxes: [{
                  display: true,
                  stacked: true,
                  ticks: {
                      min: 1000, // minimum value
                      max: 4000 // maximum value
                  }
                }]
              }
            }
          });

          var ctx = document.getElementById('score').getContext('2d');
          var chart = new Chart(ctx, {
            // The type of chart we want to create
            type: 'line',
            scaleStartValue : 0,
        
            // The data for our dataset
            data: {
                labels: [${rowData}],
                datasets: [{
                    label: '${scoreColumnData.label}',
                    backgroundColor: '${scoreColumnData.backgroundColor}',
                    borderColor: '${scoreColumnData.borderColor}',
                    data: ${scoreColumnData.data}
                }]
            },
        
            // Configuration options go here
            options: {
              scales: {
                yAxes: [{
                  display: true,
                  stacked: true,
                  ticks: {
                      min: 0, // minimum value
                      max: 100 // maximum value
                  }
                }]
              }
            }
          });


        </script>
      </body>
    `
  }
}