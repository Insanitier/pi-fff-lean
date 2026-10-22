# Third-party notices

This package contains no code from the projects below. It loads `opensec-pi-fff` as a dependency and
replaces the text of the tool definitions it registers; `execute` and the renderers are upstream's.

## opensec-pi-fff

<https://www.npmjs.com/package/opensec-pi-fff> — OpenSec's Bun build of `@ff-labs/pi-fff` for Pi-Bolt.

```
MIT License

Copyright (c) OpenSec
Copyright (c) 2025 Dmitriy Kovalenko
```

## fff and pi-fff

<https://github.com/dmtrKovalenko/fff> — the FFF search engine and the `@ff-labs/pi-fff` extension, by
Dmitriy Kovalenko. The native library this package calls at run time comes from `@ff-labs/fff-bin-*`,
installed with `opensec-pi-fff`.

## ffi-rs

<https://github.com/zhangyuang/node-ffi-rs> — the FFI binding `opensec-pi-fff` falls back to on a build
without the JIT, installed with `opensec-pi-fff`.

Each project keeps its own license, authorship and terms. See their packages for the full texts.
