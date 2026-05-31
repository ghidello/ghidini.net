---
title: 'Configuring Angular with a .NET Web API'
description: 'How to wire up an Angular SPA with a .NET 10 Web API protected by Windows Authentication — served from the same origin in production and orchestrated with .NET Aspire during development.'
pubDate: 2026-05-31
author: 'Claude Opus 4.8'
tags: [angular, dotnet, aspire, authentication, web-api]
---

I recently put together a small sample that demonstrates the full development and hosting flow for a same-origin Angular + ASP.NET Core application, where the API owns authentication and the SPA is deployed into the API project's `wwwroot` folder. The accompanying demo lives at [ghidello/AngularAspireNegotiate](https://github.com/ghidello/AngularAspireNegotiate).

This post walks through how the pieces fit together: a .NET 10 Web API secured with Windows Authentication through Negotiate, an Angular SPA served by the API in production, an authentication-aware dev proxy, and .NET Aspire orchestrating both projects over HTTPS during development.

## The Goals

Before any code, it helps to be explicit about what the setup needs to achieve:

- Configure a .NET 10 Web API to use Windows Authentication through **Negotiate**.
- Host the Angular production build from the API project's `wwwroot` folder.
- Configure an Angular development proxy that supports authentication negotiation when calling the API during local development.
- Orchestrate the API and Angular client during development with **.NET Aspire**.
- Use **HTTPS only** for the local development experience.
- Configure **Content Security Policy** headers for both the Angular dev server and the .NET API host.

Because the SPA and API are hosted from the same origin in production, **no CORS configuration is needed** — which removes a whole category of problems.

## Project Layout

The solution is split between the Aspire orchestration projects and the actual application:

- `aspire/AppHost` — .NET Aspire orchestration project for the local development environment.
- `aspire/ServiceDefaults` — shared Aspire service defaults.
- `aspire.config.json` — Aspire CLI configuration that points to the AppHost project.
- `src/Web` — ASP.NET Core Web API host secured with Windows Authentication.
- `src/Web.Angular` — Angular SPA, served by the API in production and run with the Angular dev server during development. It's included in the solution through a `Web.Angular.esproj` project.

## Scaffolding the Solution

The whole thing was generated from the command line. The Web API uses the `-au windows` switch to wire up Windows Authentication from the template, and Angular is created with the standalone, zoneless, SCSS configuration:

```bash
dotnet new sln -n AngularAspireNegotiate -f slnx

dotnet new aspire-apphost -n AppHost -o ./aspire/AppHost -lang C#
dotnet new aspire-servicedefaults -n ServiceDefaults -o ./aspire/ServiceDefaults -lang C#

dotnet new webapi -n Web -o ./src/Web -au windows -minimal

ng new web-angular --ai-config copilot --directory src/Web.Angular --package-manager npm \
  --routing true --skip-git --skip-install --ssr false --style scss --zoneless true
```

To bring the Angular project into the .NET solution, it's wrapped in a JavaScript SDK project (`Web.Angular.esproj`) that intentionally skips npm install and the build script — Aspire takes care of running the dev server instead:

```xml
<Project Sdk="Microsoft.VisualStudio.JavaScript.Sdk/1.0.5171056">
  <PropertyGroup>
    <ShouldRunNpmInstall>false</ShouldRunNpmInstall>
    <ShouldRunBuildScript>false</ShouldRunBuildScript>
  </PropertyGroup>
</Project>
```

The projects are then added to the solution and the AppHost gets a reference to the Web API:

```bash
dotnet sln AngularAspireNegotiate.slnx add ./aspire/AppHost/AppHost.csproj ./aspire/ServiceDefaults/ServiceDefaults.csproj --solution-folder aspire
dotnet sln AngularAspireNegotiate.slnx add ./src/Web/Web.csproj ./src/Web.Angular/Web.Angular.esproj --solution-folder src

dotnet add ./aspire/AppHost/AppHost.csproj reference ./src/Web/Web.csproj
```

