# Periphery setup script

There's two ways to install periphery: `System` and `User`

## System (requires sudo)

```sh
curl https://raw.githubusercontent.com/mbecker20/monitor/main/scripts/setup-periphery.py | python3
```
Install paths:
- periphery (binary) -> `/usr/local/bin/periphery`
- periphery.service -> `/etc/systemd/system/periphery.service`
- periphery.config.toml -> `/etc/monitor/periphery.config.toml`

## User

```sh
curl https://raw.githubusercontent.com/mbecker20/monitor/main/scripts/setup-periphery.py | python3 - --user
```

Install paths:
- periphery (binary) -> $HOME/.local/bin
- periphery.service -> $HOME/.config/systemd/user/periphery.service
- periphery.config.toml -> $HOME/.config/monitor/periphery.config.toml