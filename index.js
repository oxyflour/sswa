const koa = require('koa'),
    bodyParser = require('koa-body-parser'),
    staticServer = require('koa-static'),
    router = require('koa-router'),
    validator = require('koa-validate')

const app = new koa(),
    api = new router({ prefix: '/server' }),
    db = require('./src/db'),
    daemon = require('./src/daemon'),
    auth = require('./src/auth')

api.get('/:id', function *(next) {
    var data = db.assertExistingData(this)
    this.body = JSON.stringify(data)
})

api.del('/:id', function *(next) {
    var data = db.assertExistingData(this)
    yield *daemon.stop(data.id, data)
    this.body = db.del(data.id)
})

api.put('/:id', function *(next) {
    var body = db.assertValidData(this),
        data = db.assertExistingData(this)
    yield *daemon.start(data.id, body)
    this.body = db.update(data.id, body)
})

api.post('/', function *(next) {
    var body = db.assertValidData(this),
        id = db.newId()
    yield *daemon.start(id, body)
    this.body = db.update(id, body)
})

api.get('/', function *(next) {
    this.body = JSON.stringify(db.list())
})

app.use(auth())
    .use(bodyParser())
    .use(validator())
    .use(api.routes())
    .use(api.allowedMethods())
    .use(staticServer('html'))
    .use(staticServer('node_modules'))

app.listen(8099)
