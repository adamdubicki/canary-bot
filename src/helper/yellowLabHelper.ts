import axios from 'axios';

interface YellowLabRunOptions {
  url: string;
  device: string;
  screenshot: boolean;
  waitForResponse: boolean;
}

export const startRun = async (options: YellowLabRunOptions) => {
  try {
    const { data } = await axios({
      method: 'post',
      url: 'https://yellowlab.tools/api/runs',
      data: options,
      headers: {
        contentType: 'application/json'
      }
    });

    return Object(data);
  } catch(e) {
    console.error(`Error starting yellow page labs: ${e}`);
    return;
  }
}