# serverless architecture (TODO)

* client websocket connection to API gateway
* client insert/update/remove requests to lambdas (via http2 this will be same connection)
* client updates come in via the WebSocket
* database updates call lambda that sends updates to relevant clients via api gateway
