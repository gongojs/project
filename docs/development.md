# Development

## Initial Setup

### yarn workspace setup

#### client

```bash
$ yarn install    # in gongo root
```

It will install all necessary deps and symlinks for `gongo-client`,
`gongo-react` and `react-example`.

#### server

Not using workspaces.  `server-example` uses the local `gongo-server` via
docker.  So just

```bash
$ cd server-example
$ yarn install
```

## Usage

#### Server (with docker; recommended)

```bash
$ docker-compose up
```

This will bring up both a mongo instance and the gongo example server with
network communication between them.  On first connect, the gongo server will
automatically configure the mongo replicaSet for you (when
`NODE_ENV=development`).

### Client

```bash
$ cd react-example
$ yarn start
```

IP of the API server will be automatically passed in via environment variable.
