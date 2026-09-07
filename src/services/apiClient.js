/**
 * Secure API Client for Server-Side Operations
 * Replaces direct AWS calls with secure server-side API
 */

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://dusan-djukaric-rho.vercel.app'
  : 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    // AbortSignal.timeout is not supported in TV browsers — use AbortController instead
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const config = {
      headers: {
        // Don't set Content-Type for FormData — browser sets it with the correct boundary
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      signal: controller.signal,
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      console.error('API request failed:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Authentication methods
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (response.success) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // S3 operations
  async getPaintingById(id) {
    return this.request(`/s3/painting/${id}`);
  }

  async getImages(folder, continuationToken = null, maxKeys = 25, forceRefresh = false) {
    const params = new URLSearchParams({
      maxKeys: maxKeys.toString()
    });
    
    if (continuationToken) {
      params.append('continuationToken', continuationToken);
    }
    
    // Add cache-busting parameter for force refresh
    if (forceRefresh) {
      params.append('_t', Date.now().toString());
    }

    return this.request(`/s3/images/${folder}?${params}`);
  }

  async uploadImage(file, title, naslovSlike, dimX, dimY, description = '', descriptionsrb = '', seotitle = '', metadescription = '', alttext = '', keywords = '', seotitlesrb = '', metadescriptionsrb = '', alttextsrb = '', keywordssrb = '', slug = '') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);
    formData.append('naslovSlike', naslovSlike);
    formData.append('dimX', dimX);
    formData.append('dimY', dimY);
    formData.append('description', description);
    formData.append('descriptionsrb', descriptionsrb);
    formData.append('seotitle', seotitle);
    formData.append('metadescription', metadescription);
    formData.append('alttext', alttext);
    formData.append('keywords', keywords);
    formData.append('seotitlesrb', seotitlesrb);
    formData.append('metadescriptionsrb', metadescriptionsrb);
    formData.append('alttextsrb', alttextsrb);
    formData.append('keywordssrb', keywordssrb);
    formData.append('slug', slug);

    return this.request('/s3/upload', {
      method: 'POST',
      body: formData
    });
  }

  async updateMetadata(key, metadata) {
    return this.request('/s3/updateMetadata', {
      method: 'POST',
      body: JSON.stringify({ key, metadata })
    });
  }

  async moveImage(key, toFolder) {
    return this.request('/s3/move', {
      method: 'POST',
      body: JSON.stringify({ key, toFolder })
    });
  }

  async deleteImage(key) {
    return this.request('/s3/deleteImage', {
      method: 'POST',
      body: JSON.stringify({ key })
    });
  }

  async fetchImages(folder) {
    return this.request(`/s3/images/${folder}`, {
      method: 'GET'
    });
  }

  // Exhibition methods
  async getExhibitions(includeHidden = false) {
    return this.request(includeHidden ? '/exhibitions/all' : '/exhibitions');
  }

  async toggleExhibitionVisibility(id) {
    return this.request(`/exhibitions/${id}/visibility`, { method: 'PATCH' });
  }

  async createExhibition(formData) {
    return this.request('/exhibitions', { method: 'POST', body: formData });
  }

  async updateExhibition(id, formData) {
    return this.request(`/exhibitions/${id}`, { method: 'PUT', body: formData });
  }

  async deleteExhibition(id) {
    return this.request(`/exhibitions/${id}`, { method: 'DELETE' });
  }

  // Press
  async getPress() {
    return this.request('/press');
  }

  async getAllPress() {
    return this.request('/press/all');
  }

  async createPressArticle(formData) {
    return this.request('/press', { method: 'POST', body: formData });
  }

  async updatePressArticle(id, formData) {
    return this.request(`/press/${id}`, { method: 'PUT', body: formData });
  }

  async deletePressArticle(id) {
    return this.request(`/press/${id}`, { method: 'DELETE' });
  }

  async togglePressVisibility(id) {
    return this.request(`/press/${id}/visibility`, { method: 'PATCH' });
  }

  async deletePressImage(articleId, imageIndex) {
    return this.request(`/press/${articleId}/images/${imageIndex}`, { method: 'DELETE' });
  }

  async updateVideoIds(videoIds) {
    return this.request('/press/videos', {
      method: 'PUT',
      body: JSON.stringify({ videoIds }),
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
