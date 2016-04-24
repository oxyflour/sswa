const koa = require('koa.io'),
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

api.get('/:id/status', function *(next) {
    var data = db.assertExistingData(this)
    this.body = JSON.stringify(yield *daemon.status(data.id, data))
})

api.del('/:id', function *(next) {
    var data = db.assertExistingData(this)
    yield *daemon.stop(data.id, data)
    this.body = db.del(data.id)
})

api.put('/:id', function *(next) {
    var body = db.assertValidData(this),
        data = db.assertExistingData(this)
    yield *daemon[body.started ? 'start' : 'stop'](data.id, body)
    this.body = db.update(data.id, body)
})

api.post('/', function *(next) {
    var body = db.assertValidData(this),
        id = db.newId()
    yield *daemon[body.started ? 'start' : 'stop'](id, body)
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
    .use(staticServer(__dirname + '/html'))
    .use(staticServer(__dirname + '/node_modules'))

var sockets = [ ]

app.io.use(function *(next) {
    sockets.push(this)
    yield *next
    sockets.splice(sockets.indexOf(this), 1)
})

app.io.route('status', function *(next, id) {
    var status = yield *daemon.status(id)
    this.emit('status', id, status)
})

var execs = db.list(),
    co = require('co')

Object.keys(execs).forEach(function(id) {
    var data = db.get(id)
    if (data.started)
        co(daemon.start(id, data))
})

daemon.evt.on('started stopped', function(id) {
    var status = yield *daemon.status(id)
    sockets.forEach(s => s.emit('status', id, status))
})

app.listen(8099)
