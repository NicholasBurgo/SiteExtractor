import { apiClient } from './client';

export const endpoints = {
  // Extraction endpoints
  extract: {
    truthTable: (data: { url: string; maxPages?: number; timeout?: number; usePlaywright?: boolean }) =>
      apiClient.post('/extract/truth-table', data),
    images: (data: { runId: string }) =>
      apiClient.post('/extract/images', data),
    navbar: (data: { runId: string }) =>
      apiClient.post('/extract/navbar', data),
    paragraphs: (data: { runId: string }) =>
      apiClient.post('/extract/paragraphs', data),
    misc: (data: { runId: string }) =>
      apiClient.post('/extract/misc', data),
  },

  // Confirmation endpoints
  manifest: {
    get: (runId: string) =>
      apiClient.get(`/manifest/${runId}`),
    updateImage: (runId: string, imageId: string, data: any) =>
      apiClient.put(`/manifest/${runId}/image/${imageId}`, data),
    bulkUpdate: (runId: string, data: any) =>
      apiClient.put(`/manifest/${runId}/bulk`, data),
  },

  text: {
    get: (runId: string) =>
      apiClient.get(`/text/${runId}`),
    updateBlock: (runId: string, blockId: string, data: any) =>
      apiClient.put(`/text/${runId}/block/${blockId}`, data),
    bulkUpdate: (runId: string, data: any) =>
      apiClient.put(`/text/${runId}/bulk`, data),
  },

  navbar: {
    get: (runId: string) =>
      apiClient.get(`/navbar/${runId}`),
    update: (runId: string, data: any) =>
      apiClient.put(`/navbar/${runId}`, data),
  },

  // Packer/Generator endpoints
  pack: (runId: string) =>
    apiClient.post(`/pack/${runId}`),
  seed: (runId: string) =>
    apiClient.post(`/seed/${runId}`),
  generate: (runId: string) =>
    apiClient.post(`/generate/${runId}`),
  render: (runId: string) =>
    apiClient.post(`/render/${runId}`),
};
