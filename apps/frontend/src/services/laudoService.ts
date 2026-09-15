import { apiClient } from './apiClient';

export const laudoService = {
  async baixarPdf(protocolo: string, token: string): Promise<void> {
    const blob = await apiClient.requestBlob(`/laudos/${encodeURIComponent(protocolo)}/pdf`, token);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laudo-${protocolo}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
