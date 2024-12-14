import { API_BASE_URL } from './config';
import axios from "axios";
import { ACCESS_TOKEN } from "./constants";

const apiUrl = "http";


const api = axios.create({
  baseURL: API_BASE_URL // IP address of your EC2 instance with the specified port
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
