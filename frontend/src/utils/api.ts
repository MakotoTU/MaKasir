import { useAuthStore } from '../store/auth'

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const auth = useAuthStore()
  const headers = new Headers(options.headers || {})
  
  if (auth.user?.token) {
    headers.set('Authorization', `Bearer ${auth.user.token}`)
  }
  
  // Set default Content-Type to application/json if there is a body and it is not already set
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}
