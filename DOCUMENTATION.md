## Documentation
You can see below the API reference of this module.

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

