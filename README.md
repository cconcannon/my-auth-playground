# Three-Legged OAuth 2 from Single-Page Applications: A Use Case for a *Function-as-a-Service*

### *A Step-By-Step Guide to Using [AWS Lambda](https://aws.amazon.com/lambda/) as a Cost-effective, Scalable, and Easily Maintainable Solution for Securely Reaching [OAuth 2.0](https://oauth.net/2/) Authenticated Endpoints*
### **Chris Concannon, Consultant at [Levvel](https://www.levvel.io)**
---

#### About Single Page Applications

[Single Page Applications (SPAs)](https://medium.com/@pshrmn/demystifying-single-page-applications-3068d0555d46) are the modern solution to deliver feature-rich user interfaces for web applications. Recent developments to SPA frameworks enable [server-side rendering](https://angular.io/guide/universal) to improve SEO and initial load times, two of the major criticisms of such frameworks. One great advantage to serving a SPA is that the SPA can be served as a static asset. SPA's can be served reliably, quickly, and inexpensively via a combination of cloud simple storage (such as [AWS S3](https://aws.amazon.com/s3/)) and a Content Delivery Network (CDN) (such as [AWS Cloudfront](https://aws.amazon.com/cloudfront/)). For example, `https://www.your-single-page-application.com` can be [hosted via AWS S3, Route 53, and Cloudfront for as little as $0.50/month](https://aws.amazon.com/getting-started/projects/host-static-website/). Costs and complexity are reduced by eliminating the need for a dynamic web application server (i.e. [NodeJS](https://nodejs.org/) running [Express](https://expressjs.com/)).

#### What's Hard About Accessing Dynamic Data from a Statically-Served SPA?

Serving an SPA from a static asset server has many benefits, but also creates a security challenge when you require the application to dynamically handle private data (in other words, when you interact with privately-stored user data after the user is authenticated). Such data is often exposed through public API's that only allow access to authorized applications and users (see: [Google](https://developers.google.com/identity/protocols/OAuth2), [Facebook](https://developers.facebook.com/docs/facebook-login/overview), [Stripe](https://stripe.com/docs/connect/oauth-reference), etc.). The [OAuth 2.0 protocol](https://oauth.net/2/) is perhaps the most commonly used and known set of guidelines for authenticating HTTP requests via publicly-exposed API's. The [OAuth2 Authorization Code Grant](https://oauth.net/2/grant-types/authorization-code/) process requires an application to submit a `client_secret` as part of the protocol. The `client_secret` is unique to the application, and should never be shared or exposed. **The requirement to hide the `client_secret` is a challenge for statically-served web applications.**

#### OAuth2 Authorization Code Grant Overview

Traditionally, a dynamic application server (i.e. [NodeJS](https://nodejs.org/) running [Express](https://expressjs.com/)) will store an application's [OAuth 2](https://oauth.net/2/) credentials (the `client_secret`) as environment variables. Node exposes these variables via the `process.env` property. When an application owner stores application secrets on the server process, the application can read the `client_secret` value from the server environment without exposing that value to the public. Remember that the `client_secret` is a mandatory piece of the authorization flow, and should **never** be exposed publicly in the application code.


![Diagram of OAuth 2 Authorization Code Grant Flow](/img/auth_code_oauth2.png)
*Figure 1. OAuth 2 Flow for Authorization Code Grant, Using a Dynamic Application Server.*

The Authorization Code Grant depicted in the diagram above is dependent on the application server's ability to receive a `code` parameter from a browser request (step 5), and subsequently send a request directly to the authorization server, without going through the user's browser (step 6). This is not possible for an SPA served from a static asset server. **A static asset server handles 2-way communication; it will not handle the 3-way communication depicted by steps 5, 6, and 7 above.**

*Note: The OAuth 2 protocol describes several types of grant types. This post focuses on using the Authorization Code Grant. Another grant type, the Implicit Grant, is designed for mobile applications and single-page applications, where the `client_secret` confidentiality is not guaranteed. The Implicit Grant is not as widely offered, and it does not provide identity verification (whereas the Authorization Code Grant does). If your use case allows for use of the Implicit Grant, and it is implemented by your target API, then check out [the Implicit Grant documentation](https://tools.ietf.org/html/rfc6749#section-1.3.2). If you require the Authorization Code Grant, carry on!*

#### So, What's at Stake for a Statically-Served SPA?

Obviously, an application delivered "statically" ([such as the $0.50/month solution mentioned above](https://aws.amazon.com/getting-started/projects/host-static-website/)) does not have access to `process.env`; it does not have the option to store it's API credentials without exposing those credentials to the public eye. Techniques (*bad ideas!*) exist which *attempt* to hide credentials within application code. Some examples of these techniques include the concatenation of credentials to the end of asset identifier strings, or the use of an encryption algorithm with the encryption key stored elsewhere in the application. However, these techniqes can be easily hacked, especially when the hacker monitors the traffic coming to and from the application. Using insecure, ill-designed strategies will eventually result in theft of your application secrets.

Theft of application secrets results in a liability for you, the application owner. If a malicious party obtains your registered application secret for [OAuth 2](https://oauth.net/2/) authentication, then stealing all your user's API-exposed data (from the provider API - Slack, Google, etc.) becomes a trivial exercise. This data breach would be 100% your fault; Securely handling privileged application credentials is the application owner's responsibility. It is impossible to securely hide a private value (such as `client_secret`) within statically-served SPA code.

When you serve an SPA from a static asset server (e.g. NGINX, Azure Storage, or AWS S3), you (and the application) do not have access to private environment properties such as `process.env`. The server is built to handle 2-way communication, which means that your entire application code is delivered as-is to the user's browser. The server will not make further communications on the application's behalf. This makes it hard to maintain a `client_secret` as a private variable. The entirety of the application code can be read and inspected, as can any HTTP requests sent to/from the application via the user's browser.

#### Using a Function-as-a-Service (AWS Lambda) to Handle Private Details

So, what do we do if we want our application to access API's that use [OAuth 2](https://oauth.net/2/), but we also want the cost benefits, reliability, speed, and simplicity of serving our application via static storage solutions and a CDN? When using [OAuth 2](https://oauth.net/2/) to make API calls from a serverless application, how can you successfully grant your application user an API token without exposing your SPA API secret?

[Functions-as-a-Service (FaaS)](https://medium.com/@BoweiHan/an-introduction-to-serverless-and-faas-functions-as-a-service-fb5cec0417b2), such as [AWS Lambda](https://aws.amazon.com/lambda/), provide a great avenue to solve our problem. Performing the token exchange and renewal with a FaaS such as [AWS Lambda](https://aws.amazon.com/lambda/) is cost-effective, reliable, inherently scalable, and easily maintained. This post will provide an example of OAuth2 user authentication and `access_token` grant, while hiding the SPA application secret behind [AWS API Gateway](https://aws.amazon.com/api-gateway/) and [AWS Lambda](https://aws.amazon.com/lambda/).

![OAuth 2 Authorization Code Grant using AWS Lambda without a Dynamic Application Server](/img/lambda_auth_code_oauth2.png)
*Figure 2. OAuth 2 Flow for Authorization Code Grant, Using AWS Lambda without a Dynamic Application Server*

#### Why the Focus on OAuth 2 and AWS Products/Services

This post covers the narrow intersection of OAuth 2 with statically-served Single Page Applications served via AWS S3 and AWS API Gateway. The world of serverless application structure and authentication has so many more topics of worthy (and very related) discussion that I won't be addressing, such as [OpenID Connect](http://openid.net/connect/), and competitors to AWS services (such as [Azure Storage](https://azure.microsoft.com/en-us/blog/azure-storage-static-web-hosting-public-preview/)). There are compelling reasons why the difficult intersection of the chosen topics is particularly worth examining separately from broader subjects of authentication and serverless structure. Simply put, my choices are based on a few major factors. AWS provides great documentation, easy free tier setup and use, and useful/relevant developer tools. OAuth 2 is a well-proven authentication standard which is relevant to many applications. Portions of [Oauth 2](https://oauth.net/2/) protocol are implemented by API's built by [Slack](https://api.slack.com/docs/oauth), [cloud.gov](https://cloud.gov/docs/apps/leveraging-authentication/), [Google](https://developers.google.com/identity/protocols/OAuth2), [Stripe](https://stripe.com/docs/connect/oauth-reference), [Instagram](https://www.instagram.com/developer/authentication/), [GitHub](https://developer.github.com/apps/building-oauth-apps/), and many more.

---
## Overview
---

This post will walk through several steps to achieve our goal of Oauth2 authenticated calls to a public API. The prerequisites are related to:
1. API Credentials
2. AWS Credentials
3. Docker
4. Node, NPM, and Angular CLI
5. AWS SAM CLI

---
## Prerequisites
---

### API Credentials

The example of this post uses the [GitHub V3 API](https://developer.github.com/v3/). GitHub V3 uses the OAuth2 protocol to authenticate users and web applications, and this requires the registration of your application in order to obtain a `Client ID` and `Client Secret`

This example also assumes that you are a registered GitHub user, as you will be logging into GitHub in order to authorize your own application, complete the authentication process, and receive an `access_token`.

### AWS Credentials
AWS Credentials are required to set up and use [AWS Lambda](https://aws.amazon.com/lambda/) services. A basic familiarity with [AWS Lambda](https://aws.amazon.com/lambda/) is also required. Those who are starting from a position of zero familiarity with [AWS Lambda](https://aws.amazon.com/lambda/) (as I did) can find an awesome resource in the [Serverless Application Model Simple App](https://docs.aws.amazon.com/lambda/latest/dg/test-sam-cli.html#sam-cli-simple-app).

### Docker
You must have Docker installed for the SAM CLI to run. [Docker Community Edition](https://store.docker.com/search?type=edition&offering=community) is a free download.

### Node, NPM, and Angular CLI
Since this post is explicitly describing authentication in the context of serverless applications, we'll install dependencies with [npm](https://www.npmjs.com/). We'll also be using the [Angular CLI](https://cli.angular.io) to generate an Angular 6 application and components.

### AWS SAM CLI
We will use the [AWS SAM CLI](https://github.com/awslabs/aws-sam-cli) to build and run our [AWS Lambda](https://aws.amazon.com/lambda/) function in our local environment, before uploading it to AWS and providing access via an API Gateway public endpoint.

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
Notice the "Runtime" and "Handler" properties. This example will use Node 8.10 to execute the function, and ES6 JavaScript as our language of choice. [AWS Lambda](https://aws.amazon.com/lambda/) provides multiple execution languages/environments - see the [official documentation](https://aws.amazon.com/lambda/getting-started/) for available choices.

In our example, the SAM CLI is going to look for the [AWS Lambda](https://aws.amazon.com/lambda/) Function on an exported property called `handler` from a file named `lambdaFunction.js`. Let's make sure those exist. Create `lambdaFunction.js` and paste this skeleton of an [AWS Lambda](https://aws.amazon.com/lambda/) handler function:
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

**Note: Before you deploy this function to [AWS Lambda](https://aws.amazon.com/lambda/) in front of a publicly exposed endpoint, you'll want to change the `Access-Control-Allow-Origin` value to match your application domain.**

The handler callback expects arguments via the format below:

```
callback(Error error, Object result)
```

This is defined in the [Lambda Function Handler documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html).

These two files are all you need to start developing your Lambda function and API Gateway locally. Now, start Docker, and from your terminal run `sam local start-api`. The SAM CLI will start a server at [localhost:3000](http://localhost:3000) with an endpoint at `/authToken` - this is the endpoint we defined above in `template.yaml`.

Once the SAM api is running, open your browser and navigate to [localhost:3000/authToken](http://localhost:3000/authToken). AWS starts a node runtime and runs your handler function behind the scenes, but eventually your browser will load the page with "This is my Lambda function" as the body of the document. This is the body property that you defined in the arguments to the callback of your Lambda function.

---
## OAuth2 - Reviewing the Single Page Application Problem
---

![OAuth 2 Authorization Code Grant flow](/img/auth_code_oauth2.png)
*Figure 1. OAuth 2 Flow for Authorization Code Grant, Using a Dynamic Application Server*

Figure 1 is shared again here to demonstrate the most common way of implementing [OAuth2 Authorization Code Grant flow](https://tools.ietf.org/html/rfc6749) with a dynamic application server.

Steps 5-7, after the user authorizes your application for the target API, are the steps that are difficult to handle for statically-served single page applications. The steps after the `code` is sent to your application require your application secret to be sent to the authorization server in order to obtain an access token. Exposing your application secret API credentials publicly is a security risk that could expose your user's data to malicious parties outside your application domain. Anyone with ill intents could observe the user's browser events and begin making authenticated API calls with your application credentials.

We will implement a solution that follows the flow of Figure 2, shared again below.

![OAuth 2 Authorization Code Grant using AWS Lambda without a Dynamic Application Server](/img/lambda_auth_code_oauth2.png)
*Figure 2. OAuth 2 Flow for Authorization Code Grant, Using AWS Lambda without a Dynamic Application Server*

In order to aid understanding, and to provide an overview of the rest of this post, a diagram is provided below which describes how we will comprehensively build a demo application that operates according to Figure 2.

![Outline of Steps to Build Figure 2 from 'scratch'](/img/build_oauth2_lambda_demo.png)
*Figure 3. Diagram Showing the Steps to Come in Building the Demo Described Here*

---
## Create a UI for simulation
---

This section will use a small, single-component Angular app to demonstrate the integration of your Single-Page Application, AWS API Gateway, and your [AWS Lambda](https://aws.amazon.com/lambda/) function. You don't have to use an Angular app - the fundamentals of the process are transferrable to other single-page application frameworks. Use React, Vue, etc. as you please.

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

![web page with authentication link, and a text line with code param value](/img/authorized.png)
*Figure 4: The SPA reads the `code` parameter - this will be sent to the Lambda function*

---
## After User is Authenticated, Call the Local SAM CLI Endpoint to Run the Lambda Function
---

Alright, here comes the fun part. This is where your Lambda function comes into play. Let's hook up our UI to our local Lambda function API.

Open the AuthorizedComponent `authorized.component.ts` - this is where we will call our lambda Function, retrieve a token, and perform authenticated API calls.

We are going to modify the `AuthorizedComponent`'s `NgOnInit()` method to call our local server endpoint in front of our Lambda function, and assign the response body to the component property `lambdaResponse`. Angular will display the response body in the UI upon a successful execution of our Lambda function.

In order to do this, we need to import the `HttpClientModule` into our application to asynchronously handle the request to `localhost:3000/authToken`. Add the line

```
import { HttpClientModule } from '@angular/common/http';
```
to the `app.module.ts`, and add it to the imports array. Also `import { HttpClient }` to the `authorized.component.ts` file.

Next, let's modify the `AuthorizedComponent`. Create a `lambdaResponse` property on the component, create a private instance of the `HttpClient` in the `constructor()` method, and re-write the `NgOnInit()` method to call a `retrieveToken()` method. Write the `retrieveToken()` method so that it calls and subscribes to our `localhost:3000/authToken` endpoint for the Lambda function. Don't forget to `import { Observable } from 'rxjs';` on the `AuthorizedComponent`. When you're done, your `authorized.component.ts` file should resemble this:

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
  lambdaResponse = 'Loading...'; // initial value rendered

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

We are now returning a response to our UI from our Lambda function callback, via a configuration that will map to AWS API Gateway! Now all we need to do is make the Lambda function handle the logic of the target API code exchange for an authenticated user token.

---
## OAuth 2.0 Access Token Request
---
When we make the initial call to our Lambda function, we will pass the `code` url param. We will assign the `Client ID` and `Client Secret` in the component for now (**Do Not Commit/Push this Code With Your Secret Credentials**). We will pull these values from local environment variables upon deployment to AWS.

We will write Node.js executable code to handle the authentication call and return the authenticated user token, which we will pass along in the callback to our Angular app.

The code to do these things looks like this:
```
'use strict';
const https = require('https');

const github_client_id = "{{YOUR_CLIENT_ID}}";
const github_client_secret = "{{YOUR_CLIENT_SECRET}};

exports.handler = (event, context, callback) => {
  const authCode = event.queryStringParameters.code;

  const tokenEndpoint = "/login/oauth/access_token" +
    "?client_id=" + github_client_id +
    "&client_secret=" + github_client_secret +
    "&code=" + authCode +
    "&accept=:json";

  let response = '';

  const httpOptions = {
    method: 'POST',
    host: 'github.com',
    path: tokenEndpoint,
    headers: {
      'User-Agent': 'Serverless-Oauth2-Example',
      'accept': 'application/json'
    }
  }

  https.request(httpOptions, res => {
    res.on('data', (raw) => {
      response += raw.toString('utf8');
    });

    res.on('end', () => {
      callback(null, {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "http://localhost:4200",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        body: response
      });
    })
  })
  .end();
}
```

and let's slightly modify our `retrieveToken() method`:

```
retrieveToken(code = this.authCode): Observable<any> {
  const reqUrl = 'http://localhost:3000/authToken';

  return this.http.post(reqUrl, {}, {
    params: {
      'code': code
    },
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}
```

Paste your GitHub client_id and client_secret values into the variable declarations near the top of the file, save your changes, and perform Authentication via GitHub through your Angular app UI. You should be able to pipe the response from GitHub's authentication endpoint to your application UI! We can see a token coming back from GitHub.

![Webpage with a link to GitHub Authentication, a code value, and a response string with access_token](/img/token_return.png)
*Figure 5: The SPA retrieves the `access_token` without refreshing as a result of an asynchronous call to the Lambda function*

The code above does not handle errors and does not handle responses other than the "Happy Path" `200 OK` scenario, but serves as a starting point for the [AWS Lambda](https://aws.amazon.com/lambda/) function deployment.

Notice that we are whitelisting our `http://localhost:4200` endpoint of the Angular application. The domain of the deployed application will need to be whitelisted as well. **Setting the HTTP headers above is important to satisfy browser CORS protection**.

---
## Deploying the Lambda Function
---
Deploying the Lambda Function endpoint involves a few steps:
1) Log in to the [AWS Console](https://console.aws.amazon.com)
2) Add a new Lambda Function with default configurations (in Node.js if you've been following this code-along)
3) Paste the code from your local SAM function into the Lambda function code editor
4) Update the `client_id` and `client_secret` variable assignments to read from the Lambda local environment:
```
const github_client_id = process.env.GITHUB_CLIENT_ID;
const github_client_secret = process.env.GITHUB_CLIENT_SECRET;
```
5) Set the local environment variables (and optionally encrypt them with a custom key from AWS KMS)

![Screenshot of AWS Console Lambda Environment Variables](/img/env_variables.png)
*Figure 6: Encrypting the Lambda function's environment variables, including the `client_secret`*

---
## Setting up a Publicly Exposed API Endpoint
---
AWS API Gateway allows quick setup of a publicly exposed endpoint to your Lambda function. Go through the quick process of creating a new API that points to your Lambda function (your function name will auto-populate when you go to search for it in the setup process). Also configure validation settings in order to avoid running your Lambda function for invalid requests, thus reducing the compute time and costs to run your Lambda function.

![AWS API Gateway Settings](/img/aws_api_gateway_settings.png)
*Figure 7: API Gateway Configuration*

**I am not a cloud security expert, and I don't pretend to be one - AWS provides [documentation about controlling access to an API Gateway endpoint](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-to-api.html). It is possible to restrict access to your endpoint via Virtual Private Cloud, [Lambda Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html), and other methods. Use them according to your needs.**

Once your public endpoint and configuration are set up, deploy the API and copy the endpoint from the Dashboard tab on the left of the API Gateway management screen:

![API Dashboard with endpoint](/img/api_dashboard.png)
*Figure 8: The public API Gateway endpoint can be viewed via the Dashboard tab*

Update your `authorized.component.ts` file with the new endpoint, and *voila!* Your application is now fetching the authentication token via your Lambda function, with an entry point via AWS API Gateway.
```
retrieveToken(code = this.authCode): Observable<any> {
  const reqUrl = '{{YOUR_ENDPOINT_HERE}}';
  return this.http.post(reqUrl, {}, {
    params: {
      'code': code
    },
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}
```

---
## Final Comments
---
You can configure the API Gateway and Lambda function to validate and respond to URL path parameters or query parameters. For example, when passing an `access_token` via a GET method, you can write an entire new suite of handler functions for your Lambda function to interface with authenticated GitHub (or other) API endpoints.

You can also configure the API Gateway and Lambda function to run from one specific region in the US, or to optimize for multiple locations. The full suite of AWS cloud configurations and integrations is at your disposal.

[Lambda Pricing](https://aws.amazon.com/lambda/pricing/) is very reasonable - the first 1,000,000 requests per month are free, and requests after that are $0.20 per million.

Thank you for reading!
