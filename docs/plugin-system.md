# Plugin system

```mermaid
stateDiagram-v2
  [*] --> Registered: install succeeds
  Registered --> Removed: uninstall
  Registered --> [*]: engine disposal
  [*] --> Failed: install throws
```

Plugins have a unique name, version, install hook and optional uninstall hook. Duplicate names are
rejected. Installation failures are wrapped with plugin identity and are not registered.
Uninstall removes registry state even if cleanup reports an error.
