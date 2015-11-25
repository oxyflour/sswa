const fs = require('fs'),
    basicAuth = require('basic-auth'),
    authFile = 'var/user.json'

var user
try {
    user = JSON.parse(fs.readFileSync(authFile))
}
catch (e) {
    user = {
        name: 'sqd',
        pass: Math.random().toString(36).substr(2)
    }

    console.error('creating ' + authFile)
    fs.writeFileSync(authFile, JSON.stringify(user))
}

module.exports = function() {
    return function *(next) {
        var auth = basicAuth(this)

        if (auth && auth.name === user.name && auth.pass === user.pass) {
            yield next
        }
        else {
            this.set('WWW-Authenticate', 'Basic')
            this.body = 'auth required'
            this.status = 401
        }
    }
}
