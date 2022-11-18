const Koa = require('koa');
const Router = require('koa-router');
const os = require('os');
const fs = require('fs');
const globby = require('globby');

const config = {
  koa_proxy: !!Number(process.env.koa_proxy),
  process_sigterm_sleep: Number(process.env.process_sigterm_sleep)
}

console.log('Config:', JSON.stringify(config, null, 2))

process.on('SIGTERM', () => {
  console.log('SIGTERM received.');

  const exit = () => {
    console.log('Exiting...');
    process.exit(0);
  }

  if (config.process_sigterm_sleep) {
    console.log(`Sleep ${config.process_sigterm_sleep}ms before exiting the process (config:process_sigterm_sleep)`, config.process_sigterm_sleep);
    setTimeout(exit, config.process_sigterm_sleep);
    return;
  }

  exit();
});

const app = new Koa({
  // https://github.com/koajs/koa/blob/master/docs/api/request.md#requestips
  proxy: config.koa_proxy
});
const router = new Router();

const startupTime = Date.now();

router.get('/', async ctx => {
  ctx.body = {
    runningTime: Math.ceil((Date.now() - startupTime) / 1000),
    hostname: os.hostname(),
    arch: os.arch(),
    freemem: os.freemem()
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
  var path = __dirname + '/data';
  if (ctx.request.query.file) {
    path += `/${ctx.request.query.file}`;
  }

  try {
    if (fs.lstatSync(path).isFile()) {
      ctx.type = 'text/plain';
      ctx.body = fs.createReadStream(path);
      return;
    }

    const files = await globby(['**/*'], {
      cwd: __dirname + '/data'
    });
    ctx.body = {
      files
    };
  } catch (e) {
    ctx.body = {
      error: {
        message: e.message
      }
    }
  }
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

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000);

console.log('Running on http://localhost:3000/');
