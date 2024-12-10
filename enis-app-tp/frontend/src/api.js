import axios from "axios";
import { ACCESS_TOKEN } from "./constants";

const apiUrl = "http";


const api = axios.create({
  baseURL: "http://52.91.85.157:8000"  // IP address of your EC2 instance with the specified port
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
