import axios from 'axios';

export const sendMessage = (text: String) => {
  return axios({
    method: 'post',
    url: process.env.SLACK_HOOK,
    data: {
      text
    }
  });
}

export const formatBuildMessage = ({buildId}) => `New build ${buildId} on stage.`