# Your CLI

> A short description of what this command-line tool helps users do.

## Installation

```bash
npm install --global your-cli
```

Or run it without a global installation:

```bash
npx your-cli --help
```

## Quick start

```bash
your-cli init my-project
cd my-project
your-cli build
```

## Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| `your-cli init <name>` | Create a new project with the default configuration. | `your-cli init docs-site` |
| `your-cli dev` | Start a local development server with file watching. | `your-cli dev --port 3000` |
| `your-cli build` | Generate a production-ready output directory. | `your-cli build --out-dir dist` |
| `your-cli check` | Validate configuration and report common issues. | `your-cli check --verbose` |

## Global options

| Option | Description | Default |
| :--- | :--- | :--- |
| `--config <path>` | Use a configuration file at the given path. | `your-cli.config.js` |
| `--cwd <path>` | Run the command from a different working directory. | Current directory |
| `--verbose` | Print detailed diagnostic output. | `false` |
| `--help` | Display available commands and options. | — |

## Configuration

```js
export default {
  output: "dist",
  source: "src",
};
```

## Troubleshooting

### Command not found

Run the command through `npx`, or confirm that the package was installed globally and that your package manager bin directory is on your `PATH`.

### Build output is empty

Check the configured source directory and run `your-cli check --verbose` for a detailed diagnostic report.

## License

MIT