## Aspire HTTPS Orchestration

This is the part that makes local development pleasant. The Aspire AppHost runs both projects together, exposing the Angular client over HTTPS and handing it the development certificate.

A few things are going on in the AppHost:

- `src/Web` is added as a .NET project resource named `web`.
- `src/Web.Angular` is added as a JavaScript app resource named `angular` that runs the Angular `start` script.
- The Angular app **waits for** the Web API and **references** it, so Aspire can provide service discovery details.
- The Angular app is exposed with an **HTTPS endpoint only**.
- Aspire provides a development certificate to the Angular dev server and passes the generated certificate and key paths to the Angular CLI with `--ssl`, `--ssl-cert`, and `--ssl-key`.

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var web = builder.AddProject<Projects.Web>("web");

#pragma warning disable ASPIRECERTIFICATES001
builder.AddJavaScriptApp("angular", "../../src/Web.Angular", "start")
    .WaitFor(web)
    .WithReference(web)
    .WithHttpsEndpoint(env: "HTTPS_PORT")
    .WithHttpsDeveloperCertificate()
    .WithHttpsCertificateConfiguration(static ctx =>
    {
        ctx.Arguments.Add("--");
        ctx.Arguments.Add("--port");
        ctx.Arguments.Add("%HTTPS_PORT%");
        ctx.Arguments.Add("--ssl");
        ctx.Arguments.Add("--ssl-cert");
        ctx.Arguments.Add(ctx.CertificatePath);
        ctx.Arguments.Add("--ssl-key");
        ctx.Arguments.Add(ctx.KeyPath);

        return Task.CompletedTask;
    });
#pragma warning restore ASPIRECERTIFICATES001

builder.Build().Run();
```

The `ASPIRECERTIFICATES001` warning is suppressed around the Angular dev server certificate configuration because the sample intentionally uses Aspire's development certificate support to run the SPA over HTTPS locally.

The Web API launch profile was reduced to HTTPS only by removing the HTTP profile, leaving `https://localhost:7219` as the application URL.

## Protecting the API Surface

The Web API groups its protected sample endpoints under `/api` and requires authorization for the whole group:

```csharp
var api = app.MapGroup("/api")
    .RequireAuthorization();
```

The sample exposes two endpoints:

- `GET /api/user` — returns the current authenticated Windows identity with `name`, `authenticationType`, and `isAuthenticated`.
- `GET /api/weatherforecast` — the sample weather forecast from the default template, moved under the protected group.

Authentication and authorization middleware are enabled before the route group runs:

```csharp
app.UseAuthentication();
app.UseAuthorization();
```

The `/api/user` endpoint intentionally returns only an identity summary, not the full set of claims.

## The Angular Client

The generated starter page was replaced with a small dashboard that calls the protected API and displays the current authenticated Windows user along with the weather forecast.

The critical detail for Negotiate authentication is `withCredentials: true` — the browser only sends credentials when you ask it to explicitly:

```typescript
private readonly apiRequestOptions = { withCredentials: true } as const;

this.http.get<CurrentUser>('/api/user', this.apiRequestOptions);
this.http.get<WeatherForecast[]>('/api/weatherforecast', this.apiRequestOptions);
```

### The Development Proxy

This is the part I want to dwell on, because it's **not** the proxy configuration you normally see in an Angular project.

The typical Angular setup uses a static `proxy.conf.json` file — a plain JSON object that maps a path prefix to a target URL. That works fine for anonymous APIs, but it falls apart here for two reasons:

1. **The target isn't known ahead of time.** Aspire assigns the Web API's HTTPS endpoint at runtime and exposes it through the `WEB_HTTPS` environment variable. A static JSON file can't read environment variables.
2. **Windows Authentication is connection-bound.** Negotiate (NTLM/Kerberos) authenticates the _TCP connection_, not the individual request. The default proxy agent opens a fresh connection per request, which silently breaks the handshake — you authenticate, then the next request lands on a brand new, unauthenticated socket.

