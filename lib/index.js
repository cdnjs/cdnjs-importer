// Dependencies
var Gry = require("gry")
  , IsThere = require("is-there")
  , Ul = require("ul")
  , Tmp = require("tmp")
  , OArgv = require("oargv")
  , FsExtra = require("fs-extra")
  , Path = require("path")
  , Glob = require("glob")
  , Logger = require("bug-killer")
  ;

// Constants
const PATH_LIBS = "/ajax/libs/"
    , PATH_DIST = ["/dist", "/build", "/src", "/"]
    , PATH_PACK = "package.json"
    ;

// Configurations
Logger.config.displayDate = true;

function CdnJsAdder (options, callback) {
    if (this.constructor !== CdnJsAdder) {
        return new CdnJsAdder(options, callback);
    }

    // Defaults
    options = Ul.merge(options, {
        libs: []
      , debug: false
    });
    callback = callback || function (err) {};

    // Debug mode
    Logger.config.logLevel = options.debug === true
                           ? 4
                           : (typeof options.debug === "number"
                           ? options.debug : 0)
                           ;

    var self = this;
    self.root = options.cdnjs + PATH_LIBS;
    if (!IsThere.sync(self.root)) {
        return callback(new Error("The cdnjs library directory doesn't exist."));
    }

    self.git = new Gry(options.cdnjs);

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
}

CdnJsAdder.prototype.add = function (lib, callback) {
    var self = this;

    if (typeof lib === "string") {
        lib = {
            git: lib
        };
    }

    lib = Ul.merge(lib, {
        dir: null
    });

    Tmp.dir(function (err, path, cleanupCallback) {

        if (err) {
            Logger.log("Failed to create temp directory: " + err.toString(), "error");
            return callback(err);
        }

        Logger.log("Clonning " + lib.git + " into " + path, "info");
        var repo = new Gry(path);
        repo.exec(OArgv({ _: [lib.git, "."]}, "clone"), function (err) {

            if (err) {
                Logger.log("Failed to clone the repository: " + err.toString(), "error");
                return callback(err);
            }

            var pack = Path.join(path, "package.json")
              , i = 0
              , srcDir = path
              , cDir = null
              ;

            if (!IsThere.sync(pack)) {
                return callback(new Error("package.json is required."));
            }

            for (; i < PATH_DIST.length; ++i) {
                cDir = path + PATH_DIST[i];
                if (IsThere.sync(cDir)) {
                    srcDir = cDir;
                    break;
                }
            }

            Logger.log("Set the source path: " + PATH_DIST[i], "info");

            FsExtra.readJson(pack, function (err, package) {

                if (err) {
                    Logger.log("Failed to read the package.json file: " + err.toString(), "error");
                    return callback(err);
                }

                var libPath = Path.join(self.root, package.name)
                  , vPath = Path.join(libPath, package.version)
                  ;

                Logger.log("Creating the version directory: " + vPath, "info");
                FsExtra.mkdirp(vPath, function (err) {
                    if (err) {
                        Logger.log("Failed to create the version directory: " + err.toString(), "error");
                        return callback(err);
                    }

                    package.npmName = package.name;
                    package.npmFileMap = lib.map || [
                        {
                            basePath: PATH_DIST[i]
                          , files: ["*"]
                        }
                    ];


                    Logger.log("Getting the library files.", "info");

                    // TODO
                    var basePath = Path.join(path, package.npmFileMap[0].basePath, package.npmFileMap[0].files[0]);
                    Glob(basePath, function (err, files) {

                        if (err) {
                            Logger.log("Failed to get the library files: " + err.toString(), "error");
                            return callback(err);
                        }

                        package.filename = files[0].replace(Path.join(repo.cwd, package.npmFileMap[0].basePath) + "/", "");

                        Logger.log("Writing the package.json file in " + libPath, "info");
                        FsExtra.writeJson(Path.join(libPath, PATH_PACK), package, function (err) {

                            if (err) {
                                Logger.log("Failed to create the package.json file: " + err.toString(), "error");
                                return callback(err);
                            }

                            function copyDone(err) {
                                if (err) {
                                    Logger.log("Failed to copy the library files: " + err.toString(), "error");
                                    return callback(err);
                                }
                                Logger.log("Adding the new library files in the git repository.", "info");
                                self.git.exec("add . -A", function (err) {
                                    if (err) {
                                        Logger.log("Failed to add the files: " + err.toString(), "error");
                                        return callback(err);
                                    }
                                    Logger.log("Committing the changes", "info");
                                    var message = "Added " + package.name + "@" + package.version;
                                    self.git.commit(message, function (err) {

                                        if (err) {
                                            Logger.log("Failed to commit the changes: " + err.toString(), "error");
                                            return callback(err);
                                        }

                                        Logger.log(message, "info");
                                        callback();
                                    });
                                });
                            }

                            function copySeq(c) {
                                c = c || 0;
                                var cPath = files[c];
                                if (!cPath) {
                                    return copyDone();
                                }

                                FsExtra.copy(cPath, Path.join(vPath, cPath.split("/").pop()), function (err) {
                                    if (err) { return copyDone(err); }
                                    copySeq(c + 1);
                                });
                            }

                            Logger.log("Copying the library files", "info");
                            copySeq();
                        });
                    });
                });
            });
        })
    });
};

module.exports = CdnJsAdder;
