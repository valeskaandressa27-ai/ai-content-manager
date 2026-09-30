import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Content, ContentCreatePayload, ContentListQuery, ContentUpdatePayload } from '../models/content.model';
import { Page } from '../models/page.model';
import { API_URL } from './api';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/contents`;

  list(query: ContentListQuery): Observable<Page<Content>> {
    let params = new HttpParams().set('page', query.page).set('page_size', query.page_size);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.type) params = params.set('type', query.type);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<Page<Content>>(this.url, { params });
  }

  get(id: number): Observable<Content> {
    return this.http.get<Content>(`${this.url}/${id}`);
  }

  create(payload: ContentCreatePayload): Observable<Content> {
    return this.http.post<Content>(this.url, payload);
  }

  update(id: number, payload: ContentUpdatePayload): Observable<Content> {
    return this.http.patch<Content>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
