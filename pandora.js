// timeout for main script
var OPEN_TIMEOUT = 5000;

var root;
try{root = global} catch(e){try {root = window} catch(e){root = this}};

(function(){
    var Promise = require('promisejs'),
    Emitter = require('emitterjs'),
    cached = {};

    Emitter(Promise.prototype);

    var Pandora = {
        "ajax": Ajax,
        "open": Script, 
        "on": addEvent,
        "off": removeEvent
    };

    function addEvent(el,ev,fn){

        if(!el._event) el._event = new Emitter;
        
        el._event.on(ev,fn);

        function on(event) {
            event = event ? event : window.event;
            el._event.emit(ev,event);
        }

        addEventListener(el, ev, on);

        return el._event;
    }

    function removeEvent(el,ev,fn){
        if(el._event) {
            el._event.off(ev,fn);
            if(!el._event.hasListeners(ev))
                removeEventListener(el, ev);
        }

        return this; 
    }

    function addEventListener(elm, eType, fn){
        if(elm.addEventListener){
            elm.addEventListener(eType, fn, false);
        } else if (elm.attachEvent){
            elm.attachEvent('on' + eType, fn);
        }
    }

    function removeEventListener(elm, eType, fn){
        if(elm.removeEventListener){
            elm.removeEventListener(eType, fn, false);
        } else if (elm.detachEvent){
            elm.detachEvent('on' + eType, fn);
        }
    }   

    function Script(file,timeout) {
        var loaded = cached[file];

        if(loaded) return loaded;

        loaded = cached[file] = new Promise();

        if(timeout) loaded.timeout(timeout);

        var head = document.getElementsByTagName("head")[0];
        var script = document.createElement("script");

        /* forces cache reload */
        script.src = file+'?'+Date.now();
        script.async = true;
        script.defer = true;

        function onloaded(event) {
            if(!event) event = window.event;
            loaded.attach(file).fulfill(event);
        }

        function onerror(event) {
            if(!event) event = window.event;
            loaded.attach(file).reject(event);
        }

        if(script.readyState) {
            script.onreadystatechange = function(event) {
                /* FIXME: IE on 404 error hell */
                if(this.readyState === "loaded" || 
                    this.readyState === "complete") {
                    this.onreadystatechange = null;
                    onloaded(event);
                } else {
                    onerror(event);
                }   
            }
        } else {
            script.onload = onloaded;
            script.onerror = onerror;
        }   

        head.appendChild(script);

        return loaded;
    }


    function Ajax(method,url,options,data) {
        var res = new Promise(),
            xhr = new XMLHttpRequest;

        options = options ? options : {};
        data = data ? data : null;

        if(typeof options !== 'object') options = {url:options};
        if(!options.async) options.async = true;
        if(!options.timeout) options.timeout = 5000;
        if(!options.headers) options.headers = {};
        if(!options.headers.accept) options.headers.accept = "application/json";

        res.attach(xhr);

        function parseHeaders(h) {
            var ret = {}, key, val, i;


            h.split('\n').forEach(function(header) {
                if((i=header.indexOf(':')) > 0) {
                    key = header.slice(0,i).replace(/^[\s]+|[\s]+$/g,'').toLowerCase();
                    val = header.slice(i+1,header.length).replace(/^[\s]+|[\s]+$/g,'');
                    if(key && key.length) ret[key] = val;
                }   
            });

            return ret;
        }

        xhr.onreadystatechange = function() {
            if(xhr.readyState === 4 && xhr.status) {
                var msg = xhr.responseText;
                xhr.headers = parseHeaders(xhr.getAllResponseHeaders());

                if(options.headers.accept.indexOf('json') >= 0)
                    try { msg = JSON.parse(msg) } catch(err) {}

                if(xhr.status < 400) res.fulfill(msg);
                else res.reject(msg);     
            }
        }

        xhr.open(method,url,options.async);

        /* set request headers */
        Object.keys(options.headers).forEach(function(header) {
            xhr.setRequestHeader(header,options.headers[header]);
        });

        /* request data */
        xhr.send(data);

        /* response timeout */
        res.timeout(options.timeout);

        return res;
    }

    ['head','get','put','post','delete','patch','trace','connect','options']
        .forEach(function(method) {
            Ajax[method] = function(url,options,data) {
                return Ajax(method,url,options,data);
            }
        });
    

    // opens Pandoras box
    Pandora.on(window,'load',function(event) {
        if(window.onready) { 
            window.onready.call(event,Pandora);
        } else {
            var main, script = document.getElementsByTagName('script');

            for(var i = 0; i < script.length; i++) {
                if((main = script[i].getAttribute('data-main'))) {
                    Pandora.open(main,OPEN_TIMEOUT).then(function() {
                        console.log("Loaded", main);
                    },function(error){
                        throw error;
                    });

                    var base = main.split('/');
                    Pandora.main = base.pop();
                    Pandora.base = base.join('/');

                    break;
                }
            }
        }
    });

    /* FIXME: should not be necessary. */
    /* Instead pass Pandora to main(). */
    if (typeof exports === 'object') {  
        if (typeof module !== undefined && module.exports) {
            exports = module.exports = Pandora;
        } else exports.Pandora = Pandora;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return Pandora; });
    } else if(typeof root === 'object') {
        root.Pandora = Pandora; 
    } else throw "Failed to export module";
}());
