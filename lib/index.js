// Dependencies
var Gry = require("gry")
  , IsThere = require("is-there")
  , Ul = require("ul")
  ;

// Constants
const PATH_LIBS = "/ajax/libs/";

function CdnJsAdder (options, callback) {
    if (this.constructor !== CdnJsAdder) {
        return new CdnJsAdder(options, callback);
    }

    options = Ul.merge(options, {
        libs: []
    });

    var self = this;
    IsThere(options.cdnjs + PATH_LIBS, function (exists) {
        if (!exists) {
            return callback(new Error("The cdnjs library directory doesn't exist."));
        }

        var res = {
                err: []
              , data: []
            }
          , c = 0
          , handler = function (lib, i) {
                self.add(lib, function (err, data) {
                    res.err[i] = err;
                    res.data[i] = data;
                    if (++c === options.libs.length) {
                        if (res.err.length) {
                            callback(res);
                        }
                    }
                });
            }
        ;


        options.libs.forEach(function (cLib, i) {
            handler(cLib, i);
        });
    });
}

CdnJsAdder.prototype.add = function (lib, callback) {
    callback(null, null);
};

module.exports = CdnJsAdder;
