import ObjectID from 'bson-objectid';

import { Log } from './utils';

const log = new Log('gongo-client-auth');

class Auth {

  constructor(gongo) {
    this.gongo = gongo;

    this.sid = localStorage.getItem('gongo-sessionId');
    if (this.sid) {
      log.debug("Using existing sessionId: " + this.sid);
    } else {
      this.sid = (new ObjectID()).toString();
      localStorage.setItem("gongo-sessionId", this.sid);
      log.debug("Created new sessionId: " + this.sid);
    }
  }

  login() {
    const popup = window.open(
      process.env.REACT_APP_LOGIN_SERVER + 'auth/google' + '?gongoSessionId=' + this.sid,
      null,
      "height=500,width=600,status=yes,toolbar=no,menubar=no,location=no"
    );

    popup.addEventListener('message', function() { console.log('popupmsg', arguments); });
  }

}

export default Auth;
