import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { AuthorizedComponent } from './authorized/authorized.component';

@NgModule({
  declarations: [
    AppComponent,
    AuthorizedComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      { path: 'auth', component: AuthorizedComponent }
    ]),
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
