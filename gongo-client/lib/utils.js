class Log {
  constructor(prefix) {
    this.prefix = '[' + prefix + ']';
    this.debug = this._console.bind(this, 'debug');
    this.info = this._console.bind(this, 'info');
    this.log = this._console.bind(this, 'log');
    this.trace = this._console.bind(this, 'trace');
    this.warn = this._console.bind(this, 'warn');
  }

  _console(level, ...args) {
    if (typeof args[0] === 'string')
      args[0] = this.prefix + ' ' + args[0];
    else
      args.shift(this.prefix);
    console[level].apply(console, args);
  }
}

function debounce(func, delay) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    const args = arguments, that = this;
    timeout = setTimeout(() => func.apply(that,args), delay);
  }
}

const log = new Log('gongo-client');

module.exports = { Log, log, debounce };
