const fs = require('fs'),
    dbFile = __dirname + '/../var/config.json'

module.exports = {
    data: fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile)) : { },

    list() {
        var list = { }
        Object.keys(this.data).forEach(id => {
            var data = this.data[id]
            list[id] = {
                id: id,
                name: data.name,
                port: data.port
            }
        })
        return list
    },
    get(id) {
        return this.data[id]
    },
    update(id, data) {
        data.id = id
        this.data[id] = data

        fs.writeFileSync(dbFile, JSON.stringify(this.data))
        return id
    },
    del(id) {
        delete this.data[id]

        fs.writeFileSync(dbFile, JSON.stringify(this.data))
        return id
    },

    newId() {
        var ids = Object.keys(this.data).map(parseFloat)
        return ids.length ? Math.max.apply(Math, ids) + 1 : 1
    },
    assertValidData(ctx) {
        ctx.checkBody('port').toInt().ge(1024).le(65535)
        ctx.checkBody('name').notEmpty()
        ctx.assert(!ctx.errors, 403)

        return ctx.request.body
    },
    assertExistingData(ctx) {
        ctx.checkParams('id').toInt()
        ctx.assert(!ctx.errors, 403)

        var id = ctx.params.id,
            data = this.data[id]
        ctx.assert(data.id === id, 403)
        ctx.assert(data, 404)

        return data
    },
}
