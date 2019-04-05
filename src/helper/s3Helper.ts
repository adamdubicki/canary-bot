import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const { BUCKET: Bucket, RECORD_KEY: Key} = process.env;
/**
 * @return {Object} the current build record from s3 
 */
export const getBuildRecordFromS3 = async () => {
  return new Promise((resolve, reject) => {
    s3.getObject({ Bucket, Key }, (err, data) => {
      if ( err ) reject(err);
      else resolve(JSON.parse(data.Body.toString()));
    })
  })
}

/**
 * @param body the build record 
 */
export const saveBuildRecordToS3 = async (body:Object) => {
  return new Promise((resolve, reject) => {
    s3.putObject({ Bucket, Key, Body: JSON.stringify(body) }, (err, data) => {
      if ( err ) reject(err);
      else resolve();
    })
  });
}
