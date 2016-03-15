const _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    cp = require('child_process'),
    events = require('events'),
    mkdirp = require('mkdirp')

function promisify(fn) {
    return function() {
        var args = Array.prototype.slice.call(arguments)
        return new Promise((resolve, reject) => {
            args.push(function(err, ret) {
                err ? reject(err) : resolve(ret)
            })
            fn.apply(null, args)
        })
    }
}

const readFile = promisify(fs.readFile),
    writeFile = promisify(fs.writeFile),
    fileExists = promisify(fs.exists),
    shellExec = promisify(cp.exec),
    mkdirpAsync = promisify(mkdirp),

    varFolder = __dirname + '/../var',
    configTemplate = varFolder + '/squid.conf',

    evt = new events.EventEmitter()

function getConfig(id, data) {
    var dir = varFolder + '/' + id
    return {
        id,
        port: data.port,
        peers: data.peers,
        acls: data.acls,
        dir:            dir,
        pidFile:        dir + '/pid',
        configFile:     dir + '/squid.conf',
        accessLogFile:  dir + '/access.log',
        cacheLogFile:   dir + '/cache.log',
    }
}

module.exports = {
    *start(id, data) {
        const conf = getConfig(id, data)

        yield mkdirpAsync(conf.dir, { })

        var tpl = yield readFile(configTemplate, 'ascii')
        yield writeFile(conf.configFile, _.template(tpl)(conf))

        var running = yield this.status(id, data)
        yield shellExec('squid3 -f ' + conf.configFile + (running ? ' -k reconfigure' : ''))
        console.log('squid #' + id + (running ? ' reconfiguring...' : ' starting...'))

        evt.emit('started', id)
    },
    *stop(id, data) {
        const conf = getConfig(id, data)

        var running = yield this.status(id, data)
        if (!running) return console.log('squid #' + id + ' already stopped')

        yield shellExec('squid3 -f ' + conf.configFile + ' -k kill')
        console.log('squid #' + id + ' shutting down...')

        evt.emit('stopped', id)
    },
    *status(id, data) {
        const conf = getConfig(id, data = { })

        try {
            var pid = yield readFile(conf.pidFile, 'ascii')
            process.kill(pid, 0)
            return true
        }
        catch (e) {
            return false
        }
    },

    evt
}
