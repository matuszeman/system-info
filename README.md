Docker container information
============================

Runs NodeJS HTTP server on port 3000 with endpoints below.

_Warning: The server is intended for test and debug purposes only
and might potentially expose sensitive data. Never use in production!_

### GET /os

`os` below stands for NodeJS `os` module: https://nodejs.org/api/os.html

```
{
  hostname: os.hostname(),
  arch: os.arch(),
  freemem: os.freemem(),
  networkInterfaces: os.networkInterfaces(),
}
```

### GET /volume

Returns files under `data` folder.

`VOLUME /usr/src/app/data`

```
{
  paths: [
    //file paths
  ]
}
```

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

