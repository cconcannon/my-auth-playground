import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-authorized',
  templateUrl: './authorized.component.html',
  styleUrls: ['./authorized.component.css']
})
export class AuthorizedComponent implements OnInit {
  authCode: '';
  lambdaResponse = 'Loading...';

  constructor(
    private activatedRoute: ActivatedRoute,
    private http: HttpClient
  ) {}

  retrieveToken(code = this.authCode): Observable<any> {
    const reqUrl = 'http://localhost:3000/authToken';
    return this.http.get(reqUrl);
  }

  ngOnInit() {
    this.authCode = this.activatedRoute.snapshot.queryParams.code;

    this.retrieveToken().subscribe(result => {
      this.lambdaResponse = JSON.stringify(result);
    });
  }
}
