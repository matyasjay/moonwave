<div align="center">
    <img src="brand/moonwave.svg" alt="Moonwave" height="139" />
</div>

# Moonwave

Moonwave is a command line tool for generating documentation from comments in Lua source code.

This repository contains three projects:
- The Moonwave Extractor, a Rust program that parses Lua files and extracts the docs as JSON
- A plugin for [Docusaurus](https://docusaurus.io/), written in React, which displays the JSON docs visually
- The Moonwave CLI, which allows you to use both the extractor and the Docusaurus plugin without needing to know anything about how they work.

## Key features
- Easy to use: You can generate a website with little-to-no configuration and just a few comments in your Lua code.
- Extensive validation system which can catch mistakes when something doesn't make sense.
- Generates JSON from your doc comments, which can be consumed by many different tools.
- Simple doc comment format that is easy to read directly when editing your code.

## Name
Lua is the moon. The moon is your code. The moon influences the waves in the ocean, just like your code influences its documentation. So.. moonwave!

## Installation

- [Install Node.js](https://nodejs.org/en/) -- at least version 14 is required
- Open a terminal, like Command Prompt, Powershell, or [Windows Terminal](https://www.microsoft.com/en-us/p/windows-terminal/9n0dx20hk701) (recommended)
- Find your Lua project directory
- Run `npx moonwave dev`

## Publishing

If you are using git and github pages, you can publish your doc website with one command:

`npx moonwave build --publish`

Otherwise, you can run `npx moonwave build`, and your built website will be in a folder called `build` in your project directory.

Remember to add the `build` folder to your `.gitignore`!

## Writing doc comments

(Temporary) See [this file](https://github.com/evaera/roblox-lua-promise/blob/master/lib/init.lua) for examples. Full documentation is coming soon.

## Building in Development and Contributing

Requirements:
- [Node.js 14+](https://nodejs.org/en/)
- [Rust 1.54.0 and Cargo](https://rustup.rs/)

1. Clone this repository
2. in `cli`, run `npm i`, and `npm link`
3. in `docusaurus-plugin-moonwave`, run `npm i`
4. in `extractor`, run `cargo install --path . --locked`
5. in `cli`, run `npm run dev`
6. in another terminal, navigate to the project you want to test with, and run `MOONWAVE_DEV=1 moonwave dev`

You should now be able to change files in the `moonwave` folder and things should live-reload on your development website. If they don't, Ctrl+C the `moonwave dev` terminal and restart it. If you continue to have issues, try adding the `-i` flag to reinstall all dependencies.

## License
Moonwave is available under the terms of the Mozilla Public License Version 2.0. Terms and conditions are available in [LICENSE.txt](LICENSE.txt) or at <https://www.mozilla.org/en-US/MPL/2.0/>.
