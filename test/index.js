// Dependencies
var CdnJsImporter = require("../lib")
  , Path = require("path")
  ;

// Test adding CaiuSS
CdnJsImporter({
    cdnjs: Path.resolve(__dirname, "../../cdnjs")
  , debug: true
  , libs: [
        "git@github.com:IonicaBizau/CaiuSS.git"
    ]
}, function (res) {
    console.log(res);
});
