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

/**
 * CdnJsImporter
 * Creates a new instance of `CdnJsImporter`.
 *
 * @name CdnJsImporter
 * @function
 * @param {Object} options An object containing the following fields:
 *
 *  - `libs` (Array): An array of `Lib` items (see the `add` method what they should contain). They will be downloaded in parallel (default: `[]`).
 *  - `debug` (Boolean|Number): A boolean or number value indicating the log level (default: `false`).
 *  - `cdnjs` (String): The absolute path to the local cdnjs repository.
 *
 * @param {Function} callback The callback function.
 * @return {CdnJsImporter} The `CdnJsImporter` instance.
 */
function CdnJsImporter (options, callback) {

    if (this.constructor !== CdnJsImporter) {
        return new CdnJsImporter(options, callback);
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

    // Check if the cdnjs exists
    self.root = options.cdnjs + PATH_LIBS;
    if (!IsThere.sync(self.root)) {
        return callback(new Error("The cdnjs library directory doesn't exist."));
    }

    // Create a gry instance in the cdnjs repository
    self.git = new Gry(self.root);

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

/**
 * add
 * Adds a new library in the local cdnjs repository.
 *
 * @name add
 * @function
 * @param {Object|String} lib The git url as string or an object containing:
 *  - `git` (String): The `git` url.
 *  - `dir` (String): The directory containing the files which should be imported (default: `"/dist"` or `"/build"` or `"/src"` or `"/"`).
 *  - `map` (Array): The file map used by cdnjs in autoupdate process (default: `[{ basePath: lib.dir , files: ["**\/*"] }]`).
 * @param {Function} callback The callback function called with `error` and `data`.
 * @return {CdnJsImporter} The `CdnJsImporter` instance.
 */
CdnJsImporter.prototype.add = function (lib, callback) {
    var self = this;

    // Handle strings
    if (typeof lib === "string") {
        lib = {
            git: lib
        };
    }

    lib = Ul.merge(lib, {
        dir: null
    });

    // Create a temp directory
    Tmp.dir(function (err, path, cleanupCallback) {

        if (err) {
            Logger.log("Failed to create temp directory: " + err.toString(), "error");
            return callback(err);
        }

        // Clone the repository
        Logger.log("Cloning " + lib.git + " into " + path, "info");
        var repo = new Gry(path);
        repo.exec(OArgv({ _: [lib.git, "."]}, "clone"), function (err) {

            if (err) {
                Logger.log("Failed to clone the repository: " + err.toString(), "error");
                return callback(err);
            }

            // Use the package.json
            var pack = Path.join(path, PATH_PACK)
              , i = 0
              , srcDir = path
              , cDir = null
              ;

            // Check if the package.json file exists
            // TODO Import from NPM
            if (!IsThere.sync(pack)) {
                return callback(new Error("package.json is required."));
            }

            // Detect the cdn files
            if (!lib.dir) {
                for (; i < PATH_DIST.length; ++i) {
                    cDir = path + PATH_DIST[i];
                    if (IsThere.sync(cDir)) {
                        srcDir = cDir;
                        lib.dir = PATH_DIST[i]
                        break;
                    }
                }
            }

            // Read the package.json file
            Logger.log("Set the source path: " + lib.dir, "info");
            FsExtra.readJson(pack, function (err, package) {

                if (err) {
                    Logger.log("Failed to read the package.json file: " + err.toString(), "error");
                    return callback(err);
                }

                var libPath = Path.join(self.root, package.name)
                  , vPath = Path.join(libPath, package.version)
                  , pwd = Path.join(repo.cwd, package.npmFileMap[0].basePath) + "/";
                  , temp
                  , ext
                  ;

                // Create the version directory
                Logger.log("Creating the version directory: " + vPath, "info");
                FsExtra.mkdirp(vPath, function (err) {

                    if (err) {
                        Logger.log("Failed to create the version directory: " + err.toString(), "error");
                        return callback(err);
                    }

                    // Append the auto-update fields
                    package.npmName = package.name;
                    package.npmFileMap = lib.map || [
                        {
                            basePath: lib.dir
                          , files: ["**/*"]
                        }
                    ];


                    // Get the library files
                    Logger.log("Getting the library files.", "info");

                    // TODO Handle the whole array
                    var basePath = Path.join(path, package.npmFileMap[0].basePath, package.npmFileMap[0].files[0]);
                    Glob(basePath, function (err, files) {

                        if (err) {
                            Logger.log("Failed to get the library files: " + err.toString(), "error");
                            return callback(err);
                        }

                        // Append the filename field used by cdnjs
                        package.filename = files[0].replace(pwd, "");

                        temp = package.filename.split(".");
                        ext = temp.pop();
                        temp.push("min");
                        temp.push(ext);
                        if (IsThere.sync(pwd + temp.toString().replace(/\,/g, "."))) {
                            package.filename = temp.toString().replace(/\,/g, ".");
                        }
                        // Create the package.json file in the cdnjs repository
                        Logger.log("Writing the package.json file in " + libPath, "info");
                        FsExtra.writeJson(Path.join(libPath, PATH_PACK), package, function (err) {

                            if (err) {
                                Logger.log("Failed to create the package.json file: " + err.toString(), "error");
                                return callback(err);
                            }

                            /*!
                             * copyDone
                             * This function is called when the copying of the files is done.
                             *
                             * @name copyDone
                             * @function
                             * @param {Error|null} err The error value.
                             * @return {undefined}
                             */
                            function copyDone(err) {

                                if (err) {
                                    Logger.log("Failed to copy the library files: " + err.toString(), "error");
                                    return callback(err);
                                }

                                // Add the files
                                Logger.log("Adding the new library files in the git repository.", "info");
                                self.git.exec("add . -A", function (err) {

                                    if (err) {
                                        Logger.log("Failed to add the files: " + err.toString(), "error");
                                        return callback(err);
                                    }

                                    // Commit the changes
                                    Logger.log("Committing the changes", "info");
                                    var message = "Added " + package.name + "@" + package.version;
                                    self.git.commit(message, function (err) {

                                        if (err) {
                                            Logger.log("Failed to commit the changes: " + err.toString(), "error");
                                            return callback(err);
                                        }

                                        // Done
                                        Logger.log(message, "info");
                                        callback();
                                    });
                                });
                            }

                            /*!
                             * copySeq
                             * Copies the provided file into the cdnjs repository.
                             *
                             * @name copySeq
                             * @function
                             * @param {Number|undefined} c The current index of the file.
                             * @return {undefined}
                             */
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

                            // Copy the files
                            Logger.log("Copying the library files", "info");
                            copySeq();
                        });
                    });
                });
            });
        })
    });
};

module.exports = CdnJsImporter;
