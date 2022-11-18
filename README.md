Container debug
===============

Runs NodeJS HTTP server on port 3000 with endpoints below.

Env config:
`koa_proxy` - use 
`process_sigterm_sleep` - sleep before exiting the process when SIGTERM is received   

### GET /

`os` - https://nodejs.org/api/os.html

```
{
  runningTime: os.hostname(),
  hostname: os.hostname(),
  arch: os.arch(),
  freemem: os.freemem()
}
```

### GET /http

`ctx.request` - https://koajs.com/#request

```
{
  origin: ctx.request.origin,
  method: ctx.request.method,
  protocol: ctx.request.protocol,
  url: ctx.request.url,
  href: ctx.request.href,
  host: ctx.request.host,
  hostname: ctx.request.hostname,
  path: ctx.request.path,
  ip: ctx.request.ip,
  ips: ctx.request.ips,
  headers: ctx.request.headers
}
```

### GET /network

`os` - https://nodejs.org/api/os.html

```
{
  interfaces: os.networkInterfaces()
}
```

### GET /volume

Returns files under `data` folder.

`VOLUME /usr/src/app/data`

```
{
  files: [
    // file paths
  ]
}
```

Return file content:  
GET /volume?file=some-file.txt

### GET /process

`process` below stands for NodeJS `process` global variable: https://nodejs.org/api/process.html

```
{
  uid: process.getuid(),
  gid: process.getgid(),
  cwd: process.cwd(),
  argv: process.argv,
  env: process.env
}
```
