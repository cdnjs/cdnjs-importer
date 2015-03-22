var CdnJsAdder = require("../lib")
  , Path = require("path")
  ;

CdnJsAdder({
    cdnjs: Path.resolve(__dirname, "../../cdnjs")
  , libs: [
        "git@github.com:IonicaBizau/CaiuSS.git"
    ]
}, function (res) {
    debugger
});


