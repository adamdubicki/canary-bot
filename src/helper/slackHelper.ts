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

export const formatBuildMessage = ({buildId, stage}) => `New build ${buildId} on ${stage}.`
export const formatPerformanceResults = ({ url, score, loadTime, date }) =>
  `${date}: ${url}\nLoad time: ${loadTime/1000}s.\n_________________\nScore: ${score}`
export const formatReport = ({ url, env }) => `See ${env} report at ${url}...`