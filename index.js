const {Buffer} = require('node:buffer');
const Koa = require('koa');
const Router = require('@koa/router');
const os = require('os');
const fs = require('fs');
const globby = require('globby');

const appConfig = {
  koa_proxy: !!Number(process.env.koa_proxy),
  process_sigterm_sleep: process.env.process_sigterm_sleep ? Number(process.env.process_sigterm_sleep) : 0,
  volume_path: process.env.process_sigterm_sleep ?? __dirname + '/data'
}

console.log('Config:', JSON.stringify(appConfig, null, 2))
console.log('Garbage collector active: ', !!global.gc);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received.');

  const exit = () => {
    console.log('Exiting...');
    process.exit(0);
  }

  if (appConfig.process_sigterm_sleep) {
    console.log(`Sleep ${appConfig.process_sigterm_sleep}ms before exiting the process (config:process_sigterm_sleep)`, appConfig.process_sigterm_sleep);
    setTimeout(exit, appConfig.process_sigterm_sleep);
    return;
  }

  exit();
});

const app = new Koa({
  // https://github.com/koajs/koa/blob/master/docs/api/request.md#requestips
  proxy: appConfig.koa_proxy
});

const router = new Router();

const startupTime = Date.now();
const startupMemoryUsage = process.memoryUsage().rss;
const memoryBuffers = {
  extraMemory: Buffer.alloc(0, 1, 'binary')
}

router.get('/', async ctx => {
  ctx.body = {
    runningTime: Math.ceil((Date.now() - startupTime) / 1000),
    hostname: os.hostname(),
    arch: os.arch()
  };
});

router.all('/http', async ctx => {
  ctx.body = {
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
  };
});

router.get('/network', async ctx => {
  ctx.body = {
    interfaces: os.networkInterfaces(),
  };
});

router.get('/volume', async ctx => {
  const files = await globby(['**/*'], {
    cwd: appConfig.volume_path
  });
  ctx.body = {
    files
  };
});

router.get('/memory/set', async ctx => {
  const options = {
    megabytes: Number(ctx.query.megabytes),
  }
  console.log('/memory/set', options);

  setMemory('extraMemory', options.megabytes)

  ctx.body = {
    options
  }
})

router.get('/memory/inc', async ctx => {
  const options = {
    megabytes: Number(ctx.query.megabytes),
  }
  console.log('/memory/inc', options);

  incMemory('extraMemory', options.megabytes);

  ctx.body = {
    options
  };
});

router.get('/memory/dec', async ctx => {
  const options = {
    megabytes: Number(ctx.query.megabytes),
  }
  console.log('/memory/dec', options);

  decMemory('extraMemory', options.megabytes);

  ctx.body = {
    options
  };
});

router.get('/memory/stress', async ctx => {
  const options = {
    megabytes: Number(ctx.query.megabytes),
    sleep_after: ctx.query.sleep_after ? Number(ctx.query.sleep_after) : 0,
    async: !!ctx.query.async
  }
  console.log('/memory/stress', options);

  if (options.async) {
    incMemory('extraMemory', options.megabytes);

    setTimeout(() => {
      decMemory('extraMemory', options.megabytes);
      console.log('/stress async finished', options);
    }, options.sleep_after * 1000);
  } else {
    console.log(`/stress sleep for ${options.sleep_after}s`);
    await sleep(options.sleep_after * 1000);
    decMemory('extraMemory', options.megabytes);
  }

  ctx.body = {
    options
  };
});

router.get('/volume/(.*)', async ctx => {
  const path = `${appConfig.volume_path}/${ctx.params[0]}`;
  const stat = fs.statSync(path, {throwIfNoEntry: false});
  if (!stat) {
    ctx.status = 404;
    ctx.body = {
      error: {
        message: 'File does not exists',
        file: path
      }
    }
    return;
  }
  ctx.type = 'text/plain';
  ctx.body = fs.createReadStream(path);
});

router.get('/process', async ctx => {
  ctx.body = {
    uid: process.getuid(),
    gid: process.getgid(),
    cwd: process.cwd(),
    argv: process.argv,
    env: process.env,
  };
});

app.use(async (ctx, next) => {
  try {
    console.log('Request: ', ctx.originalUrl);
    const before = getProcessStats();
    await next();
    if (ctx.body) {
      ctx.body.host = {
        runningTime: Math.ceil((Date.now() - startupTime) / 1000),
        hostname: os.hostname(),
        arch: os.arch()
      };
      ctx.body.request = {
        before,
        after: getProcessStats()
      };
    }
  } catch(e) {
    console.error(e);
    ctx.status = 500;
    ctx.body = {
      error: {
        message: e.message,
        code: e.code,
        stack: e.stack
      }
    }
  }
});

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000);

console.log('Running on http://localhost:3000/');

function setMemory(buffer, megabytes) {
  global[buffer] = null;
  gc();
  global[buffer] = Buffer.alloc(mbsToBytes(megabytes), 1, 'binary');
}

function incMemory(buffer, megabytes) {
  const prevSize = memoryBuffers[buffer].length;
  const bytes = mbsToBytes(megabytes);
  memoryBuffers[buffer] = null;
  gc();
  memoryBuffers[buffer] = Buffer.alloc(bytes + prevSize, 1, 'binary');
}

function decMemory(buffer, megabytes) {
  const prevSize = memoryBuffers[buffer].length;
  const bytes = mbsToBytes(megabytes);
  memoryBuffers[buffer] = null;
  gc();
  let requestedSize = prevSize - bytes;
  if (requestedSize < 0) {
    requestedSize = 0;
  }
  memoryBuffers[buffer] = Buffer.alloc(requestedSize, 1, 'binary');
}

function gc() {
  if (global.gc) {
    global.gc();
  }
}

function getProcessStats() {
  gc();
  const memory = process.memoryUsage();
  return {
    startupMemoryUsage: bytesToMbs(startupMemoryUsage),
    freeMemory: bytesToMbs(os.freemem()),
    rss: bytesToMbs(memory.rss),
    heapTotal: bytesToMbs(memory.heapTotal),
    heapUsed: bytesToMbs(memory.heapUsed),
    external: bytesToMbs(memory.external),
    extraMemory: bytesToMbs(memoryBuffers.extraMemory.length)
  }
}

const bytesInMb = 1048576;

function bytesToMbs(bytes) {
  return Math.ceil(bytes / bytesInMb);
}

function mbsToBytes(megabytes) {
  return megabytes * bytesInMb;
}

