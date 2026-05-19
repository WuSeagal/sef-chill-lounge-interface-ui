import axios from 'axios'

const service = axios.create({
    baseURL: import.meta.env.VITE_ENDPOINT || 'http://localhost:9041',
    withCredentials: true,
    timeout: 5000
})

service.interceptors.request.use(
    config => config,
    error => Promise.reject(error)
)

service.interceptors.response.use(
    response => {
        const res = response.data
        if (res.code !== 200) {
            console.error('API 錯誤:', res.message)
            return Promise.reject(new Error(res.message || 'Error'))
        }
        return res
    },
    error => {
        if (error.response?.status === 401) {
            // session expired
        }
        return Promise.reject(error)
    }
)

export default service
