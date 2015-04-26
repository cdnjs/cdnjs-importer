![CDNJS Importer](http://i.imgur.com/OLwedYJ.png)

# CDNJS Importer
Easy way to import a library into CDNJS.

## Installation

```sh
$ npm install -g cdnjs-importer
```

## Usage

Use the `-c` option to specify the path to the CDNJS repository. Default location is `~/cdnjs`.

```sh
$ cdnjs-importer -c path/to/cdnjs git@github.com:someone/project.git git@github.com:someone/another-project.git
```

## Documentation
Using as module is also possible.

### `CdnJsImporter(options, callback)`
Creates a new instance of `CdnJsImporter`.

#### Params
- **Object** `options`: An object containing the following fields:
 - `libs` (Array): An array of `Lib` items (see the `add` method what they should contain). They will be downloaded in parallel (default: `[]`).
 - `debug` (Boolean|Number): A boolean or number value indicating the log level (default: `false`).
 - `cdnjs` (String): The absolute path to the local cdnjs repository.

- **Function** `callback`: The callback function.

#### Return
- **CdnJsImporter** The `CdnJsImporter` instance.

### `add(lib, callback)`
Adds a new library in the local cdnjs repository.

#### Params
- **Object|String** `lib`: The git url as string or an object containing:
 - `git` (String): The `git` url.
 - `dir` (String): The directory containing the files which should be imported (default: `"/dist"` or `"/build"` or `"/src"` or `"/"`).
 - `map` (Array): The file map used by cdnjs in autoupdate process (default: `[{ basePath: lib.dir , files: ["**/*"] }]`).
- **Function** `callback`: The callback function called with `error` and `data`.

#### Return
- **CdnJsImporter** The `CdnJsImporter` instance.

## How to contribute
1. File an issue in the repository, using the bug tracker, describing the
   contribution you'd like to make. This will help us to get you started on the
   right foot.
2. Fork the project in your account and create a new branch:
   `your-great-feature`.
3. Commit your changes in that branch.
4. Open a pull request, and reference the initial issue in the pull request
   message.

## License
See the [LICENSE](./LICENSE) file.
