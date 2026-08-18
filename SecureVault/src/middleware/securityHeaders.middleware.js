const helmet = require("helmet");

module.exports = helmet({

    contentSecurityPolicy: false,

    crossOriginEmbedderPolicy: false,

    frameguard: {

        action: "deny"

    },

    referrerPolicy: {

        policy: "no-referrer"

    }

});