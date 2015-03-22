var CdnJsAdder = require("../lib")
  , Path = require("path")
  ;

var add = new CdnJsAdder({
    cdnjs: Path.resolve("../cdnjs", __dirname)
  , libs: [
        "git@github.com:IonicaBizau/CaiuSS.git"
    ]
});


