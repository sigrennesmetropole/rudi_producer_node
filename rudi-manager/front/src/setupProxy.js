const { createProxyMiddleware } = require('http-proxy-middleware')

const backPath = `${process.env.PUBLIC_URL}/api`
const rewriteBackPathKey = `^${backPath}`

module.exports = function (app) {
  app.use(
    backPath,
    createProxyMiddleware({
      target: 'http://localhost:5005',
      changeOrigin: true,
      pathRewrite: { [rewriteBackPathKey]: '/api' },
      // pathRewrite: (path, req) => {
      //   const pathReplaced = path.replace(new RegExp(rewriteBackPathKey), '/api');
      //   console.log(req.url, '=>', pathReplaced, '|', req.params, '|', req.query);
      //   // console.log('path:', path, ' =>', `(${rewriteBackPathKey})`, pathReplaced);
      //   return pathReplaced;
      // },
    })
  )
}
