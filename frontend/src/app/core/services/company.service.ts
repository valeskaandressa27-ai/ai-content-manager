import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Company, CompanyPayload } from '../models/company.model';
import { API_URL } from './api';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/company`;

  get(): Observable<Company | null> {
    return this.http.get<Company | null>(this.url);
  }

  save(payload: CompanyPayload): Observable<Company> {
    return this.http.put<Company>(this.url, payload);
  }
}