The fix is to use a **JavaScript** proxy config (`proxy.conf.js`) instead of JSON. That lets the proxy read the runtime target from the environment and, crucially, supply a custom `keepAlive` agent so the same connection — and therefore the same authenticated session — is reused across requests:

```javascript
const http = require('node:http');
const https = require('node:https');

const target = process.env['WEB_HTTPS'];
if (!target) {
  throw new Error('WEB_HTTPS environment variable was not set by Aspire.');
}

const isHttps = target?.startsWith('https://');

console.log(`Proxying API requests to: ${target} (HTTPS: ${isHttps})`);

// Create persistent connection agent for Windows Authentication (NTLM/Negotiate)
// keepAlive: true maintains 1:1 connection affinity required by Negotiate auth
// maxSockets: 1 per host ensures credentials persist on the same connection
const AgentClass = isHttps ? https.Agent : http.Agent;
const agent = new AgentClass({
  keepAlive: true,
  // keepAliveMsecs: 60000,
  // maxSockets: 1,
  // timeout: 30000,
  //...(isHttps && { rejectUnauthorized: false }),
});

module.exports = {
  '/api/**': {
    target,
    secure: true,
    changeOrigin: true,
    agent,
  },
};
```

The important bits:

- **`process.env['WEB_HTTPS']`** — the target is resolved at runtime from the environment variable that the AppHost reference injects, not hard-coded. Aspire owns the port, so the proxy asks Aspire for it.
- **`keepAlive: true`** — this is the linchpin. The persistent agent keeps connection affinity so the authenticated socket survives between requests. Without it, Negotiate re-challenges on every call and the SPA never sees a successful response.
- **`AgentClass = isHttps ? https.Agent : http.Agent`** — the agent is chosen to match the target scheme. Since Aspire serves the API over HTTPS in development, this resolves to `https.Agent`.
- **`secure: true` / `changeOrigin: true`** — validate the certificate and rewrite the `Host` header to match the target.

To wire it up, point the Angular CLI's `serve` configuration at the `.js` file instead of a `.json` one in `angular.json`:

```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.js"
  }
}
```

## SPA Hosting and Security Headers

In production, the API serves the Angular build. An `AngularExtensions` helper configures ASP.NET Core to serve the static files and fall back to `index.html` for client-side routes:

```csharp
app.UseAngularStaticFiles();

// API routes are mapped before the SPA fallback.
await app.RunWithAngularFallbackAsync();
```

The fallback also maps unmatched `/api/**` requests to `404`, so a missing API route doesn't accidentally return the Angular shell.

Static file responses add headers such as `X-Content-Type-Options`, `Referrer-Policy`, and `Cross-Origin-Resource-Policy`. The `index.html` response adds the stricter document-level headers:

- `Content-Security-Policy`
- `Permissions-Policy`
- `X-Frame-Options`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Embedder-Policy`

The Angular dev server mirrors the same policy through the `serve.options.headers` section in `angular.json`, so local development receives the same Content Security Policy and related browser security headers while running through `ng serve`.

Finally, the Angular production build writes its output directly into `src/Web/wwwroot`, so the ASP.NET Core host serves the SPA from the same origin as the API:

```json
"outputPath": {
  "base": "../Web/wwwroot",
  "browser": ""
}
```

## Wrapping Up

The result is a clean same-origin setup: a single .NET host that owns Windows Authentication and serves the Angular SPA in production, with Aspire handling the HTTPS development loop and an auth-aware proxy keeping local development as close to production as possible. No CORS, no separate token plumbing — just the browser, Negotiate, and same-origin requests.

The full source is available at [ghidello/AngularAspireNegotiate](https://github.com/ghidello/AngularAspireNegotiate) if you'd like to clone it and explore the details.
