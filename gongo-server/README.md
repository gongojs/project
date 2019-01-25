# gongo-server

"Serverless" - only handles the gongo part of your app, but because of
websockets, will be long running.  Client should close websockets when not
subscribing to anything.  Should investigate things like AWS WS Lambda gateway,
but realistically we rely on holding a lot of stuff in memory (could perhaps use
mongoDB stitch).  Overall thought it's still a big gain and should scale pretty
well.

maybe support other backends than mongo?  then we'd need something like
minimongo on the server.  but imagine backing by serverless db too like AWS.
