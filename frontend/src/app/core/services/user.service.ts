import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { PasswordChangePayload, User } from '../models/user.model';
import { API_URL } from './api';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  updateName(name: string): Observable<User> {
    return this.http.patch<User>(`${API_URL}/users/me`, { name }).pipe(tap((user) => this.auth.setUser(user)));
  }

  changePassword(payload: PasswordChangePayload): Observable<void> {
    return this.http.put<void>(`${API_URL}/users/me/password`, payload);
  }
}
