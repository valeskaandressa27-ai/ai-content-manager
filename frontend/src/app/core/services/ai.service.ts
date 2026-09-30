import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GenerateContentPayload, GenerationResult, Usage } from '../models/ai.model';
import { CampaignGeneratePayload } from '../models/campaign.model';
import { API_URL } from './api';

/** Toda chamada de IA passa pelo backend; o frontend nunca fala com o provedor nem conhece a chave. */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/ai`;

  generate(payload: GenerateContentPayload): Observable<GenerationResult> {
    return this.http.post<GenerationResult>(`${this.url}/generate`, payload);
  }

  generateCampaign(payload: CampaignGeneratePayload): Observable<GenerationResult> {
    return this.http.post<GenerationResult>(`${this.url}/generate-campaign`, payload);
  }

  usage(): Observable<Usage> {
    return this.http.get<Usage>(`${this.url}/usage`);
  }
}
