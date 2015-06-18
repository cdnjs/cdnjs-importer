// Dependencies
var Gry = require("gry")
  , IsThere = require("is-there")
  , Ul = require("ul")
  , Tmp = require("tmp")
  , OArgv = require("oargv")
  , Path = require("path")
  , Glob = require("glob")
  , Logger = require("bug-killer")
  , OneByOne = require("one-by-one")
  , Mkdirp = require("mkdirp")
  , ReadJson = require("r-json")
  , WriteJson = require("w-json")
  , SameTime = require("same-time")
  , Ncp = require("ncp")
  ;

// Constants
const PATH_LIBS = "/ajax/libs/"
    , PATH_DIST = ["/dist", "/build", "/src", "/"]
    , PATH_PACK = "package.json"
    ;

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
    Logger.config.level = options.debug === true
                           ? 4
                           : (typeof options.debug === "number"
                           ? options.debug : 0)
                           ;

    var self = this;

    // Check if the cdnjs exists
    self.root = options.cdnjs + PATH_LIBS;
    if (!IsThere(self.root)) {
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
    var self = this
      , pack = {}
      , i = 0
      , srcDir = ""
      , cDir = null
      , libPath = ""
      , vPath = ""
      ;

    // Handle strings
    if (typeof lib === "string") {
        lib = {
            git: lib
        };
    }

    lib = Ul.merge(lib, {
        dir: null
    });

    OneByOne([
        // Create tmp directory
        Tmp.dir.bind(Tmp)
        // Clone the library repo
      , function (cb, path) {
            Logger.log("Cloning " + lib.git + " into " + path, "info");
            self.repo = new Gry(path);
            self.repo_path = path;
            repo.exec(OArgv({
                _: [lib.git, "."]
            }, "clone"), function (err) {
                if (err) { return cb("Failed to clone the repository: " + err.toString()); }
                cb();
            });
        }
        // Read the package.json file
      , function (cb) {

            // Use the package.json
            pack = Path.join(self.repo_path, PATH_PACK);
            srcDir = path;

            // Check if the package.json file exists
            // TODO Import from NPM
            if (!IsThere(pack)) {
                return callback(new Error("package.json is required."));
            }

            // Detect the cdn files
            if (!lib.dir) {
                for (; i < PATH_DIST.length; ++i) {
                    cDir = path + PATH_DIST[i];
                    if (IsThere(cDir)) {
                        srcDir = cDir;
                        lib.dir = PATH_DIST[i]
                        break;
                    }
                }
            }

            Logger.log("Set the source path: " + lib.dir, "info");
            ReadJson(pack, function (err, package) {
                if (err) { return callback(new Error("Failed to read the package.json file: " + err.toString())); }
                cb();
            });
        }
        // Create the version directory
      , function (cb) {
            libPath = Path.join(self.root, package.name);
            vPath = Path.join(libPath, package.version);

            // Create the version directory
            Logger.log("Creating the version directory: " + vPath, "info");

            // Append the auto-update fields
            package.npmName = package.name;
            package.npmFileMap = lib.map || [
                {
                    basePath: lib.dir
                  , files: ["**/*"]
                }
            ];

            Mkdirp(vPath, cb);
        }
        // Fetch the needed files
      , function (cb) {
            // Get the library files
            Logger.log("Getting the library files.", "info");

            // TODO Handle the whole array
            var basePath = Path.join(path, package.npmFileMap[0].basePath, package.npmFileMap[0].files[0]);

            Glob(basePath, function (err, files) {
                if (err) { return cb(new Error("Failed to get the library files: " + err.toString())); }

                // Append the filename field used by cdnjs
                package.filename = files[0].replace(Path.join(repo.cwd, package.npmFileMap[0].basePath) + "/", "");
                cb();
            });
        }
        // Write the package.json file
      , function (cb) {
            // Create the package.json file in the cdnjs repository
            Logger.log("Writing the package.json file in " + libPath, "info");

            WriteJson(Path.join(libPath, PATH_PACK), package, function (err) {
                if (err) { return cb(new Error("Failed to create the package.json file: " + err.toString())); }
                cb();
            });
        }
        // Copy the library files
      , function (cb) {
            Logger.log("Copying the library files", "info");
            SameTime(files.map(function (cPath) {
                return Ncp.bind(this, cPath, Path.join(vPath, cPath.split("/").pop()));
            }), function (err) {
                if (err) {
                    Logger.log("Failed to copy the library files: " + err.toString(), "error");
                    return cb(err);
                }
                cb();
            });
        }
        // Checkout the master branch
      , function (cb) {
            Logger.log("Checking out the master branch.", "info");
            cb();
        }
      , self.git.exec.bind(self.git, "git checkout master")
        // Pull from github/cdnjs/cdnjs
      , function (cb) {
            Logger.log("Pulling from origin.", "info");
            cb();
        }
      , self.git.exec.bind(self.git, "git pull origin master")
        // Create the new branch
      , function (cb) {
            Logger.log("Creating a new branch for your library.", "info");
            cb();
        }
      , self.git.exec.bind(self.git, OArgv({
            _: "importer-" + pack.name
          , b: true
        }, "git checkout"))
        // Add files
      , function (cb) {
            Logger.log("Adding the new library files in the git repository.", "info");
            self.git.exec("add . -A", function (err) {
                if (err) {
                    Logger.log("Failed to add the files: " + err.toString(), "error");
                    return cb(err);
                }
                cb();
            });
        }
        // Commit the changes
      , function (cb) {
            Logger.log("Committing the changes", "info");
            var message = "Added " + package.name + "@" + package.version;
            self.git.commit(message, function (err) {
                if (err) {
                    Logger.log("Failed to commit the changes: " + err.toString(), "error");
                    return cb(err);
                }

                // Done
                Logger.log(message, "info");
                cb();
            });
        }
    ], callback);
};

module.exports = CdnJsImporter;
