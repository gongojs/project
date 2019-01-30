# Development

## Initial Setup

### yarn link

Use local development versions of the various packages in the app and other packages.

```bash
for lib in gongo-client gongo-react ; do
  cd $lib
  yarn link
  cd ..
done

cd react-example
yarn link gongo-client gongo-react
```

Don't worry about using `yarn link` for the server.  The `serer-example` uses the local `gongo-server` via docker.

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
