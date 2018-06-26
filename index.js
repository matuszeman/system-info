const Koa = require('koa');
const Router = require('koa-router');
const os = require('os');
const globby = require('globby');

const app = new Koa();
const router = new Router();

router.get('/os', async ctx => {
  ctx.body = {
    hostname: os.hostname(),
    arch: os.arch(),
    freemem: os.freemem(),
    networkInterfaces: os.networkInterfaces(),
  };
});

router.get('/volume', async ctx => {
  const paths = await globby(['**/*'], {
    cwd: __dirname + '/data'
  });
  ctx.body = {
    paths
  };
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
