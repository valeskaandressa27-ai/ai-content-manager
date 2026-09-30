import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Campaign, CampaignCreatePayload, CampaignUpdatePayload } from '../models/campaign.model';
import { Page } from '../models/page.model';
import { API_URL } from './api';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/campaigns`;

  list(page: number, pageSize: number, search = ''): Observable<Page<Campaign>> {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<Page<Campaign>>(this.url, { params });
  }

  get(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.url}/${id}`);
  }

  create(payload: CampaignCreatePayload): Observable<Campaign> {
    return this.http.post<Campaign>(this.url, payload);
  }

  update(id: number, payload: CampaignUpdatePayload): Observable<Campaign> {
    return this.http.patch<Campaign>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
