/**
 * Format the response for an AWS lambda api call
 * 
 * @param statusCode 
 * @param body 
 */
export const lambdaResponse = (statusCode: number, body: Object) => ({
    statusCode,
    body: JSON.stringify(body)
});