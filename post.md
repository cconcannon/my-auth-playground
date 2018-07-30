# Serverless OAuth2 Authentication and Authorization from a Single-Page Application

### *A Step-By-Step Guide to Using AWS Lambda as a Cost-effective, Scalable, and Easily Maintainable Solution for Secure Authentication*
### **Chris Concannon, Consultant at [Levvel](https://www.levvel.io)**
---

When authenticating API calls from a serverless application, how can you retrieve authentication tokens without exposing API-application secrets? Performing the authentication calls with AWS Lambda is one option that is easily maintainable and scalable. This post will provide an example of OAuth2 user authentication and token retrieval from the browser, while hiding the application secret behind AWS API Gateway and AWS Lambda.

---
## Overview
---

This post will walk through several steps to achieve our goal of Oauth2 authenticated calls to a public API. The prerequisites are related to:
1. API credentials
2. AWS credentials
3. Docker installation
4. Node and npm
5. AWS SAM CLI installation

---
## Prerequisites
---

### API Registration

The example of this post uses the [GitHub API](https://developer.github.com/). GitHub V3 uses the OAuth2 protocol (among other methods) to authenticate users via web applications, and this requires the registration of your application in order to obtain a `Client ID` and `Client Secret`

You should also have personal account credentials to test authentication and authorization when retrieving user data.

### AWS Credentials
AWS Credentials are required to set up and use AWS Lambda services. A basic familiarity with AWS Lambda is also required. Those who are starting from a position of zero familiarity with AWS Lambda (as I did) can find an awesome resource in the [Serverless Application Model Simple App](https://docs.aws.amazon.com/lambda/latest/dg/test-sam-cli.html#sam-cli-simple-app).

### Docker
You must have Docker installed for the SAM CLI to run. [Docker Community Edition](https://store.docker.com/search?type=edition&offering=community) is a free download.

### Node and NPM
Since this post is explicitly describing authentication in the context of serverless applications, we'll install dependencies with [npm](https://www.npmjs.com/) and run a local server with [Express](https://expressjs.com/)

### AWS SAM CLI
We will use the [AWS SAM CLI](https://github.com/awslabs/aws-sam-cli) to build and run our AWS Lambda function in our local environment, before uploading it to AWS and providing access via an API Gateway public endpoint.

Tip: Installing the AWS SAM CLI is easier with npm than with pip. The AWS documentation suggests using pip, but I ran into problems and lengthy work-arounds when trying to use pip. Trying to install Python/pip is particularly difficult because Homebrew installs Python 3.7, with no other versions available. The required Python version for SAM CLI installation is 3.6. You'll need a different solution than Homebrew to install Python 3.6 and the associated pip.

Running `npm install -g aws-sam-local` worked flawlessly for me. The SAM CLI version installed is old, but adequate for our needs.

---
## Running Lambda Functions Locally
---

Once the SAM CLI is installed, create a directory for your local playground (`mkdir my-auth-playground && cd my-auth-playground`). We need to define the API endpoint in a `template.yaml` file, so go ahead and create a `template.yaml` file and paste this code:
```
AWSTemplateFormatVersion : '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: My first serverless application.

Resources:

  Products:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambdaFunction.handler
      Runtime: nodejs8.10
      Events:
        authToken:
          Type: Api
          Properties:
            Path: /authToken
            Method: any
```
Notice the "Runtime" and "Handler" properties. This example will use Node 8.10 to execute the function, and ES6 JavaScript as our language of choice. AWS Lambda provides multiple execution languages/environments - see the [official documentation](https://aws.amazon.com/lambda/getting-started/) for available choices.

In our example, the SAM CLI is going to look for the AWS Lambda Function on an exported property called `handler` from a file named `lambdaFunction.js`. Let's make sure those exist. Create `lambdaFunction.js` and paste this skeleton of an AWS Lambda handler function:
```
'use strict';

exports.handler = (event, context, callback) => {
    let response = {
      prop1: "My Best Attribute",
      prop2: "My Not-So-Best Attribute"
    }

    callback(null, {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin: "*"
      },
      body: JSON.stringify(response)
    });
}
```

**Note: Before you deploy this function to AWS Lambda in front of a publicly exposed endpoint, you'll want to change the `Access-Control-Allow-Origin` value to match your application domain.**

The handler callback expects arguments via the format below:

```
callback(Error error, Object result)
```

This is defined in the [Lambda Function Handler documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html).

These two files are all you need to start developing your Lambda function and API Gateway locally. Now, start Docker, and from your terminal run `sam local start-api`. The SAM CLI will start a server at [localhost:3000](http://localhost:3000) with an endpoint at `/authToken` - this is the endpoint we defined above in `template.yaml`.

Once the SAM api is running, open your browser and navigate to [localhost:3000/authToken](http://localhost:3000/authToken). AWS starts a node runtime and runs your handler function behind the scenes, but eventually your browser will load the page with "This is my Lambda function" as the body of the document. This is the body property that you defined in the arguments to the callback of your Lambda function.

---
## [OAuth2 Review](https://tools.ietf.org/html/rfc6749)
---

The general procedure for [OAuth2 authentication](https://tools.ietf.org/html/rfc6749) is:
1. Application provides callback domain and obtains public and secret credentials during API registration
2. Application provides a link for the user to authenticate their identity with the API - the Application's public credentials are provided to the API via this link
3. User clicks the link, signs in with their own user credentials to the API service, and authorizes the Application to access their data via the API
4. User is redirected to the callback URL for the Application, with an API-provided temporary authentication code added to params in the redirect
5. Application receives the temporary authentication code and sends it back to the API, along with application public **and secret** credentials, to obtain a user token.
6. Application is granted access to the API according to the user-approved scope, so long as the token remains valid

Step 5 is the difficult point to handle for serverless applications, because the application secret needs to be used in order to obtain an access token. Exposing your application secret API credentials publicly is a security risk that could expose your user's data to malicious parties outside your application domain. Anyone with ill intents could observe the user's browser events and begin making authenticated API calls with your application credentials.

---
## Create a UI for simulation
---

This section will use a small, single-component Angular app to demonstrate the integration of your Single-Page Application, AWS API Gateway, and your AWS Lambda function. You don't have to use an Angular app - the fundamentals of the process are transferrable to other single-page application frameworks. Use React, Vue, etc. as you please.

If you don't have the Angular CLI installed, run

```
npm install -g @angular/cli
```

Once installed, run

```
ng new oauth2-app
```

After the app is initiated, run
```
cd oauth2-app && ng serve
```

Open your browser to [localhost:4200](http://localhost:4200) and you should see "Welcome to app!" with an Angular logo, and some default links. Let's delete this content and start integrating the OAuth2 process!

---
## Obtain OAuth2 User Authorization
---

This section will cover steps 1-4 in the OAuth2 process described above.

Inside your Angular app, open the `app.component.html` file and delete all the content. Paste this simple layout with a link to the API authentication:

```
<div style="text-align: center">
  <a href="https://github.com/login/oauth/authorize?client_id={{clientId}}&redirect_uri=http://localhost:4200">Authenticate via GitHub</a>
</div>
```
**replace the *'{{clientId}}'* string with your API credentials `Client ID` from the application registration process**

If you did not yet register an application to follow along, I recommend using [GitHub's API](https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/) as a reliable and simple option.

When you save the file changes, your Angular server will automatically refresh the changes. Go to [localhost:4200](http://localhost:4200), and click your new link to be taken to the GitHub authorization page. Go ahead and sign in! With luck, you'll be redirected back to your Angular app. If not, check that your `redirect_uri` URL param is exactly `http://localhost:4200`.

When you are redirected back to your Angular app, you will notice that a `code` param has been added to the URL.

To get the `code` from our url params, we need to use the `ActivatedRoute` interface provided by the `@angular/router` module. To keep our code clean, we are also going to generate a new component to handle the UI features that occur during and after OAuth2 token exchange. Create the new component within the oauth2-app folder:

```
ng g c authorized
```

Update the code related to the RouterModule into your `app.module.ts` file:

```
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

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
    ])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

The RouterModule.forRoot() method defines the `/auth` endpoint and tells the Angular app to launch the AuthorizedComponent for that path. Now, we need to define the place in the UI where the router will render the component. We will tell the router to render route components below our current content. Modify your `app.component.html` file to redirect the login to `http://localhost:4200/auth` and to provide a router outlet:

```
<div style="text-align: center">
  <a href="https://github.com/login/oauth/authorize?client_id=0f09aa44cebc9847d642&redirect_uri=http://localhost:4200/auth">Authenticate via GitHub</a>
</div>
<
<router-outlet></router-outlet>
```

Now open your new component `authorized.component.ts`, add the `ActivatedRoute` object and an `authCode` component property your component, and assign the `authCode` value to the `code` URL parameter value when the component is initialized:

```
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-authorized',
  templateUrl: './authorized.component.html',
  styleUrls: ['./authorized.component.css']
})
export class AuthorizedComponent implements OnInit {
  authCode: '';

  constructor(private activatedRoute: ActivatedRoute) { }

  ngOnInit() {
    this.authCode = this.activatedRoute.snapshot.queryParams.code;
  }
}
```

Whew, that was a lot. Now when you visit [localhost:4200](http://localhost:4200) and log in via GitHub, the callback URL path is `/auth` and the AuthorizedComponent becomes visible. To double-check that we are retrieving the `code` value correctly, let's display it on the AuthorizedComponent. Open `authorized.component.html` and modify the template to look like this:

```
<p style="text-align: center">
  {{authCode}}
</p>
```

Now, when you successfully authorize our application from GitHub's authorization page, you'll see something like this:

![web page with authentication link, and a text line with code param value](/screenshots/authorized.png)

---
## After User is Authenticated, Call the Local SAM CLI Endpoint to Run the Lambda Function
---

Alright, here comes the fun part. This is where your Lambda function comes into play. Let's hook up our UI to our local Lambda function API.

Open the AuthorizedComponent `authorized.component.ts` - this is where we will call our lambda Function, retrieve a token, and perform authenticated API calls.

We are going to modify the AuthorizedComponent NgOnInit() method to call our local server endpoint in front of our Lambda function, and assign the response body to the component property `lambdaResponse`. Angular will display the response body in the UI upon a successful execution of our Lambda function.

In order to do this, we need to import the HttpClientModule into our application to asynchronously handle the request to `localhost:3000/authToken`. Add the line

```
import { HttpClientModule } from '@angular/common/http';
```
to the `app.module.ts`, and add it to the imports array. Also import the { HttpClient } to the `authorized.component.ts` file.

Next, let's modify the AuthorizedComponent. Create a `lambdaResponse` property on the component, create a private instance of the HttpClient in the `constructor()` method, and re-write the NgOnInit() method to call a retrieveToken() method. Write the retrieveToken() method so that it calls and subscribes to our `localhost:3000/authToken` endpoint for the Lambda function. Don't forget to `import { Observable } from 'rxjs';` on the AuthorizedComponent. When you're done, your `authorized.component.ts` file should resemble this:

```
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
```

and your `authorized.component.html` file can display the response:

```
<p style="text-align: center">
  {{authCode}}
</p>
<p style="color: blue; text-align: center">
  {{lambdaResponse}}
</p>
```

We are now returning a response to our UI from our Lambda function callback, via a configuration that will map directly to AWS API Gateway! Now all we need to do is make the Lambda function handle the logic of the target API code exchange for an authenticated user token.

---
## OAuth2 Token Exchange
---
When we make the initial call to our Lambda function, we will pass the `code` url param. We will store the `Client ID` and `Client Secret` as environment variables (which can be encrypted and stored within AWS Lambda, and retrieved via the same code we use locally). Then, we will write Node.js executable code to handle the authentication call and return the authenticated user token, which we will pass along in the callback to our Angular app.